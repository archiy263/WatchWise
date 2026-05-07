"""
train_music_models.py - Music Recommendation Training Pipeline
Builds 3 models from music dataset:
  1. TF-IDF Content-Based Recommender  -> music_tfidf_vectorizer.pkl + music_tfidf_matrix.pkl
  2. Mood Index                        -> music_mood_index.pkl
  3. Merged Dataset                    -> dataset/music.csv

Run from project root:
  python ml/train_music_models.py

Optional: Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars for Spotify API.
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from collections import defaultdict

# -- Paths ---------------------------------------------------------------
ML_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(ML_DIR)
DATA_DIR = os.path.join(ROOT_DIR, "data")
MODELS_DIR = os.path.join(ROOT_DIR, "backend", "models")
DATASET_DIR = os.path.join(ML_DIR, "dataset")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATASET_DIR, exist_ok=True)

print("=" * 60)
print("  Music Recommendation - Training Pipeline")
print("=" * 60)

# -- 1. Load Music Data --------------------------------------------------
print("\n[1/4] Loading music data...")

# Try to load from multiple sources
music_data = []

# Source 1: Spotify API (if credentials available)
try:
    import os
    from backend.services.spotify_service import get_tracks_by_mood

    SPOTIFY_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
    SPOTIFY_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")

    if SPOTIFY_ID and SPOTIFY_SECRET:
        print("  Fetching data from Spotify API...")
        moods = ["happy", "sad", "energetic", "chill", "romantic", "party"]
        for mood in moods:
            tracks = get_tracks_by_mood(mood, limit=20)
            for track in tracks:
                music_data.append({
                    "title": track.get("title", ""),
                    "artist": track.get("artist", ""),
                    "genre": "",
                    "mood": mood,
                    "audio_features": json.dumps({
                        "danceability": 0.5,
                        "energy": 0.5,
                        "valence": 0.5,
                    }),
                    "release_year": track.get("release_year", ""),
                    "description": f"{track.get('title')} by {track.get('artist')}",
                })
        print(f"  Loaded {len(music_data)} tracks from Spotify API")
except Exception as e:
    print(f"  Spotify API not available: {e}")

# Source 2: Local curated data (fallback/primary)
CURATED_MUSIC = [
    # Happy/Upbeat
    {"title": "Happy", "artist": "Pharrell Williams", "genre": "Pop", "mood": "happy"},
    {"title": "Uptown Funk", "artist": "Mark Ronson ft. Bruno Mars", "genre": "Funk Pop", "mood": "happy"},
    {"title": "Can't Stop the Feeling", "artist": "Justin Timberlake", "genre": "Pop", "mood": "happy"},
    {"title": "Shake It Off", "artist": "Taylor Swift", "genre": "Pop", "mood": "happy"},
    {"title": "Walking on Sunshine", "artist": "Katrina and the Waves", "genre": "Rock", "mood": "happy"},
    {"title": "Good Vibrations", "artist": "The Beach Boys", "genre": "Rock", "mood": "happy"},
    {"title": "Mr. Blue Sky", "artist": "Electric Light Orchestra", "genre": "Rock", "mood": "happy"},
    {"title": "Don't Stop Me Now", "artist": "Queen", "genre": "Rock", "mood": "happy"},
    {"title": "I Wanna Dance with Somebody", "artist": "Whitney Houston", "genre": "Pop", "mood": "happy"},
    {"title": "Celebration", "artist": "Kool & The Gang", "genre": "Funk", "mood": "happy"},

    # Sad/Emotional
    {"title": "Someone Like You", "artist": "Adele", "genre": "Pop Soul", "mood": "sad"},
    {"title": "Fix You", "artist": "Coldplay", "genre": "Alternative Rock", "mood": "sad"},
    {"title": "The Night We Met", "artist": "Lord Huron", "genre": "Indie Folk", "mood": "sad"},
    {"title": "Hurt", "artist": "Johnny Cash", "genre": "Country", "mood": "sad"},
    {"title": "Mad World", "artist": "Gary Jules", "genre": "Alternative", "mood": "sad"},
    {"title": "Everybody Hurts", "artist": "R.E.M.", "genre": "Rock", "mood": "sad"},
    {"title": "Tears in Heaven", "artist": "Eric Clapton", "genre": "Rock", "mood": "sad"},
    {"title": "Nothing Compares 2 U", "artist": "Sinead O'Connor", "genre": "Pop", "mood": "sad"},
    {"title": "Black", "artist": "Pearl Jam", "genre": "Grunge", "mood": "sad"},
    {"title": "Hallelujah", "artist": "Jeff Buckley", "genre": "Alternative", "mood": "sad"},

    # Energetic/Workout
    {"title": "Eye of the Tiger", "artist": "Survivor", "genre": "Rock", "mood": "energetic"},
    {"title": "Stronger", "artist": "Kanye West", "genre": "Hip Hop", "mood": "energetic"},
    {"title": "Lose Yourself", "artist": "Eminem", "genre": "Hip Hop", "mood": "energetic"},
    {"title": "Thunderstruck", "artist": "AC/DC", "genre": "Rock", "mood": "energetic"},
    {"title": "Welcome to the Jungle", "artist": "Guns N' Roses", "genre": "Rock", "mood": "energetic"},
    {"title": "Power", "artist": "Kanye West", "genre": "Hip Hop", "mood": "energetic"},
    {"title": "Sandstorm", "artist": "Darude", "genre": "Electronic", "mood": "energetic"},
    {"title": "Titanium", "artist": "David Guetta ft. Sia", "genre": "EDM", "mood": "energetic"},
    {"title": "Levels", "artist": "Avicii", "genre": "EDM", "mood": "energetic"},
    {"title": "Pump It", "artist": "The Black Eyed Peas", "genre": "Hip Hop", "mood": "energetic"},

    # Chill/Relax
    {"title": "Weightless", "artist": "Marconi Union", "genre": "Ambient", "mood": "chill"},
    {"title": "Clair de Lune", "artist": "Debussy", "genre": "Classical", "mood": "chill"},
    {"title": "River Flows in You", "artist": "Yiruma", "genre": "Classical", "mood": "chill"},
    {"title": "Sunset Lover", "artist": "Petit Biscuit", "genre": "Electronic", "mood": "chill"},
    {"title": "Intro", "artist": "The xx", "genre": "Indie", "mood": "chill"},
    {"title": "Midnight City", "artist": "M83", "genre": "Electronic", "mood": "chill"},
    {"title": "Electric Feel", "artist": "MGMT", "genre": "Indie", "mood": "chill"},
    {"title": "Dreams", "artist": "Fleetwood Mac", "genre": "Rock", "mood": "chill"},
    {"title": "Pink + White", "artist": "Frank Ocean", "genre": "R&B", "mood": "chill"},
    {"title": "The Less I Know the Better", "artist": "Tame Impala", "genre": "Psychedelic", "mood": "chill"},

    # Romantic
    {"title": "Perfect", "artist": "Ed Sheeran", "genre": "Pop", "mood": "romantic"},
    {"title": "All of Me", "artist": "John Legend", "genre": "R&B", "mood": "romantic"},
    {"title": "Thinking Out Loud", "artist": "Ed Sheeran", "genre": "Pop", "mood": "romantic"},
    {"title": "A Thousand Years", "artist": "Christina Perri", "genre": "Pop", "mood": "romantic"},
    {"title": "Make You Feel My Love", "artist": "Adele", "genre": "Pop", "mood": "romantic"},
    {"title": "Unchained Melody", "artist": "The Righteous Brothers", "genre": "Soul", "mood": "romantic"},
    {"title": "At Last", "artist": "Etta James", "genre": "Soul", "mood": "romantic"},
    {"title": "Can't Help Falling in Love", "artist": "Elvis Presley", "genre": "Rock", "mood": "romantic"},
    {"title": "Your Song", "artist": "Elton John", "genre": "Pop", "mood": "romantic"},
    {"title": "Endless Love", "artist": "Diana Ross & Lionel Richie", "genre": "R&B", "mood": "romantic"},

    # Party/Dance
    {"title": "Blinding Lights", "artist": "The Weeknd", "genre": "Synth Pop", "mood": "party"},
    {"title": "Levitating", "artist": "Dua Lipa", "genre": "Pop", "mood": "party"},
    {"title": "Get Lucky", "artist": "Daft Punk", "genre": "Funk", "mood": "party"},
    {"title": "One More Time", "artist": "Daft Punk", "genre": "Electronic", "mood": "party"},
    {"title": "Yeah!", "artist": "Usher", "genre": "R&B", "mood": "party"},
    {"title": "I Gotta Feeling", "artist": "The Black Eyed Peas", "genre": "Pop", "mood": "party"},
    {"title": "Dancing Queen", "artist": "ABBA", "genre": "Pop", "mood": "party"},
    {"title": "Stayin' Alive", "artist": "Bee Gees", "genre": "Disco", "mood": "party"},
    {"title": "Billie Jean", "artist": "Michael Jackson", "genre": "Pop", "mood": "party"},
    {"title": "24K Magic", "artist": "Bruno Mars", "genre": "Funk", "mood": "party"},

    # Indian Music - Happy
    {"title": "Kal Ho Naa Ho", "artist": "Sonu Nigam", "genre": "Bollywood", "mood": "happy"},
    {"title": "Chaiyya Chaiyya", "artist": "Sukhwinder Singh", "genre": "Bollywood", "mood": "happy"},
    {"title": "Dil Chahta Hai", "artist": "Shankar Mahadevan", "genre": "Bollywood", "mood": "happy"},
    {"title": "Masti", "artist": "Mika Singh", "genre": "Bhangra", "mood": "happy"},
    {"title": "Badtameez Dil", "artist": "Benny Dayal", "genre": "Bollywood", "mood": "happy"},

    # Indian Music - Romantic
    {"title": "Tum Hi Ho", "artist": "Arijit Singh", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Raabta", "artist": "Shreya Ghoshal", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Ae Dil Hai Mushkil", "artist": "Arijit Singh", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Pehla Nasha", "artist": "Udit Narayan", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Tujh Mein Rab Dikhta Hai", "artist": "Shreya Ghoshal", "genre": "Bollywood", "mood": "romantic"},

    # Indian Music - Sad
    {"title": "Agar Tum Saath Ho", "artist": "Alka Yagnik", "genre": "Bollywood", "mood": "sad"},
    {"title": "Hamari Adhuri Kahani", "artist": "Arijit Singh", "genre": "Bollywood", "mood": "sad"},
    {"title": "Kabhi Jo Badal Barse", "artist": "Arijit Singh", "genre": "Bollywood", "mood": "sad"},
    {"title": "Phir Le Aya Dil", "artist": "Arijit Singh", "genre": "Bollywood", "mood": "sad"},
    {"title": "Kun Faya Kun", "artist": "A.R. Rahman", "genre": "Sufi", "mood": "sad"},

    # Indian Music - Party
    {"title": "Ghungroo", "artist": "Arijit Singh", "genre": "Bollywood", "mood": "party"},
    {"title": "London Thumakda", "artist": "Labh Janjua", "genre": "Bhangra", "mood": "party"},
    {"title": "Desi Girl", "artist": "Shankar Mahadevan", "genre": "Bollywood", "mood": "party"},
    {"title": "Sheila Ki Jawani", "artist": "Sunidhi Chauhan", "genre": "Bollywood", "mood": "party"},
    {"title": "Gallan Goodiyaan", "artist": "Yashita Sharma", "genre": "Bollywood", "mood": "party"},
]

# Add curated data
for track in CURATED_MUSIC:
    music_data.append({
        "title": track["title"],
        "artist": track["artist"],
        "genre": track.get("genre", ""),
        "mood": track["mood"],
        "audio_features": "{}",
        "release_year": "",
        "description": f"{track['title']} by {track['artist']} - {track.get('genre', '')}",
    })

print(f"  Total tracks loaded: {len(music_data)}")

if not music_data:
    print("ERROR: No music data available. Add data to CURATED_MUSIC or configure Spotify API.")
    sys.exit(1)

# -- 2. Clean and Build Features -----------------------------------------
print("\n[2/4] Cleaning data and building features...")

def clean_str(val, maxlen=200):
    if pd.isna(val) or str(val).strip() == "":
        return ""
    return str(val).replace('"', "'").replace('\n', ' ').strip()[:maxlen]

music_df = pd.DataFrame(music_data)
music_df = music_df.dropna(subset=["title"])
music_df["title"] = music_df["title"].apply(lambda x: clean_str(x, 120))
music_df["artist"] = music_df["artist"].apply(lambda x: clean_str(x, 80))
music_df["genre"] = music_df["genre"].apply(lambda x: clean_str(x, 50))
music_df["description"] = music_df["description"].apply(lambda x: clean_str(x, 250))
music_df = music_df.drop_duplicates(subset=["title", "artist"], keep="first")

# Combined features for TF-IDF
music_df["combined_features"] = (
    music_df["title"] + " " +
    music_df["artist"] + " " +
    music_df["genre"] + " " +
    music_df["description"]
)

# Save processed dataset
out_csv = os.path.join(DATASET_DIR, "music.csv")
music_df.to_csv(out_csv, index=False)
print(f"  Saved {len(music_df)} tracks to dataset/music.csv")

# -- 3. TF-IDF Recommendation Model -------------------------------------
print("\n[3/4] Training TF-IDF Music Recommendation Model...")

tfidf = TfidfVectorizer(
    stop_words='english',
    ngram_range=(1, 2),
    max_features=10000,
    sublinear_tf=True
)
tfidf_matrix = tfidf.fit_transform(music_df["combined_features"])

joblib.dump(tfidf, os.path.join(MODELS_DIR, "music_tfidf_vectorizer.pkl"))
joblib.dump(tfidf_matrix, os.path.join(MODELS_DIR, "music_tfidf_matrix.pkl"))
print(f"  TF-IDF matrix shape: {tfidf_matrix.shape}")
print(f"  Saved: music_tfidf_vectorizer.pkl, music_tfidf_matrix.pkl")

# -- 4. Build Mood Index -------------------------------------------------
print("\n[4/4] Building Mood Index...")

mood_index = defaultdict(list)
for idx, row in music_df.iterrows():
    mood = row.get("mood", "chill")
    mood_index[mood].append(idx)

# Also create mood->titles mapping for quick lookup
mood_titles = {mood: music_df.iloc[idxs]["title"].tolist() for mood, idxs in mood_index.items()}

# Save mood index
joblib.dump(dict(mood_index), os.path.join(MODELS_DIR, "music_mood_index.pkl"))
joblib.dump(mood_titles, os.path.join(MODELS_DIR, "music_mood_titles.pkl"))
print(f"  Mood categories: {list(mood_index.keys())}")
print(f"  Saved: music_mood_index.pkl, music_mood_titles.pkl")

# -- Done ----------------------------------------------------------------
print("\n" + "=" * 60)
print(f"  Training Complete!")
print(f"  Dataset  : {len(music_df):,} tracks")
print(f"  TF-IDF   : {tfidf_matrix.shape[0]:,} x {tfidf_matrix.shape[1]:,}")
print(f"  Moods    : {', '.join(mood_index.keys())}")
print(f"  Saved to : backend/models/")
print("=" * 60)
print("\nNow run: python start.py\n")
