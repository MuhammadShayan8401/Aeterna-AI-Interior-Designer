"""
database/schemas.py
====================
Pydantic schemas for Aeterna's MongoDB collections.

Wiring status:
- Users / Admins        — fully wired (routes/auth.py, this phase)
- Generations            — schema defined now, route integration lands
                            with the Empty Room Generation + History phases.
                            Designed to store BOTH existing img2img redesign
                            outputs and the new txt2img empty-room outputs
                            via `generation_type`.
- Feedback                — schema defined now as the future Mongo-backed
                            replacement/companion for the existing
                            uploads/feedback.json flat file used by
                            routes/feedback.py. The existing flat-file
                            feedback system is NOT touched by this file.
- ANNTrainingLogs          — schema defined now; will be written to by
                            routes/feedback.py's /train endpoint in a
                            later phase, additively (existing .pth
                            checkpoint training is unaffected).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, BeforeValidator


def _utcnow() -> datetime:
    """Timezone-aware UTC now (datetime.utcnow() is deprecated)."""
    return datetime.now(timezone.utc)


# ── Mongo ObjectId handling ───────────────────────────────────────────────────
# Mongo _id values arrive as ObjectId; we accept either an ObjectId or a
# string and always serialize as a string in API responses.
PyObjectId = Annotated[str, BeforeValidator(str)]


# ════════════════════════════════════════════════════════════════════════════
# USERS
# ════════════════════════════════════════════════════════════════════════════

class UserRole(str, Enum):
    user = "user"
    admin = "admin"


class UserPreferences(BaseModel):
    """Rolling preference history — extended (not replaced) over time as
    the user generates and rates designs."""
    favorite_styles:     list[str] = Field(default_factory=list)
    favorite_room_types: list[str] = Field(default_factory=list)
    density_history:     list[str] = Field(default_factory=list)
    default_room_type:   Optional[str] = None
    default_style:       Optional[str] = None


class UserBase(BaseModel):
    email:     EmailStr
    full_name: str = Field(..., min_length=1, max_length=120)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserUpdate(BaseModel):
    """Partial profile update — only provided fields are changed."""
    full_name:   Optional[str] = None
    avatar_url:  Optional[str] = None
    preferences: Optional[UserPreferences] = None


class UserInDB(UserBase):
    """Internal representation — includes the password hash. Never
    returned directly from an API route."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:               PyObjectId = Field(alias="_id")
    hashed_password:  str
    role:             UserRole = UserRole.user
    avatar_url:        Optional[str] = None
    preferences:       UserPreferences = Field(default_factory=UserPreferences)
    is_active:          bool = True
    last_login:           Optional[datetime] = None
    created_at:          datetime = Field(default_factory=_utcnow)
    updated_at:          datetime = Field(default_factory=_utcnow)


class UserOut(BaseModel):
    """Public-facing user representation — no password hash."""
    model_config = ConfigDict(populate_by_name=True)

    id:          PyObjectId = Field(alias="_id")
    email:       EmailStr
    full_name:   str
    role:        UserRole
    avatar_url:  Optional[str] = None
    preferences: UserPreferences
    is_active:   bool
    last_login:    Optional[datetime] = None
    created_at:  datetime


# ════════════════════════════════════════════════════════════════════════════
# ADMINS
# ════════════════════════════════════════════════════════════════════════════

class AdminPermission(str, Enum):
    manage_users      = "manage_users"
    manage_generations = "manage_generations"
    trigger_retrain    = "trigger_retrain"
    view_system_logs   = "view_system_logs"
    full_access         = "full_access"


class AdminBase(BaseModel):
    email:     EmailStr
    full_name: str = Field(..., min_length=1, max_length=120)


class AdminCreate(AdminBase):
    password:    str = Field(..., min_length=8, max_length=128)
    permissions: list[AdminPermission] = Field(default_factory=lambda: [AdminPermission.full_access])


class AdminInDB(AdminBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:               PyObjectId = Field(alias="_id")
    hashed_password:  str
    permissions:       list[AdminPermission] = Field(default_factory=list)
    system_flags:       dict[str, Any] = Field(default_factory=dict)  # e.g. {"maintenance_mode": False}
    is_active:           bool = True
    created_at:           datetime = Field(default_factory=_utcnow)


class AdminOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id:          PyObjectId = Field(alias="_id")
    email:       EmailStr
    full_name:   str
    permissions: list[AdminPermission]
    is_active:   bool
    created_at:  datetime


# ════════════════════════════════════════════════════════════════════════════
# GENERATIONS  (schema defined now — route wiring lands in a later phase)
# ════════════════════════════════════════════════════════════════════════════

class GenerationType(str, Enum):
    redesign   = "redesign"     # existing img2img room redesign
    empty_room = "empty_room"   # new txt2img empty room generation


class GenerationDoc(BaseModel):
    """A single generation run — covers both pipeline modes."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:               PyObjectId = Field(alias="_id")
    user_id:           Optional[PyObjectId] = None   # null for anonymous/session-only use
    session_id:         str                            # ties back to existing session-based flow
    generation_type:    GenerationType

    # Shared generation parameters
    room_type:           str
    style:                str
    density:              str = "moderate"
    strength:             Optional[float] = None   # redesign only (img2img)
    lighting:             Optional[str] = None      # empty_room only (txt2img)
    prompt:                str
    negative_prompt:        Optional[str] = None

    # Inputs / outputs
    input_image_url:    Optional[str] = None        # null for empty_room
    output_image_urls:  list[str] = Field(default_factory=list)
    seeds:                list[int] = Field(default_factory=list)

    # Derived metadata
    furniture_detected:  list[str] = Field(default_factory=list)
    ann_recommendation_used: bool = False
    preference_scores:     list[float] = Field(default_factory=list)
    generation_time:        Optional[float] = None

    # History / revisit
    is_favorite:          bool = False
    parent_generation_id:  Optional[PyObjectId] = None  # set when regenerated from a past run

    created_at:             datetime = Field(default_factory=_utcnow)


# ════════════════════════════════════════════════════════════════════════════
# FEEDBACK  (schema defined now — Mongo-backed companion to feedback.json)
# ════════════════════════════════════════════════════════════════════════════

class FeedbackDoc(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:               PyObjectId = Field(alias="_id")
    user_id:           Optional[PyObjectId] = None
    generation_id:      PyObjectId
    image_index:         int
    rating:               int            # +1 / -1
    aesthetic_score:      float = 0.5
    realism_score:         float = 0.5
    created_at:             datetime = Field(default_factory=_utcnow)


# ════════════════════════════════════════════════════════════════════════════
# ANN TRAINING LOGS  (schema defined now — written to by /feedback/train later)
# ════════════════════════════════════════════════════════════════════════════

class ANNTrainingLogDoc(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:             PyObjectId = Field(alias="_id")
    model_version:   str
    accuracy:         float
    precision:        float
    recall:           float
    f1_score:          float
    loss_curve:         list[float] = Field(default_factory=list)
    dataset_size:        int
    trained_at:           datetime = Field(default_factory=_utcnow)
