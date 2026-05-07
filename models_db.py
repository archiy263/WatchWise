"""
models_db.py — SQLAlchemy ORM models for WatchWise.

Tables
------
* **users** — registered accounts (bcrypt-hashed passwords)
* **sessions** — JWT refresh-token tracking
* **feedback** — user-submitted feedback / ratings
* **analytics_events** — generic analytics (page views, clicks, etc.)
* **listening_events** — per-track listening history for pattern analysis
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# =====================================================================
#  Users
# =====================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    analytics = relationship("AnalyticsEvent", back_populates="user", cascade="all, delete-orphan")
    listening = relationship("ListeningEvent", back_populates="user", cascade="all, delete-orphan")


# =====================================================================
#  Sessions (JWT refresh-token tracking)
# =====================================================================

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String(512), unique=True, nullable=False)
    user_agent = Column(String(512), nullable=True)
    ip_address = Column(String(45), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="sessions")


# =====================================================================
#  Feedback
# =====================================================================

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)          # "movie" | "track"
    item_id = Column(String(255), nullable=False)
    rating = Column(Float, nullable=True)                   # 1.0 – 5.0
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="feedback")


# =====================================================================
#  Analytics Events
# =====================================================================

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(100), nullable=False)        # "page_view", "search", …
    event_data = Column(Text, nullable=True)                # JSON blob
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="analytics")


# =====================================================================
#  Listening Events
# =====================================================================

class ListeningEvent(Base):
    __tablename__ = "listening_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    track_id = Column(String(255), nullable=False)
    track_name = Column(String(500), nullable=True)
    artist = Column(String(500), nullable=True)
    genre = Column(String(100), nullable=True)
    mood = Column(String(50), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="listening")
