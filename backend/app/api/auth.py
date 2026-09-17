"""
Authentication API Routes.

Rate limited, with password strength validation and audit logging.
Login failures are deliberately indistinguishable between "unknown email" and
"wrong password" to avoid account enumeration.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..core.rate_limit import RateLimit, client_key
from ..core.security import (
    create_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from ..database import get_db
from ..models import AuditLog, User
from ..schemas import Credentials, TokenResponse, UserResponse
from .dependencies import current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _audit(
    db: Session, email: str, action: str, request: Request, extra: dict | None = None
) -> None:
    """Record an auth event. Never stores passwords or tokens."""
    try:
        details = {"ip": client_key(request)}
        if extra:
            details.update(extra)
        db.add(AuditLog(user_email=email, action=action, details=json.dumps(details)))
        db.commit()
    except Exception as exc:  # noqa: BLE001 - auditing must not break auth
        logger.warning("Failed to write auth audit log: %s", exc)
        db.rollback()


@router.post(
    "/register",
    response_model=TokenResponse,
    dependencies=[Depends(RateLimit("register"))],
)
def register(credentials: Credentials, request: Request, db: Session = Depends(get_db)):
    """
    Register a new analyst account.

    New accounts always receive the ``analyst`` role. Administrator promotion is
    a deliberate admin/database operation, never a registration privilege.
    """
    email = credentials.email.strip().lower()

    problems = validate_password_strength(credentials.password)
    if problems:
        raise HTTPException(
            status_code=422,
            detail={"message": "Password does not meet requirements", "problems": problems},
        )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = User(
        email=email,
        password_hash=hash_password(credentials.password),
        role="analyst",
    )
    db.add(user)
    db.commit()

    _audit(db, email, "register", request, {"role": "analyst"})
    return TokenResponse(access_token=create_access_token(user.email, user.role))


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(RateLimit("login"))],
)
def login(credentials: Credentials, request: Request, db: Session = Depends(get_db)):
    """Authenticate and return a JWT."""
    email = credentials.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        _audit(db, email, "login_failed", request)
        # Same message for both cases - no account enumeration.
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        _audit(db, email, "login_denied_inactive", request)
        raise HTTPException(status_code=403, detail="User account is deactivated")

    _audit(db, email, "login", request, {"role": user.role})
    return TokenResponse(access_token=create_access_token(user.email, user.role))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(current_user)):
    """Return the authenticated user's own profile."""
    return UserResponse.model_validate(user)


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """
    Record a logout.

    JWTs are stateless, so the token remains valid until it expires - the client
    is responsible for discarding it. This endpoint exists so logout is audited.
    """
    _audit(db, user.email, "logout", request)
    return {"status": "ok", "message": "Client should discard the access token"}
