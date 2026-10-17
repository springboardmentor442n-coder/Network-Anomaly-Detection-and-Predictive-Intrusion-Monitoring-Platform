"""Users management routes."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, AuditLog
from app.api.deps import get_current_user, require_admin
from app.core.security import get_password_hash

router = APIRouter()


class CreateUserRequest(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    password: str
    role: str = "ANALYST"
    team_id: Optional[str] = None


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    team_id: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_users(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    users = db.query(User).offset(skip).limit(limit).all()
    total = db.query(User).count()
    return {"total": total, "items": [_user_dict(u) for u in users]}


@router.post("/")
async def create_user(
    body: CreateUserRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    valid_roles = ["ADMIN", "ANALYST", "SOC_OPERATOR"]
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    user = User(
        username=body.username,
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(body.password),
        role=body.role,
        team_id=body.team_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else None
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="USER_CREATED",
        resource_type="user",
        resource_id=user.id,
        ip_address=client_ip,
        result="SUCCESS",
        details={"username": user.username, "role": user.role},
    )
    db.add(log)
    db.commit()

    return _user_dict(user)


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        user.role = body.role
    if body.team_id is not None:
        user.team_id = body.team_id
    if body.is_active is not None:
        user.is_active = body.is_active

    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else None
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="USER_UPDATED",
        resource_type="user",
        resource_id=user.id,
        ip_address=client_ip,
        result="SUCCESS",
        details={"username": user.username, "role": user.role, "is_active": user.is_active},
    )
    db.add(log)
    db.commit()

    return _user_dict(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    client_ip = request.client.host if request.client else None
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="USER_DELETED",
        resource_type="user",
        resource_id=user.id,
        ip_address=client_ip,
        result="SUCCESS",
        details={"username": user.username},
    )
    db.add(log)
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


def _user_dict(u: User) -> dict:
    return {
        "id": u.id, "username": u.username, "email": u.email,
        "full_name": u.full_name, "role": u.role, "team_id": u.team_id,
        "is_active": u.is_active,
        "last_login": u.last_login.isoformat() if u.last_login else None,
        "created_at": u.created_at.isoformat(),
    }
