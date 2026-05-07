"""
music_router.py — Music-related HTTP & WebSocket routes for WatchWise.

Routes
------
* ``GET  /music/search``              — Music API-powered track search
* ``GET  /music/mood-detect``         — Detect mood from text
* ``GET  /music/unified-search``      — Movies + Tracks + YouTube in one call
* ``GET  /music/youtube-video``       — Proxy YouTube Data API search (keeps key server-side)
* ``WS   /music/ws/recommendations``  — Real-time recommendation updates
* ``POST /music/session-event``       — Record a listening / interaction event
"""

import json
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.services.mood_service import detect_mood
from backend.services.spotify_service import search_tracks
from backend.services.youtube_service import get_video, get_smart_playback
from backend.services.listening_pattern import ListeningPattern
from backend.services.recommendation_engine import unified_recommend

router = APIRouter(prefix="/music", tags=["music"])

# ── Per-session pattern tracker (in-memory, keyed by a simple sid) ───
_patterns: dict[str, ListeningPattern] = {}


def _get_pattern(session_id: str) -> ListeningPattern:
    if session_id not in _patterns:
        _patterns[session_id] = ListeningPattern()
    return _patterns[session_id]


# =====================================================================
#  GET /music/search
# =====================================================================

@router.get("/search")
async def music_search(
    q: str = Query(..., description="Search query"),
    mood: str = Query("", description="Optional mood filter"),
    language: str = Query("auto", description="Language hint"),
):
    """
    Search for tracks via Music API.  Optionally enrich with mood-based
    genres when a *mood* query-param is supplied.
    """
    genres: list[str] = []
    if mood:
        detection = detect_mood(mood)
        genres = detection["genres"]

    tracks = await search_tracks(q, mood, genres, language)
    return {"query": q, "tracks": tracks}


# =====================================================================
#  GET /music/mood-detect
# =====================================================================

@router.get("/mood-detect")
async def mood_detect(
    text: str = Query(..., description="Text to analyse for mood"),
):
    """Detect the emotional mood from free-form text."""
    result = detect_mood(text)
    return result


# =====================================================================
#  GET /music/unified-search
# =====================================================================

@router.get("/unified-search")
async def unified_search(
    q: str = Query(..., description="Search query"),
    text: str = Query("", description="Mood text (defaults to query)"),
    language: str = Query("auto", description="Language hint"),
    session_id: str = Query("default", description="Session ID for pattern tracking"),
):
    """
    One-shot endpoint that returns movies, music tracks, and a
    YouTube video ID — all resolved concurrently.
    """
    mood_text = text or q
    detection = detect_mood(mood_text)
    mood = detection["mood"]
    genres = detection["genres"]
    pattern = _get_pattern(session_id)

    result = await unified_recommend(q, mood, genres, language, pattern)
    result["mood"] = detection
    return result


# =====================================================================
#  GET /music/youtube-video
# =====================================================================

@router.get("/youtube-video")
async def youtube_video(
    q: str = Query(..., description="Song title + artist to search on YouTube"),
):
    """
    Proxy endpoint for YouTube Data API v3 search.
    Keeps the API key on the server side (read from .env).
    Returns the video ID of the top result.
    """
    video_id = await get_video(q)
    return {"video_id": video_id}


# =====================================================================
#  GET /music/playback-source   (NEW — Zero-Failure Playback)
# =====================================================================
# WHY:  The old /youtube-video endpoint returns a single video ID that
#       often fails with "Video unavailable".  This new endpoint returns
#       multiple ranked candidates + an audio fallback so the frontend
#       can automatically try the next option.
# WHAT: Calls get_smart_playback() which runs multiple YouTube queries
#       in parallel, ranks results, and optionally fetches a JioSaavn
#       audio stream as a last-resort fallback.
# WHEN: Called by the frontend smartPlay() function when a user clicks
#       any song in the Search or Modal view.

@router.get("/playback-source")
async def playback_source(
    q: str = Query(..., description="Song title (+ artist) to find playback sources for"),
    artist: str = Query("", description="Optional artist name for better matching"),
):
    """
    Zero-failure playback source resolver.

    Returns multiple YouTube video IDs ranked by embed-likelihood,
    plus an optional audio fallback from JioSaavn.
    """
    result = await get_smart_playback(q, artist)
    return result

# =====================================================================
#  WS /music/ws/recommendations
# =====================================================================

@router.websocket("/ws/recommendations")
async def ws_recommendations(websocket: WebSocket):
    """
    WebSocket for real-time recommendation updates.

    Expected inbound JSON::

        {
            "event": "search" | "listen" | "mood",
            "query": "...",
            "genre": "...",
            "mood":  "..."
        }

    The server records listening patterns and pushes back refreshed
    recommendations after each event.
    """
    await websocket.accept()
    session_id = "ws_" + str(id(websocket))
    pattern = _get_pattern(session_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            event = data.get("event", "search")
            query = data.get("query", "")
            genre = data.get("genre", "")
            mood_text = data.get("mood", query)

            # Record pattern if genre/mood provided
            if genre or mood_text:
                pattern.record(genre or "unknown", mood_text or "neutral")

            # Detect mood & build recommendation
            detection = detect_mood(mood_text or query)
            mood_label = detection["mood"]
            genres = detection["genres"]

            # Merge pattern top genres
            top_pattern = pattern.top_genres(n=3)
            merged_genres = list(genres)
            for g in top_pattern:
                if g not in merged_genres:
                    merged_genres.append(g)

            result = await unified_recommend(
                query, mood_label, merged_genres, "auto", pattern,
            )
            result["mood"] = detection
            result["top_genres"] = top_pattern
            result["event"] = event

            await websocket.send_json(result)

    except WebSocketDisconnect:
        _patterns.pop(session_id, None)


# =====================================================================
#  POST /music/session-event
# =====================================================================

class SessionEvent(BaseModel):
    session_id: str = "default"
    event: str                # "listen", "skip", "like"
    genre: str = ""
    mood: str = ""
    track_id: Optional[str] = None
    track_name: Optional[str] = None


@router.post("/session-event")
async def session_event(payload: SessionEvent):
    """
    Record a client-side listening / interaction event and return the
    updated top-genre ranking.
    """
    pattern = _get_pattern(payload.session_id)
    pattern.record(
        payload.genre or "unknown",
        payload.mood or "neutral",
    )

    return {
        "status": "recorded",
        "top_genres": pattern.top_genres(n=5),
    }
