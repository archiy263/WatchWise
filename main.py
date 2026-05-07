import os

from contextlib import asynccontextmanager
from fastapi import FastAPI
from backend.routes.api import router as api_router
from backend.routes.music_router import router as music_router
from backend.routes.auth_router import router as auth_router
from backend.routes.feedback_router import router as feedback_router
from backend.database import init_db
from backend.security import configure_security

from dotenv import load_dotenv
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="WatchWise API", lifespan=lifespan)

configure_security(app)

app.include_router(api_router)
app.include_router(music_router)
app.include_router(auth_router)
app.include_router(feedback_router)

@app.get("/")
def read_root():
    return {"message": "WatchWise API is running. Check /docs for endpoints."}
