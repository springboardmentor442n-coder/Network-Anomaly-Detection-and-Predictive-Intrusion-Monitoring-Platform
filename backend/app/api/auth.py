from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.auth import (
    create_access_token,
    get_current_user,
    require_role,
)
from backend.app.core.database import get_db
from backend.app.core.password import verify_password
from backend.app.models.user import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(
            User.username == request.username
        )
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if not verify_password(
        request.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(
        username=user.username,
        role=user.role,
    )

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        username=user.username,
        role=user.role,
    )


@router.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user),
):
    return {
        "message": "Authentication successful",
        "username": current_user["username"],
        "role": current_user["role"],
    }


@router.get("/admin-test")
def admin_test(
    current_user: dict = Depends(
        require_role("ADMIN")
    ),
):
    return {
        "message": "Admin access granted",
        "username": current_user["username"],
        "role": current_user["role"],
    }