"""FastAPI application entry point for ApprentiTrack."""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import engine, Base
from routers.health import router as health_router
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.my import router as my_router
from routers.apprentices import router as apprentices_router
from routers.cohorts import router as cohorts_router
from routers.modules import router as modules_router
from routers.ksbs import router as ksbs_router
from routers.submissions import router as submissions_router
from routers.interventions import router as interventions_router
from routers.analytics import router as analytics_router
from routers.analysis import router as analysis_router
from routers.feedback import router as feedback_router
from routers.admin import router as admin_router
from routers.chat import router as chat_router

load_dotenv()

# Create all tables on startup (SQLite)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ApprentiTrack API",
    description="Backend API for tracking apprenticeship KSB progress and coverage.",
    version="0.1.0",
)

# CORS – allow the React frontend origin
origins = [
    os.getenv("CORS_ORIGIN", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_cache_headers(request, call_next):
    """Prevent browsers/proxies from serving stale API responses."""
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    return response

# Include routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(my_router)
app.include_router(apprentices_router)
app.include_router(cohorts_router)
app.include_router(modules_router)
app.include_router(ksbs_router)
app.include_router(submissions_router)
app.include_router(interventions_router)
app.include_router(analytics_router)
app.include_router(analysis_router)
app.include_router(feedback_router)
app.include_router(admin_router)
app.include_router(chat_router)
