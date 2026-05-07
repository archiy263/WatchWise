"""
Listening pattern tracker with time-based exponential decay scoring.

Records genre/mood listening events and surfaces the user's current
top genres, weighting recent listens more heavily than older ones.
"""

import time
from collections import defaultdict
from math import exp


class ListeningPattern:
    """
    Tracks listening history and computes genre relevance scores using
    exponential decay so that recent activity is weighted higher.

    Usage
    -----
    >>> lp = ListeningPattern()
    >>> lp.record("pop", "joy")
    >>> lp.record("rock", "anger")
    >>> lp.top_genres(n=2)
    ['rock', 'pop']
    """

    def __init__(self) -> None:
        # genre → list of (timestamp, mood) tuples
        self._history: dict[str, list[tuple[float, str]]] = defaultdict(list)

    # ── Public API ────────────────────────────────────────────────────

    def record(self, genre: str, mood: str) -> None:
        """
        Record a listening event for the given *genre* and *mood*.

        Parameters
        ----------
        genre : str
            The genre that was listened to (e.g. "pop", "rock").
        mood : str
            The mood at the time of listening (e.g. "joy", "sadness").
        """
        self._history[genre].append((time.time(), mood))

    def top_genres(self, n: int = 3) -> list[str]:
        """
        Return the top *n* genres ranked by exponential-decay score.

        Each past listen contributes ``exp(-0.1 * age_in_minutes)`` to
        its genre's total score, so very recent listens dominate.

        Parameters
        ----------
        n : int, optional
            Number of top genres to return (default ``3``).

        Returns
        -------
        list[str]
            Genre names sorted by descending relevance score.
        """
        now = time.time()
        genre_scores: dict[str, float] = {}

        for genre, events in self._history.items():
            score = 0.0
            for timestamp, _ in events:
                age_in_minutes = (now - timestamp) / 60.0
                score += exp(-0.1 * age_in_minutes)
            genre_scores[genre] = score

        ranked = sorted(genre_scores, key=genre_scores.get, reverse=True)  # type: ignore[arg-type]
        return ranked[:n]
