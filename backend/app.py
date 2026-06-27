"""
Aeterna AI Interior Designer Backend (v2 — Production Ready)
"""

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# IMPORTANT: backend is root in deployment
from routes.generate import router as gen_router
from routes.empty_room import router as empty_room_router
from routes.history import router as history_router
from routes.dashboard import router as dashboard_router
from routes.ann_metrics import router as ann_router
from routes.feedback import router as fb_router
from routes.auth import router as auth_router

from models.ann.preference_model import load_ann_model
from core.config import settings
from database.mongo import connect_to_mongo, close_mongo_connection


app = FastAPI(
    title="Aeterna AI Interior Designer",
    version="2.0.0",
    description="Four-stage AI pipeline with adaptive ANN preference learning",
)

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Uploads ----------------
UPLOADS = Path(__file__).parent / "uploads"
UPLOADS.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")

# ---------------- Routes ----------------
app.include_router(gen_router)
app.include_router(empty_room_router)
app.include_router(history_router)
app.include_router(dashboard_router)
app.include_router(ann_router, prefix="/ann")
app.include_router(fb_router, prefix="/feedback")
app.include_router(auth_router, prefix="/auth")


# ---------------- Health Check ----------------
@app.get("/health")
async def health():
    from database.mongo import get_database
    return {
        "status": "ok",
        "gpu": torch.cuda.is_available(),
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "version": "2.0.0",
        "database": "connected" if get_database() is not None else "unavailable",
        "pipeline": [
            "SegFormer semantic segmentation",
            "MiDaS depth estimation",
            "ANN preference learning",
            "Stable Diffusion v1.5 img2img",
        ],
    }


@app.get("/")
async def root():
    return {
        "message": "Aeterna AI Interior Designer API v2.0",
        "docs": "/docs"
    }


# ---------------- Startup ----------------
@app.on_event("startup")
async def on_startup():
    try:
        load_ann_model()
        print("Aeterna v2.0 ready — ANN model loaded")
    except Exception as e:
        print("ANN load warning:", e)

    db_ok = await connect_to_mongo()
    if db_ok and settings.jwt_secret_is_ephemeral:
        print(
            "WARNING: JWT_SECRET_KEY is not set in backend/.env — using a random "
            "key for this process only. Existing tokens will be invalidated on "
            "every restart. Set JWT_SECRET_KEY before deploying."
        )


# ---------------- Shutdown ----------------
@app.on_event("shutdown")
async def on_shutdown():
    await close_mongo_connection()