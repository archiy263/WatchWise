"""
recommendation_engine.py — Unified orchestration layer for WatchWise.

Fans out movie, Spotify, and YouTube lookups concurrently with
``asyncio.gather`` and returns a single merged response, with
tracks re-ranked by the ``score_track`` scoring function.
"""

import asyncio
from typing import Any, Optional

from backend.services.spotify_service import search_tracks
from backend.services.youtube_service import get_video
from backend.services.music_recommendation import score_track
from backend.services.listening_pattern import ListeningPattern

# ── re-use the heavy sync ML recommendation from api.py ─────────────
# We import the function and run it in a thread-pool so it doesn't
# block the event loop.
from backend.routes.api import recommend_movies as _sync_recommend_movies


async def _ml_recommend(query: str) -> dict:
    """Run the existing sync ML recommender safely in a thread-pool executor."""
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _sync_recommend_movies, query)
    except Exception as e:
        print(f"[recommendation] ML recommend failed safely: {e}")
        return {"recommendations": []}

async def unified_recommend(
    query: str,
    mood: str,
    genres: list[str],
    language: str = "auto",
    pattern: Optional[ListeningPattern] = None,
) -> dict[str, Any]:
    """
    Orchestrate movie + Spotify + YouTube lookups concurrently.

    Parameters
    ----------
    query : str
        User search text.
    mood : str
        Detected mood label (``"joy"``, ``"sadness"``, …).
    genres : list[str]
        Preferred genre list from mood mapping.
    language : str, optional
        Detected language (default ``"auto"``).
    pattern : ListeningPattern | None, optional
        If provided, preferred genres from listening history are merged
        into the genre list for better personalisation.

    Returns
    -------
    dict
        ``{ "movies": …, "tracks": [top 5], "video_id": str | None }``
    """
    # Merge pattern-based genres (if available) with mood genres
    combined_genres = list(genres)
    if pattern is not None:
        top_pattern_genres = pattern.top_genres(n=3)
        for g in top_pattern_genres:
            if g not in combined_genres:
                combined_genres.append(g)

    # ── Fan-out: movies in parallel with (tracks + video) ────────
    movies, (tracks, video_id) = await asyncio.gather(
        _ml_recommend(query),
        asyncio.gather(
            search_tracks(query, mood, combined_genres, language),
            get_video(query),
        ),
    )

    # ── Re-rank tracks using the scoring function ────────────────
    scored_tracks = []
    for track in tracks:
        track_for_scoring = {
            "genre": combined_genres[0] if combined_genres else "",
            "mood": mood,
            "popularity": track.get("popularity", 0),
        }
        track["score"] = score_track(track_for_scoring, mood, combined_genres)
        scored_tracks.append(track)

    scored_tracks.sort(key=lambda t: t["score"], reverse=True)
    top_tracks = scored_tracks[:5]

    return {
        "movies": movies,
        "tracks": top_tracks,
        "video_id": video_id,
    }
