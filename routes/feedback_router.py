"""
feedback_router.py — Feedback API for WatchWise.

Accepts user feedback via POST /feedback and logs it into the AnalyticsEvent table.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
import json

from backend.database import get_db
from backend.models_db import AnalyticsEvent

router = APIRouter(prefix="/feedback", tags=["feedback"])

class FeedbackSubmitRequest(BaseModel):
    email: EmailStr
    message: str
    type: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(body: FeedbackSubmitRequest, db: AsyncSession = Depends(get_db)):
    """
    Submit general feedback (email, message, type).
    Saved as an AnalyticsEvent since it's generic site feedback.
    """
    event_data = {
        "email": body.email,
        "message": body.message,
        "type": body.type
    }
    
    new_event = AnalyticsEvent(
        event_type="site_feedback",
        event_data=json.dumps(event_data)
    )
    
    db.add(new_event)
    await db.commit()
    
    return {"message": "Feedback submitted successfully. Thank you!"}
