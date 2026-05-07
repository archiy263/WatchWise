"""
youtube_service.py — Smart Multi-Layer YouTube + Audio Fallback for WatchWise.

WHY this exists:
    YouTube embeds frequently fail ("Video unavailable") because VEVO /
    official channels disable iframe embedding.  A single search query
    returns only one candidate, and if that one is blocked the user sees
    an error.

WHAT it does (NEW — zero-failure system):
    1. Generates MULTIPLE search queries for the same song:
       - "{song} official video"        → highest priority
       - "{song} official audio"        → audio-only uploads
       - "{song} lyrics"                → lyric videos (always embeddable)
       - "{song} lofi"                  → lofi remixes (always embeddable)
       - "{song} cover"                 → cover versions (always embeddable)
    2. Fetches up to 3 results per query.
    3. RANKS all results by keyword priority in the title.
    4. Returns structured data:
       {
         "youtube_ids":      [top 3 ranked IDs],
         "backup_video_ids": [remaining IDs],
         "fallback_audio":   "https://..." or null   (JioSaavn stream)
       }

WHEN it triggers:
    Called by the /music/playback-source endpoint (music_router.py).

OLD SINGLE-QUERY LOGIC (kept for reference):
    # async def get_video(query: str) -> Optional[str]:
    #     params = { "q": query, "type": "video", "maxResults": 1, ... }
    #     ...
    #     return items[0]["id"]["videoId"]
"""

import os
from typing import Optional

import aiohttp
from dotenv import load_dotenv

load_dotenv()

# ── Configuration from .env ──────────────────────────────────────────
YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
# WHY: Controls whether unofficial APIs (JioSaavn) are enabled.
# WHEN: Set to "false" in production to disable; "true" for dev/local.
USE_DEV_FALLBACK: bool = os.getenv("USE_DEV_FALLBACK", "true").lower() == "true"

_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# ── JioSaavn public API endpoint (cyberboysumanjay/JioSaavnAPI) ──────
# WHY: Free high-quality audio fallback when ALL YouTube embeds fail.
# WHAT: Returns direct MP3/M4A download links up to 320kbps.
_JIOSAAVN_SEARCH_URL = "https://saavn.dev/api/search/songs"
_JIOSAAVN_LEGACY_URL = "https://jiosaavn-api-privatecvc2.vercel.app/search/songs"


# =====================================================================
#  KEYWORD-BASED RANKING WEIGHTS
# =====================================================================
# WHY: Official music videos look best but often block embedding.
#      Lyric videos and audio uploads almost always allow embedding.
# WHAT: Higher score = higher priority in the final list.

_RANK_KEYWORDS = {
    "official music video": 100,
    "official video":       95,
    "music video":          90,
    "official audio":       85,
    "official lyric":       80,
    "audio":                75,
    "lyric":                70,
    "full song":            65,
    "hd":                   60,
    "hq":                   55,
    "lofi":                 40,
    "remix":                35,
    "cover":                30,
    "live":                 25,
}


def _score_title(title: str) -> int:
    """
    WHY:  We need to rank multiple YouTube results by how likely
          they are to be embeddable AND high quality.
    WHAT: Scans the video title for priority keywords and returns
          the highest matching score.
    WHEN: Called for every search result before sorting.
    """
    title_lower = title.lower()
    best = 0
    for keyword, weight in _RANK_KEYWORDS.items():
        if keyword in title_lower:
            best = max(best, weight)
    return best


# =====================================================================
#  OLD get_video() — PRESERVED FOR BACKWARD COMPATIBILITY
# =====================================================================

async def get_video(query: str) -> Optional[str]:
    """
    OLD single-query function — still used by /music/youtube-video.
    Kept intact so existing frontend code doesn't break.
    
    Returns the video_id of the top embeddable result.
    """
    if not YOUTUBE_API_KEY:
        print("[youtube] YOUTUBE_API_KEY not set in .env")
        return None

    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 3,
        "videoEmbeddable": "true",
        "videoSyndicated": "true",
        "key": YOUTUBE_API_KEY,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                _SEARCH_URL,
                params=params,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    items = data.get("items", [])

                    # Try to find official first
                    for item in items:
                        title = item["snippet"]["title"].lower()
                        if "official" in title or "music video" in title:
                            return item["id"]["videoId"]

                    # Fallback to first result
                    if items:
                        return items[0]["id"]["videoId"]
                else:
                    body = await resp.text()
                    print(f"[youtube] API error {resp.status}: {body}")
    except Exception as exc:
        print(f"[youtube] Request failed: {exc}")

    return None


# =====================================================================
#  NEW: Smart Multi-Query Search with Ranking
# =====================================================================

async def _youtube_scrape_fallback(query: str) -> list[dict]:
    """
    Fallback method when YouTube Data API quota is exceeded.
    Scrapes the YouTube search results page for video IDs.
    """
    import re
    url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    # Find all video IDs (11 characters)
                    video_ids = re.findall(r'"videoId":"([^"]{11})"', html)
                    # Deduplicate while preserving order
                    seen = set()
                    unique_ids = []
                    for vid in video_ids:
                        if vid not in seen:
                            seen.add(vid)
                            unique_ids.append(vid)
                    
                    # Mock the API response format
                    results = []
                    for i, vid in enumerate(unique_ids[:5]):
                        results.append({
                            "id": {"videoId": vid},
                            "snippet": {"title": f"{query} (Fallback {i+1})"}
                        })
                    return results
    except Exception as e:
        print(f"[youtube-scrape] Failed: {e}")
    return []

async def _youtube_search(session: aiohttp.ClientSession, query: str) -> list[dict]:
    """
    WHY:  Perform a single YouTube Data API search and return raw items.
    WHAT: Fetches up to 3 embeddable, syndicated video results.
    WHEN: Called once per query variant (official, audio, lyrics, etc.).
    """
    if not YOUTUBE_API_KEY:
        return await _youtube_scrape_fallback(query)

    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 3,
        "videoEmbeddable": "true",
        "videoSyndicated": "true",
        "key": YOUTUBE_API_KEY,
    }

    try:
        async with session.get(
            _SEARCH_URL,
            params=params,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get("items", [])
            else:
                body = await resp.text()
                print(f"[youtube-smart] API error {resp.status}: {body[:200]}")
    except Exception as exc:
        print(f"[youtube-smart] Request failed for '{query}': {exc}")

    # Fallback to web scraper if API fails (e.g. quota exceeded)
    print(f"[youtube-smart] Falling back to web scraper for '{query}'")
    return await _youtube_scrape_fallback(query)


async def get_smart_playback(song_title: str, artist: str = "") -> dict:
    """
    WHY:  The core of the zero-failure playback system.
    WHAT: Generates multiple query variants, fetches results in parallel,
          ranks them by title keywords, and returns a structured response
          with primary + backup video IDs and an optional audio fallback.
    WHEN: Called by the /music/playback-source endpoint.

    Returns
    -------
    dict with keys:
        youtube_ids       — list[str] : Top 3 ranked, most-likely-embeddable IDs
        backup_video_ids  — list[str] : Remaining IDs as safety net
        fallback_audio    — str|None  : Direct audio URL from JioSaavn (if enabled)
    """
    base_query = f"{song_title} {artist}".strip()

    # ── Step 1: Generate multiple search queries ─────────────────
    # WHY: Different query variants surface different uploads.
    #      "official video" might be VEVO-blocked, but "lyrics" is always OK.
    query_variants = [
        f"{base_query} official video",
        f"{base_query} official audio",
        f"{base_query} lyrics",
        f"{base_query} full song audio",
        f"{base_query} lofi",
    ]

    # ── Step 2: Fetch all queries in parallel ────────────────────
    # WHY: Speed — 5 sequential requests would take 50s; parallel takes ~10s.
    all_items = []
    seen_ids = set()

    try:
        async with aiohttp.ClientSession() as session:
            import asyncio
            results = await asyncio.gather(
                *[_youtube_search(session, q) for q in query_variants],
                return_exceptions=True,
            )

            for result_set in results:
                if isinstance(result_set, Exception):
                    continue
                for item in result_set:
                    try:
                        vid = item["id"]["videoId"]
                        if vid not in seen_ids:
                            seen_ids.add(vid)
                            all_items.append({
                                "video_id": vid,
                                "title": item["snippet"]["title"],
                                "score": _score_title(item["snippet"]["title"]),
                            })
                    except (KeyError, TypeError):
                        continue
    except Exception as exc:
        print(f"[youtube-smart] Parallel fetch failed: {exc}")

    # ── Step 3: Rank by keyword score (descending) ───────────────
    # WHY: Put the most likely embeddable + high quality videos first.
    all_items.sort(key=lambda x: x["score"], reverse=True)

    # ── Step 4: Split into primary and backup lists ──────────────
    primary_ids = [item["video_id"] for item in all_items[:3]]
    backup_ids = [item["video_id"] for item in all_items[3:]]

    # ── Step 5: (DEV ONLY) Fetch JioSaavn audio fallback ─────────
    # WHY: If ALL YouTube embeds fail, we need an audio stream.
    # WHEN: Only when USE_DEV_FALLBACK=true in .env.
    fallback_audio = None
    if USE_DEV_FALLBACK and base_query:
        fallback_audio = await _jiosaavn_fallback(base_query)

    return {
        "youtube_ids": primary_ids,
        "backup_video_ids": backup_ids,
        "fallback_audio": fallback_audio,
    }


# =====================================================================
#  JioSaavn Audio Fallback (DEV ONLY)
# =====================================================================

async def _jiosaavn_fallback(query: str) -> Optional[str]:
    """
    WHY:  When every YouTube embed is blocked, we still want audio.
    WHAT: Searches JioSaavn and returns the highest-quality direct
          audio stream URL (up to 320kbps).
    WHEN: Only called when USE_DEV_FALLBACK=true.

    Uses the public API from: https://github.com/cyberboysumanjay/JioSaavnAPI
    Primary endpoint: saavn.dev/api/search/songs
    Legacy fallback:  jiosaavn-api-privatecvc2.vercel.app/search/songs
    """
    # ── Try primary saavn.dev endpoint first ─────────────────────
    stream_url = await _try_saavn_endpoint(
        _JIOSAAVN_SEARCH_URL, {"query": query}, "saavn.dev"
    )
    if stream_url:
        return stream_url

    # ── Fallback to legacy Vercel-hosted endpoint ────────────────
    stream_url = await _try_saavn_endpoint(
        _JIOSAAVN_LEGACY_URL, {"query": query}, "vercel"
    )
    return stream_url


async def _try_saavn_endpoint(url: str, params: dict, label: str) -> Optional[str]:
    """
    WHY:  JioSaavn APIs have multiple public mirrors; any can go down.
    WHAT: Tries one specific endpoint and extracts the audio stream URL.
    WHEN: Called by _jiosaavn_fallback for each mirror.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                params=params,
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()

                    # ── Parse saavn.dev format ───────────────────
                    # Response: { "data": { "results": [ { "downloadUrl": [...] } ] } }
                    results = data.get("data", {}).get("results", [])
                    if results:
                        song = results[0]
                        download_links = song.get("downloadUrl", [])

                        # Prefer 320kbps > 160kbps > any available
                        for quality in ["320kbps", "160kbps", "96kbps"]:
                            for link in download_links:
                                if link.get("quality", "") == quality:
                                    print(f"[jiosaavn-{label}] Found {quality} stream")
                                    return link.get("link") or link.get("url")

                        # Last resort: take whatever is available
                        if download_links:
                            return download_links[-1].get("link") or download_links[-1].get("url")
                else:
                    print(f"[jiosaavn-{label}] HTTP {resp.status}")
    except Exception as exc:
        print(f"[jiosaavn-{label}] Request failed: {exc}")

    return None