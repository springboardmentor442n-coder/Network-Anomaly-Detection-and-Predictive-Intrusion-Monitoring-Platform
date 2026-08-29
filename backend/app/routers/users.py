from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.dependencies import require_role
from app.models import RoleEnum

router = APIRouter(prefix="/users", tags=["Team Management"])


@router.get("/", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_role(RoleEnum.admin)),
):
    """Admin-only: view the full SOC team roster."""
    return db.query(models.User).all()


@router.patch("/{user_id}/deactivate", response_model=schemas.UserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(RoleEnum.admin)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)

    db.add(models.AuditLog(user_id=admin.id, action="DEACTIVATE_USER", detail=f"target={user.email}"))
    db.commit()
    return user


@router.get("/audit-logs")
def view_audit_logs(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_role(RoleEnum.admin)),
    limit: int = 50,
):
    logs = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id, "user_id": l.user_id, "action": l.action,
            "detail": l.detail, "timestamp": l.timestamp,
        }
        for l in logs
    ]
