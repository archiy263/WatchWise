"""
spotify_service.py — Async Spotify Web API integration for WatchWise.

Features
--------
* Client-Credentials token with auto-refresh (asyncio.Lock)
* Language-aware query enrichment (Bollywood, Kollywood, …)
* Fully async via ``aiohttp``
"""

import os
import asyncio
from typing import Optional

import aiohttp
from dotenv import load_dotenv

load_dotenv()

_LANGUAGE_CONFIG: dict[str, dict] = {
    "hindi":   {"keywords": ["bollywood", "filmi"]},
    "tamil":   {"keywords": ["kollywood"]},
    "telugu":  {"keywords": ["tollywood"]},
    "punjabi": {"keywords": ["bhangra"]},
    "english": {"keywords": []},
}

def _build_query(query: str, mood: str, genres: list[str], language: str) -> str:
    parts: list[str] = [query]
    lang_key = language.lower().strip()
    lang_cfg = _LANGUAGE_CONFIG.get(lang_key, {})
    lang_keywords = lang_cfg.get("keywords", [])
    if lang_keywords:
        parts.append(" ".join(lang_keywords))
    if mood:
        parts.append(mood)
    if genres:
        parts.extend(genres[:2])
    return " ".join(parts)


async def search_tracks(
    query: str,
    mood: str,
    genres: list[str],
    language: str = "auto",
    limit: int = 10,
) -> list[dict]:
    enriched_query = _build_query(query, mood, genres, language)
    
    params = {
        "query": enriched_query
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://jiosaavn-api-privatecvc2.vercel.app/search/songs",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    items = data.get("data", {}).get("results", [])
                    results = []
                    for item in items[:limit]:
                        image_links = item.get("image", [])
                        album_art = image_links[-1].get("link", "") if image_links else ""
                        
                        download_links = item.get("downloadUrl", [])
                        # Try to get 160kbps streaming link
                        stream_url = ""
                        for lnk in download_links:
                            if "160kbps" in lnk.get("quality", ""):
                                stream_url = lnk.get("link", "")
                                break
                        if not stream_url and download_links:
                            stream_url = download_links[-1].get("link", "")
                            
                        if not stream_url:
                            continue
                            
                        results.append({
                            "track_id": stream_url,
                            "name": item.get("name", "Unknown Title"),
                            "artist": item.get("primaryArtists", "Local Audio Source"),
                            "album_art": album_art,
                            "popularity": int(item.get("playCount", 0) or 0) // 1000
                        })
                    if results:
                        return results
    except Exception as exc:
        print(f"[music-api] Search failed: {exc}")

    # Fallback if the API fails
    return [{
        "track_id": "local",
        "name": f"{query} - ({mood})",
        "artist": genres[0] if genres else "Unknown",
        "album_art": "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
        "popularity": 0
    }]