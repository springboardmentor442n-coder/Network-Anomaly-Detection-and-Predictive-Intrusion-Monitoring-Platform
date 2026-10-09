from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.auth import require_role
from backend.app.core.database import get_db
from backend.app.core.password import hash_password
from backend.app.models.user import User


router = APIRouter(
    prefix="/users",
    tags=["User Management"],
)


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "ANALYST"
    is_active: bool = True


class UserResponse(BaseModel):
    user_id: int
    username: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get(
    "",
    response_model=list[UserResponse],
)
def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("ADMIN")
    ),
):
    return (
        db.query(User)
        .order_by(User.user_id)
        .all()
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("ADMIN")
    ),
):
    username = request.username.strip()

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required.",
        )

    if not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required.",
        )

    role = request.role.strip().upper()

    if role not in {"ADMIN", "ANALYST"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be ADMIN or ANALYST.",
        )

    existing_user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    user = User(
        username=username,
        password_hash=hash_password(
            request.password
        ),
        role=role,
        is_active=request.is_active,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("ADMIN")
    ),
):
    user = (
        db.query(User)
        .filter(User.user_id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.username == current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    db.delete(user)
    db.commit()

    return None