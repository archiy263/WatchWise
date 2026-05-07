"""
Music recommendation scoring engine for WatchWise.

Scores individual tracks against the user's current mood and preferred
genres using a weighted formula combining genre match, mood match, and
track popularity.
"""


def score_track(
    track: dict,
    mood: str,
    preferred_genres: list[str],
) -> float:
    """
    Compute a recommendation score for a single track.

    Formula
    -------
    ``score = 0.5 * genre_match + 0.3 * mood_match + 0.2 * (popularity / 100)``

    Matching rules:
    * **genre_match** — ``1.0`` if the track's genre overlaps with
      *preferred_genres*, else ``0.2``.
    * **mood_match** — ``1.0`` if the track's mood tag equals *mood*,
      else ``0.4``.

    Parameters
    ----------
    track : dict
        A track dictionary expected to contain at least:
        - ``"genre"`` (str): the track's genre tag.
        - ``"mood"`` (str): the track's mood tag.
        - ``"popularity"`` (int | float): popularity score 0–100.
    mood : str
        The user's current detected mood (e.g. "joy", "sadness").
    preferred_genres : list[str]
        List of genre strings the user currently prefers.

    Returns
    -------
    float
        A composite recommendation score (higher is better).
    """
    # ── Genre match ───────────────────────────────────────────────
    track_genre = track.get("genre", "").lower()
    normalised_preferred = {g.lower() for g in preferred_genres}
    genre_match = 1.0 if track_genre in normalised_preferred else 0.2

    # ── Mood match ────────────────────────────────────────────────
    track_mood = track.get("mood", "").lower()
    mood_match = 1.0 if track_mood == mood.lower() else 0.4

    # ── Popularity (0–100 → 0.0–1.0) ─────────────────────────────
    popularity = track.get("popularity", 0)
    popularity_normalised = min(max(popularity, 0), 100) / 100

    # ── Weighted composite score ──────────────────────────────────
    score = (
        0.5 * genre_match
        + 0.3 * mood_match
        + 0.2 * popularity_normalised
    )

    return round(score, 4)
