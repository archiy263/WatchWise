"""
database.py — Async SQLAlchemy engine & session factory for WatchWise.

Uses SQLite for local development.  Swap the URL via the ``DATABASE_URL``
env var for Postgres / MySQL in production.
"""

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./watchwise.db",
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


async def init_db() -> None:
    """Create all tables that don't yet exist."""
    async with engine.begin() as conn:
        from backend.models_db import (  # noqa: F401 — ensure models are registered
            User,
            Session,
            Feedback,
            AnalyticsEvent,
            ListeningEvent,
        )
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency that yields an async DB session."""
    async with async_session() as session:
        yield session
