"""
Mood detection service using HuggingFace DistilBERT emotion classifier.

Detects the emotional mood from text input and maps it to recommended
music genres for the WatchWise recommendation engine.
"""

from functools import lru_cache
from transformers import pipeline


# ── Mood → Genre Mapping ──────────────────────────────────────────────
MOOD_GENRE_MAP: dict[str, list[str]] = {
    "joy":      ["pop", "dance", "bollywood-dance", "party"],
    "sadness":  ["sad", "acoustic", "ghazal", "blues"],
    "anger":    ["rock", "metal", "hip-hop", "punjabi-bhangra"],
    "fear":     ["ambient", "classical", "instrumental"],
    "surprise": ["indie", "experimental", "fusion"],
    "neutral":  ["pop", "filmi", "chill"],
}


@lru_cache(maxsize=1)
def _get_emotion_pipeline():
    """Load the emotion classification pipeline exactly once."""
    return pipeline(
        "text-classification",
        model="bhadresh-savani/distilbert-base-uncased-emotion",
        top_k=1,
    )


def detect_mood(text: str) -> dict:
    """
    Analyse free-form text and return the detected mood, its confidence
    score, and a list of matching music genres.

    Parameters
    ----------
    text : str
        User-supplied text describing their current mood or feelings.

    Returns
    -------
    dict
        {
            "mood": str,          # e.g. "joy", "sadness", …
            "confidence": float,  # 0.0 – 1.0
            "genres": list[str]   # genre tags mapped from the mood
        }
    """
    classifier = _get_emotion_pipeline()
    result = classifier(text)

    # `top_k=1` returns [[{label, score}]]
    prediction = result[0][0]

    mood = prediction["label"].lower()
    confidence = round(prediction["score"], 4)
    genres = MOOD_GENRE_MAP.get(mood, MOOD_GENRE_MAP["neutral"])

    return {
        "mood": mood,
        "confidence": confidence,
        "genres": genres,
    }
