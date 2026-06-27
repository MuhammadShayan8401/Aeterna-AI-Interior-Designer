"""
core/deps.py
============
FastAPI dependencies for authentication & authorization.
Used by routes that require a logged-in user or admin.
"""

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.security import decode_token
from database.mongo import users_collection, admins_collection

bearer_scheme = HTTPBearer(auto_error=False)


async def _resolve_token(creds: HTTPAuthorizationCredentials | None) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    payload = decode_token(creds.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Expected an access token")
    return payload


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Resolves the bearer token to a user document. Works for both
    'user' and 'admin' role tokens (admins are still users of the API)."""
    payload = await _resolve_token(creds)
    try:
        oid = ObjectId(payload["sub"])
    except (InvalidId, KeyError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token subject")

    collection = admins_collection() if payload.get("role") == "admin" else users_collection()
    doc = await collection.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found")
    if not doc.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    doc["role"] = payload.get("role", "user")
    return doc


async def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin privileges required")
    return user


def require_permission(permission: str):
    """Factory for permission-scoped admin dependencies, e.g.:
    Depends(require_permission('trigger_retrain'))"""
    async def _checker(admin: dict = Depends(get_current_admin)) -> dict:
        perms = admin.get("permissions", [])
        if "full_access" not in perms and permission not in perms:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing permission: {permission}")
        return admin
    return _checker


async def get_optional_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str | None:
    """
    Best-effort user id extraction for routes that work both logged-in
    and anonymous (e.g. Empty Room Generation, tied to a user when
    available but never required). Never raises — returns None on any
    missing/invalid/expired token instead of rejecting the request.
    """
    if creds is None:
        return None
    payload = decode_token(creds.credentials)
    if payload is None or payload.get("type") != "access" or payload.get("role") != "user":
        return None
    return payload.get("sub")
