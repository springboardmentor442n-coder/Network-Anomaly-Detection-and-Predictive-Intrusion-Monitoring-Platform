"""Authentication routes."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.database.models import User, AuditLog
from app.core.security import verify_password, create_access_token, get_password_hash
from app.api.deps import get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    username: str  # Can be username or email
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    username: Optional[str] = None
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email or username and return JWT token."""
    clean_identifier = body.username.strip().lower()
    clean_password = body.password.strip()

    user = db.query(User).filter(
        (func.lower(User.username) == clean_identifier) | 
        (func.lower(User.email) == clean_identifier)
    ).first()

    if not user or not verify_password(clean_password, user.hashed_password):
        # Log failed attempt
        log = AuditLog(
            username=body.username,
            action="LOGIN_FAILED",
            ip_address=request.client.host if request.client else None,
            result="FAILURE",
            details={"reason": "Invalid credentials"},
        )
        db.add(log)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email/username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Update last login
    user.last_login = datetime.utcnow()

    # Create audit log
    log = AuditLog(
        user_id=user.id,
        username=user.username,
        action="LOGIN",
        ip_address=request.client.host if request.client else None,
        result="SUCCESS",
    )
    db.add(log)
    db.commit()

    token = create_access_token(data={"sub": user.id, "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
        },
    }


@router.post("/register", response_model=TokenResponse)
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """Register or update primary user account."""
    clean_email = body.email.strip().lower()
    clean_password = body.password.strip()
    clean_username = (body.username.strip().lower() if body.username else clean_email.split("@")[0])
    clean_name = body.full_name.strip() if body.full_name else clean_username.title()

    if len(clean_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check if user already exists
    user = db.query(User).filter(
        (func.lower(User.email) == clean_email) | (func.lower(User.username) == clean_username)
    ).first()

    if user:
        # Update password and activate user
        user.hashed_password = get_password_hash(clean_password)
        user.email = clean_email
        if body.full_name:
            user.full_name = clean_name
        user.is_active = True
        user.role = "ADMIN"
        db.commit()
        db.refresh(user)
    else:
        user = User(
            username=clean_username,
            email=clean_email,
            full_name=clean_name,
            hashed_password=get_password_hash(clean_password),
            role="ADMIN",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
        },
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
        "created_at": current_user.created_at.isoformat(),
    }


@router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout - audit log only (JWT is stateless)."""
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="LOGOUT",
        ip_address=request.client.host if request.client else None,
        result="SUCCESS",
    )
    db.add(log)
    db.commit()
    return {"message": "Logged out successfully"}
