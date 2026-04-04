"""
train_models.py - ABEAARS ML Training Pipeline
Builds 2 models from the Netflix + Amazon Prime dataset (18,000+ titles):
  1. TF-IDF Recommendation Model     -> tfidf_vectorizer.pkl + tfidf_matrix.pkl
  2. Popularity Prediction Model     -> popularity_model.pkl
  Saves merged dataset               -> dataset/movies.csv

Run once from the project root:
  python ml/train_models.py
"""

import os, sys
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor

# -- Paths ---------------------------------------------------------------
ML_DIR      = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR    = os.path.dirname(ML_DIR)
DATA_DIR    = os.path.join(ROOT_DIR, "data")
MODELS_DIR  = os.path.join(ROOT_DIR, "backend", "models")
DATASET_DIR = os.path.join(ML_DIR, "dataset")

NETFLIX_CSV = os.path.join(DATA_DIR, "netflix_titles.csv")
PRIME_CSV   = os.path.join(DATA_DIR, "amazon_prime_titles.csv")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATASET_DIR, exist_ok=True)

print("=" * 60)
print("  ABEAARS - ML Training Pipeline")
print("=" * 60)

# -- 1. Load and merge datasets ------------------------------------------
print("\n[1/4] Loading datasets from data/ folder...")

def load_csv(path, platform_name):
    if not os.path.exists(path):
        print(f"  WARNING: {path} not found, skipping.")
        return pd.DataFrame()
    df = pd.read_csv(path)
    df["platform"] = platform_name
    print(f"  Loaded {len(df)} rows from {os.path.basename(path)}")
    return df

netflix_df = load_csv(NETFLIX_CSV, "Netflix")
prime_df   = load_csv(PRIME_CSV,   "Amazon Prime")

if netflix_df.empty and prime_df.empty:
    print("ERROR: No CSV files found in data/ folder.")
    sys.exit(1)

combined = pd.concat([netflix_df, prime_df], ignore_index=True)
print(f"  Combined total: {len(combined)} rows")

# -- 2. Clean and build features -----------------------------------------
print("\n[2/4] Cleaning data and building features...")

def clean_str(val, maxlen=300):
    if pd.isna(val) or str(val).strip() == "":
        return ""
    return str(val).replace('"', "'").replace('\n', ' ').strip()[:maxlen]

def clean_genres(val):
    if pd.isna(val):
        return "Drama"
    parts = [p.strip() for p in str(val).replace('&', '').split(',')]
    words = []
    for p in parts[:4]:
        words.extend(p.split())
    return " ".join(words[:5])

combined = combined.dropna(subset=["title"])
combined["title"] = combined["title"].apply(lambda x: clean_str(x, 120))
combined = combined[combined["title"].str.len() > 0]
combined = combined.drop_duplicates(subset="title", keep="first")

combined["genres_clean"]      = combined["listed_in"].apply(clean_genres)
combined["overview"]          = combined["description"].apply(lambda x: clean_str(x, 250))
combined["combined_features"] = (
    combined["title"] + " " +
    combined["genres_clean"] + " " +
    combined["overview"] + " " +
    combined.get("platform", "").fillna("")
)

# Popularity proxy: newer titles get higher base score
this_year = 2026
combined["popularity"] = combined["release_year"].apply(
    lambda y: max(10.0, min(100.0, 50.0 + (float(y) - 2000) * 1.5)) if pd.notna(y) else 50.0
)

movies_df = combined[["title", "genres_clean", "overview", "popularity", "combined_features"]].copy()
movies_df = movies_df.reset_index(drop=True)

out_csv = os.path.join(DATASET_DIR, "movies.csv")
movies_df.to_csv(out_csv, index=False)
print(f"  Saved {len(movies_df)} movies to dataset/movies.csv")

# -- 3. TF-IDF Recommendation Model -------------------------------------
print("\n[3/4] Training TF-IDF Recommendation Model...")
tfidf = TfidfVectorizer(
    stop_words='english',
    ngram_range=(1, 2),
    max_features=15000,
    sublinear_tf=True
)
tfidf_matrix = tfidf.fit_transform(movies_df["combined_features"])

joblib.dump(tfidf,        os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
joblib.dump(tfidf_matrix, os.path.join(MODELS_DIR, "tfidf_matrix.pkl"))
print(f"  TF-IDF matrix shape: {tfidf_matrix.shape}")
print(f"  Saved: tfidf_vectorizer.pkl, tfidf_matrix.pkl")

# -- 4. Popularity Prediction Model -------------------------------------
# Features MUST match what the frontend/API sends:
#   budget_m   -> Budget in millions USD  (0-500)
#   runtime    -> Duration in minutes     (60-250)
#   num_genres -> Number of genres        (1-5)
print("\n[4/4] Training Popularity Prediction Model (Random Forest)...")

import random
random.seed(42)
np.random.seed(42)

n = len(movies_df)

# Simulate realistic budget, runtime, num_genres from the metadata
pop_df = movies_df.copy()
pop_df["budget_m"]   = np.clip(
    np.random.lognormal(mean=3.5, sigma=1.5, size=n), 0.1, 500
)
pop_df["runtime"]    = np.clip(
    np.random.normal(loc=105, scale=30, size=n), 20, 280
).astype(int)
pop_df["num_genres"] = pop_df["genres_clean"].apply(lambda x: min(len(x.split()), 5))

# Add budget/runtime influence to popularity (bigger budget -> higher score trend)
pop_df["popularity"] = (
    pop_df["popularity"]
    + np.log1p(pop_df["budget_m"]) * 2
    + (pop_df["runtime"] - 90) * 0.05
    + pop_df["num_genres"] * 0.5
).clip(10, 100)

features = ["budget_m", "runtime", "num_genres"]
X = pop_df[features].fillna(0)
y = pop_df["popularity"]

pop_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
pop_model.fit(X, y)
joblib.dump(pop_model, os.path.join(MODELS_DIR, "popularity_model.pkl"))
print(f"  Saved: popularity_model.pkl")
print(f"  Features trained on: {features}")

# -- Done ----------------------------------------------------------------
print("\n" + "=" * 60)
print(f"  Training Complete!")
print(f"  Dataset  : {len(movies_df):,} titles")
print(f"  TF-IDF   : {tfidf_matrix.shape[0]:,} x {tfidf_matrix.shape[1]:,}")
print(f"  Saved to : backend/models/")
print("=" * 60)
print("\nNow run:  python start.py\n")

