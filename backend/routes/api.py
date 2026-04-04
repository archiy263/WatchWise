from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import requests
import urllib.parse

router = APIRouter()

POSTER_CACHE = {}
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500"

# Multiple free OMDB keys (rotate on failure)
OMDB_KEYS = ["8b65672a", "fc1dad4b", "4ac59602", "b9bd48a6"]

@router.get('/poster')
def get_movie_poster(title: str = Query(..., description="Movie or Show Title")):
    if title in POSTER_CACHE:
        if POSTER_CACHE[title]:
            return RedirectResponse(url=POSTER_CACHE[title], status_code=302)
        raise HTTPException(status_code=404, detail="Poster not found")

    # 1. Try OMDB with key rotation
    for key in OMDB_KEYS:
        try:
            url = f"http://www.omdbapi.com/?apikey={key}&t={urllib.parse.quote(title)}&plot=short"
            resp = requests.get(url, timeout=4, headers={"User-Agent": "ABEAARS/1.0"})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("Response") == "True":
                    poster = data.get("Poster", "")
                    if poster and poster != "N/A" and poster.startswith("http"):
                        POSTER_CACHE[title] = poster
                        return RedirectResponse(url=poster, status_code=302)
        except Exception:
            pass

    # 2. Fallback: try TMDB with public read-only v4 bearer token
    try:
        tmdb_url = f"https://api.themoviedb.org/3/search/multi?api_key=e9a78c22b4cce50c60e1de57c0439e28&query={urllib.parse.quote(title)}&language=en-US&page=1&include_adult=false"
        resp = requests.get(tmdb_url, timeout=5, headers={"User-Agent": "ABEAARS/1.0"})
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            for r in results[:5]:
                pp = r.get("poster_path")
                if pp:
                    full = TMDB_IMG_BASE + pp
                    POSTER_CACHE[title] = full
                    return RedirectResponse(url=full, status_code=302)
    except Exception:
        pass

    POSTER_CACHE[title] = ""
    raise HTTPException(status_code=404, detail="Poster not found")

# Paths

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
ML_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "ml"))

# Global variables
sentiment_pipeline = None
popularity_model = None
tfidf_vectorizer = None
tfidf_matrix = None
movies_df = None

def load_models():
    global sentiment_pipeline, popularity_model, tfidf_vectorizer, tfidf_matrix, movies_df
    try:
        # Import transformers dynamically to prevent slow boot when not used initially
        from transformers import pipeline
        import torch
        
        # Load HuggingFace Deep Learning Sentiment Model
        print("Loading Deep Learning Sentiment Analysis Model (Transformers)...")
        sentiment_pipeline = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment")
        
        # Load local models
        popularity_model = joblib.load(os.path.join(MODELS_DIR, "popularity_model.pkl"))
        tfidf_vectorizer = joblib.load(os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
        tfidf_matrix = joblib.load(os.path.join(MODELS_DIR, "tfidf_matrix.pkl"))
        
        # Load Massive Dataset
        movies_df = pd.read_csv(os.path.join(ML_DIR, "dataset", "movies.csv"))
        print("Models and Deep Learning Pipeline loaded successfully.")
    except Exception as e:
        print(f"Warning: Models not fully loaded. Ensure you've run train_models.py. Error: {e}")

load_models()

class SentimentRequest(BaseModel):
    text: str

class PredictRequest(BaseModel):
    budget_m: float
    runtime: int
    num_genres: int

@router.get("/recommend")
def recommend_movies(movie_title: str):
    if movies_df is None or tfidf_matrix is None or tfidf_vectorizer is None:
        return {"error": "Dataset or Models not loaded. Please run train_models.py first."}
    
    try:
        # 1. Try exact/partial match first
        matches = movies_df[movies_df['title'].str.contains(movie_title, case=False, na=False, regex=False)]
        
        # 2. If no match, try word-by-word fuzzy fallback
        if matches.empty:
            words = [w for w in movie_title.split() if len(w) > 1]
            for word in words:
                matches = movies_df[movies_df['title'].str.contains(word, case=False, na=False, regex=False)]
                if not matches.empty:
                    break
        
        # 3. Still no match - try searching overview and genres
        if matches.empty:
            matches = movies_df[
                movies_df['overview'].str.contains(movie_title, case=False, na=False, regex=False) |
                movies_df['genres_clean'].str.contains(movie_title, case=False, na=False, regex=False)
            ]
        
        if matches.empty:
            return {"recommendations": [], "message": f"Movie '{movie_title}' not found. Try: Inception, RRR, Baahubali, Parasite"}
            
        movie_idx = matches.index[0]
        matched_title = movies_df.iloc[movie_idx]['title']
        query_vector = tfidf_matrix[movie_idx]
        
        # Calculate cosine similarity on the fly
        sim_scores = cosine_similarity(query_vector, tfidf_matrix).flatten()
        top_indices = sim_scores.argsort()[::-1][1:7]
        
        recommendations = movies_df.iloc[top_indices]['title'].tolist()
        return {"recommendations": recommendations, "matched": matched_title}
    except Exception as e:
        return {"error": str(e)}

@router.post("/sentiment")
def analyze_sentiment(request: SentimentRequest):
    if not sentiment_pipeline:
        return {"error": "Deep Learning pipeline not loaded."}
    try:
        # Use Hugging Face Pipeline
        # 'nlptown/bert-base-multilingual-uncased-sentiment' returns labels like '5 stars'
        result = sentiment_pipeline(request.text)[0]
        label_str = result['label']
        stars = int(label_str.split()[0])
        
        label = "Positive" if stars >= 3 else "Negative"
        return {"sentiment": label, "deep_learning_score": round(result['score'], 2), "stars": stars}
    except Exception as e:
        return {"error": str(e)}

@router.post("/predict")
def predict_popularity(request: PredictRequest):
    if not popularity_model:
        return {"error": "Popularity Model not loaded."}
    try:
        features = pd.DataFrame([{
            "budget_m": request.budget_m, 
            "runtime": request.runtime, 
            "num_genres": request.num_genres
        }])
        score = popularity_model.predict(features)[0]
        return {"popularity": round(score, 2)}
    except Exception as e:
        return {"error": str(e)}
