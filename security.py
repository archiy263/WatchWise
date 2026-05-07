"""
security.py — Security middleware & rate-limiting for WatchWise.

Components
----------
* **SecurityHeadersMiddleware** — Injects OWASP-recommended response
  headers (X-Content-Type-Options, X-Frame-Options, CSP, etc.)
* **Rate limiter** — slowapi-based per-IP throttling
* ``configure_security(app)`` — one-call setup helper
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

load_dotenv()

# ── Allowed origins from .env (comma-separated) ─────────────────────
ALLOWED_ORIGINS: list[str] = ["*"]


# =====================================================================
#  Rate limiter (slowapi)
# =====================================================================

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


# =====================================================================
#  Security Headers Middleware
# =====================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Append standard security headers to every outgoing response.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' https://i.scdn.co https://image.tmdb.org https://*.mzstatic.com "
            "https://ui-avatars.com https://*.saavncdn.com https://c.saavncdn.com "
            "https://fastapi.tiangolo.com data:; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' https://fonts.gstatic.com; "
            "media-src 'self' https://*.saavncdn.com https://aac.saavncdn.com https://*.jiosaavn.com "
            "https://musicapi.x007.workers.dev https://hls-server.vercel.app blob:; "
            "connect-src 'self' https://itunes.apple.com https://musicapi.x007.workers.dev "
            "https://jiosaavn-api-privatecvc2.vercel.app https://saavn.me https://saavn.dev "
            "https://www.googleapis.com https://hls-server.vercel.app wss: ws:; "
            "frame-src 'self' https://www.youtube.com;"
        )

        return response


# =====================================================================
#  One-call setup
# =====================================================================

def configure_security(app: FastAPI) -> None:
    """
    Wire up CORS, rate limiting, and security headers on *app*.

    Call this **once** in ``main.py``::

        from backend.security import configure_security
        configure_security(app)
    """
    #  CORS (restricted)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # ── Security headers ─────────────────────────────────────────
    app.add_middleware(SecurityHeadersMiddleware)

    # ── slowapi rate limiter ─────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
