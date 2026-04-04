# WatchWise - Pro Entertainment Analytics

AI-powered movie & web series recommendation system using FastAPI + HuggingFace Transformers.

---
Note: Large model files are stored using Git LFS.
Run `git lfs install` before cloning.

## Project Structure

```
Watchwise/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── routes/api.py        # All API endpoints
│   └── models/              # Trained ML model files (.pkl) — auto-generated
├── data/
│   ├── netflix_titles.csv   # Netflix dataset (Kaggle)
│   └── amazon_prime_titles.csv  # Amazon Prime dataset (Kaggle)
├── frontend/
│   ├── index.html           # Main UI entry point
│   ├── script.js            # SPA router & all UI logic
│   ├── style.css            # Full site styles
│   ├── data.js              # Curated content database
│   ├── streaming_data.js    # Platform & metadata info
│   └── posters.js           # Movie poster URLs
├── ml/
│   ├── train_models.py      # ML training script
│   └── dataset/movies.csv   # Merged dataset — auto-generated
├── requirements.txt
├── start.py                 # Single-command launcher
└── generate_posters.py      # (Optional) Re-fetch movie poster URLs
```

---

## Step 1 — Install Dependencies

Make sure you are in the ABEAARS conda environment:

```bash
conda activate ABEAARS
pip install -r requirements.txt
```

---

## Step 2 — Train the ML Models (One-time setup)

This reads `data/netflix_titles.csv` + `data/amazon_prime_titles.csv`, merges them,
and trains 2 models: **TF-IDF Recommender** and **Popularity Predictor**.

```bash
python ml/train_models.py
```

**What it does:**
1. Loads Netflix (~8,800 titles) + Amazon Prime (~9,600 titles) datasets
2. Cleans and merges them → saves to `ml/dataset/movies.csv`
3. Trains TF-IDF vectorizer → saves `backend/models/tfidf_vectorizer.pkl` + `tfidf_matrix.pkl`
4. Trains Random Forest popularity model → saves `backend/models/popularity_model.pkl`

This takes **~1-2 minutes**. Only needs to be done **once**.

---

## Step 3 — Run the Project (One Line)

```bash
python start.py
```

This single command:
- Starts the **FastAPI backend** at `http://127.0.0.1:8000`
- Starts the **frontend server** at `http://127.0.0.1:8081`
- Automatically opens your browser to the WatchWise UI

**API docs available at:** `http://127.0.0.1:8000/docs`

Press `Ctrl+C` to stop both servers.

---

## (Optional) Regenerate Movie Posters

If poster images are missing or broken, re-run:

```bash
python generate_posters.py
```

This queries the Wikipedia API (free, no API key needed) and updates `frontend/posters.js`.

---

## Key API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/recommend?movie_title=Inception` | GET | Get TF-IDF recommendations |
| `/predict-popularity` | POST | Predict popularity score |
| `/analyze-sentiment` | POST | Deep learning sentiment analysis |
| `/health` | GET | Check backend status |
