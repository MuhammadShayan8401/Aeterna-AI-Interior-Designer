"""
routes/auth.py
===============
JWT-based authentication for Users and Admins.

POST   /auth/register           — create a user account
POST   /auth/login              — user login → access + refresh tokens
POST   /auth/refresh            — exchange a refresh token for a new access token
GET    /auth/me                 — current user's profile
PATCH  /auth/me                 — update current user's profile/preferences

POST   /auth/admin/bootstrap    — create the FIRST admin (gated by ADMIN_SETUP_KEY,
                                   only works while the admins collection is empty)
POST   /auth/admin/login        — admin login → access + refresh tokens
GET    /auth/admin/me            — current admin's profile

None of this touches the existing /generate, /feedback, or /ann routes —
all are additive. If MongoDB isn't connected, these routes return 503
(via the require_db dependency chain) rather than crashing the app.
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from core.config import settings
from core.deps import get_current_admin, get_current_user
from core.security import (
    create_access_token, create_refresh_token,
    decode_token, hash_password, verify_password,
)
from database.mongo import admins_collection, users_collection
from database.schemas import (
    AdminCreate, AdminOut, UserCreate, UserLogin, UserOut, UserUpdate,
)

router = APIRouter()


def _utcnow() -> datetime:
    """Timezone-aware UTC now (datetime.utcnow() is deprecated)."""
    return datetime.now(timezone.utc)


class TokenPair(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


def _user_doc_to_out(doc: dict) -> dict:
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    return doc


# ── User registration / login ─────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    coll = users_collection()
    if await coll.find_one({"email": payload.email}):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    now = _utcnow()
    doc = {
        "email":            payload.email,
        "full_name":        payload.full_name,
        "hashed_password":  hash_password(payload.password),
        "role":             "user",
        "avatar_url":       None,
        "preferences": {
            "favorite_styles": [], "favorite_room_types": [],
            "density_history": [], "default_room_type": None, "default_style": None,
        },
        "is_active":  True,
        "created_at": now,
        "updated_at": now,
    }
    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _user_doc_to_out(doc)


@router.post("/login", response_model=TokenPair)
async def login(payload: UserLogin):
    coll = users_collection()
    doc = await coll.find_one({"email": payload.email})
    if not doc or not verify_password(payload.password, doc["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not doc.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    await coll.update_one({"_id": doc["_id"]}, {"$set": {"last_login": _utcnow()}})

    uid = str(doc["_id"])
    return TokenPair(
        access_token=create_access_token(uid, "user"),
        refresh_token=create_refresh_token(uid, "user"),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest):
    decoded = decode_token(payload.refresh_token)
    if decoded is None or decoded.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    role = decoded.get("role", "user")
    sub  = decoded["sub"]
    # Confirm the account still exists/active before issuing a new access token.
    coll = admins_collection() if role == "admin" else users_collection()
    try:
        doc = await coll.find_one({"_id": ObjectId(sub)})
    except Exception:
        doc = None
    if doc is None or not doc.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account no longer valid")

    return TokenPair(
        access_token=create_access_token(sub, role),
        refresh_token=create_refresh_token(sub, role),
    )


@router.get("/me", response_model=UserOut)
async def read_me(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Use /auth/admin/me for admin accounts")
    return _user_doc_to_out(current_user)


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    coll = users_collection()
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        updates["updated_at"] = _utcnow()
        await coll.update_one({"_id": current_user["_id"]}, {"$set": updates})
    doc = await coll.find_one({"_id": current_user["_id"]})
    return _user_doc_to_out(doc)


# ── Admin bootstrap / login ────────────────────────────────────────────────────

@router.post("/admin/bootstrap", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
async def bootstrap_admin(payload: AdminCreate, x_setup_key: str = Header(...)):
    """
    Creates the FIRST admin account. Only works once — as soon as any
    admin exists, this endpoint always rejects, regardless of the key.
    Set ADMIN_SETUP_KEY in backend/.env before using this in production.
    """
    if not settings.ADMIN_SETUP_KEY or x_setup_key != settings.ADMIN_SETUP_KEY:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid setup key")

    coll = admins_collection()
    if await coll.count_documents({}) > 0:
        raise HTTPException(status.HTTP_409_CONFLICT, "An admin account already exists")

    doc = {
        "email":           payload.email,
        "full_name":       payload.full_name,
        "hashed_password": hash_password(payload.password),
        "permissions":     [p.value for p in payload.permissions],
        "system_flags":    {},
        "is_active":       True,
        "created_at":      _utcnow(),
    }
    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _user_doc_to_out(doc)


@router.post("/admin/login", response_model=TokenPair)
async def admin_login(payload: UserLogin):
    coll = admins_collection()
    doc = await coll.find_one({"email": payload.email})
    if not doc or not verify_password(payload.password, doc["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not doc.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    aid = str(doc["_id"])
    return TokenPair(
        access_token=create_access_token(aid, "admin"),
        refresh_token=create_refresh_token(aid, "admin"),
    )


@router.get("/admin/me", response_model=AdminOut)
async def read_admin_me(current_admin: dict = Depends(get_current_admin)):
    return _user_doc_to_out(current_admin)
