"""Authentication routes."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.database.models import User, AuditLog
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(
        (User.username == body.username) | (User.email == body.username)
    ).first()

    if not user or not verify_password(body.password, user.hashed_password):
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
        raise HTTPException(status_code=401, detail="Invalid credentials")

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
