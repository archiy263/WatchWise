"""
auth_router.py — Authentication routes for WatchWise.

Endpoints
---------
* ``POST /auth/signup``          — Register + email verification token
* ``GET  /auth/verify``          — Verify email via token
* ``POST /auth/login``           — Issue JWT access + refresh tokens
* ``POST /auth/refresh``         — Rotate refresh token
* ``POST /auth/request-reset``   — Generate password-reset token
* ``POST /auth/reset-password``  — Consume reset token, set new password
"""

import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models_db import User, Session as DBSession

load_dotenv()

# ── Config from .env ─────────────────────────────────────────────────
JWT_SECRET: str = os.getenv("JWT_SECRET", "watchwise-dev-secret-change-me")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MIN: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MIN", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Helpers ──────────────────────────────────────────────────────────

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _create_refresh_token() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Request / Response schemas ───────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ResetRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# =====================================================================
#  POST /auth/signup
# =====================================================================

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with a bcrypt-hashed password."""
    # Check duplicates
    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already registered")

    verification_token = str(uuid.uuid4())

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=_hash_password(body.password),
        verification_token=verification_token,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # In production, send verification_token via email here.
    return {
        "message": "Account created. Please verify your email.",
        "user_id": user.id,
        "verification_token": verification_token,   # dev convenience
    }


# =====================================================================
#  GET /auth/verify
# =====================================================================

@router.get("/verify")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Verify a user's email address via the emailed token."""
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token")

    user.is_verified = True
    user.verification_token = None
    await db.commit()

    return {"message": "Email verified successfully"}


# =====================================================================
#  POST /auth/login
# =====================================================================

@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT access + refresh tokens."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not _verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified")

    access_token = _create_access_token(user.id)
    refresh_token = _create_refresh_token()

    # Persist refresh token
    session = DBSession(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=_utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MIN * 60,
    }


# =====================================================================
#  POST /auth/refresh
# =====================================================================

@router.post("/refresh")
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Rotate a refresh token and issue a new access token."""
    result = await db.execute(
        select(DBSession).where(
            DBSession.refresh_token == body.refresh_token,
            DBSession.is_active == True,  # noqa: E712
        )
    )
    session = result.scalar_one_or_none()

    if not session or session.expires_at < _utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    # Revoke old, issue new
    session.is_active = False
    new_refresh = _create_refresh_token()

    new_session = DBSession(
        user_id=session.user_id,
        refresh_token=new_refresh,
        expires_at=_utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_session)
    await db.commit()

    return {
        "access_token": _create_access_token(session.user_id),
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MIN * 60,
    }


# =====================================================================
#  POST /auth/request-reset
# =====================================================================

@router.post("/request-reset")
async def request_reset(body: ResetRequest, db: AsyncSession = Depends(get_db)):
    """Generate a password-reset token (would be emailed in production)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return 200 to prevent email enumeration
    if not user:
        return {"message": "If your email is registered, you will receive a reset link."}

    reset_token = str(uuid.uuid4())
    user.reset_token = reset_token
    user.reset_token_expiry = _utcnow() + timedelta(hours=1)
    await db.commit()

    # In production, send reset_token via email here.
    return {
        "message": "If your email is registered, you will receive a reset link.",
        "reset_token": reset_token,  # dev convenience
    }


# =====================================================================
#  POST /auth/reset-password
# =====================================================================

@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Consume a reset token and set a new password."""
    result = await db.execute(select(User).where(User.reset_token == body.token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reset token")

    if user.reset_token_expiry and user.reset_token_expiry < _utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset token has expired")

    user.hashed_password = _hash_password(body.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    await db.commit()

    return {"message": "Password reset successfully"}
