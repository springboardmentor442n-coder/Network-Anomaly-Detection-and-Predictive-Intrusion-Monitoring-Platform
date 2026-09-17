"""
Admin Management API Routes.

Every route here requires the ``admin`` role. Analysts receive 403.
No endpoint in this module returns a secret value.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.rate_limit import status_report as rate_limit_status
from ..database import get_db
from ..ml.risk import policy as risk_policy
from ..models import AuditLog, ModelVersion, User
from ..schemas import UserResponse, UserUpdateRequest
from ..services import (
    MLService,
    MonitoringService,
    notification_service,
    threat_intelligence_service,
)
from .dependencies import admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """List all users (admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(user) for user in users]


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Get a specific user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Update a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.role is not None:
        if request.role not in ["analyst", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = request.role

    if request.is_active is not None:
        user.is_active = request.is_active

    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.post("/users/{user_id}/promote-admin", response_model=UserResponse)
def promote_to_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Promote a user to admin (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = "admin"
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.post("/users/{user_id}/demote-analyst", response_model=UserResponse)
def demote_to_analyst(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Demote an admin user to analyst (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = "analyst"
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Deactivate a user account (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.post("/users/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Activate a user account (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Get system statistics (admin only)."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    analyst_users = db.query(User).filter(User.role == "analyst").count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "admin_count": admin_users,
        "analyst_count": analyst_users,
    }


@router.get("/audit-logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
    user_email: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Query the audit trail (admin only)."""
    query = db.query(AuditLog)
    if user_email:
        query = query.filter(AuditLog.user_email == user_email.strip().lower())
    if action:
        query = query.filter(AuditLog.action == action)

    total = query.count()
    rows = (
        query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    )
    return {
        "total": total,
        "logs": [
            {
                "id": row.id,
                "user_email": row.user_email,
                "action": row.action,
                "details": row.details,
                "created_at": row.created_at,
            }
            for row in rows
        ],
    }


@router.get("/audit-logs/actions")
def list_audit_actions(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Distinct audit action names, for building filter dropdowns."""
    rows = db.query(AuditLog.action, func.count(AuditLog.id)).group_by(AuditLog.action).all()
    return {"actions": [{"action": action, "count": count} for action, count in rows]}


@router.get("/users/{user_id}/activity")
def user_activity(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
    limit: int = Query(50, ge=1, le=200),
):
    """Recent audit entries for one user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rows = (
        db.query(AuditLog)
        .filter(AuditLog.user_email == user.email)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "user": UserResponse.model_validate(user),
        "activity": [
            {
                "id": row.id,
                "action": row.action,
                "details": row.details,
                "created_at": row.created_at,
            }
            for row in rows
        ],
    }


@router.get("/system-config")
def system_config(admin: User = Depends(admin_user)):
    """
    Configuration status for the admin panel.

    Reports only booleans and non-sensitive names - no secret value is ever
    returned by this endpoint.
    """
    warnings = []
    if settings.jwt_secret_is_default:
        warnings.append(
            "NETSHIELD_JWT_SECRET is still the built-in default. Set a unique "
            "32+ character secret before exposing this deployment."
        )
    if settings.cors_origins == ["*"]:
        warnings.append(
            "CORS allows all origins. Set NETSHIELD_CORS_ORIGINS to your frontend origin(s)."
        )
    if settings.is_production and settings.database_url.startswith("sqlite"):
        warnings.append(
            "Environment is production but the database is SQLite. Use PostgreSQL "
            "via NETSHIELD_DATABASE_URL."
        )

    return {
        "application": settings.configuration_status(),
        "risk_scoring": risk_policy(),
        "rate_limiting": rate_limit_status(),
        "notifications": notification_service.configuration_status(),
        "threat_intelligence": threat_intelligence_service.configuration_status(),
        "monitoring": MonitoringService.sources_status(),
        "model": _model_status(),
        "warnings": warnings,
    }


def _model_status() -> dict:
    """Active model summary for the admin panel."""
    service = MLService(settings.model_root)
    metadata = service.get_model_info()
    if metadata.get("status") == "not_trained":
        return {
            "ready": False,
            "status": "not_trained",
            "message": "Run 'python -m backend.scripts.train_models' to train models.",
        }
    metrics = metadata.get("metrics", {}) or {}
    return {
        "ready": service.is_ready(),
        "status": "trained",
        "model_version": metadata.get("model_version"),
        "dataset": metadata.get("dataset"),
        "trained_at": metadata.get("trained_at"),
        "sample_rows": metadata.get("sample_rows"),
        "class_count": len(metadata.get("classes", []) or []),
        "feature_count": len(metadata.get("features", []) or []),
        "accuracy": metrics.get("accuracy"),
        "f1_macro": metrics.get("f1_macro"),
        "f1_weighted": metrics.get("f1_weighted"),
    }


@router.get("/models")
def list_models(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """
    Registered model versions plus the model currently loaded from disk.

    The on-disk model is the source of truth; the ``model_versions`` table is a
    registry for tracking history and future versions.
    """
    rows = (
        db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).limit(50).all()
    )
    return {
        "active_on_disk": _model_status(),
        "registered_versions": [
            {
                "id": row.id,
                "model_type": row.model_type,
                "version": row.version,
                "dataset": row.dataset,
                "accuracy": row.accuracy,
                "f1_score": row.f1_score,
                "is_active": row.is_active,
                "trained_at": row.trained_at,
                "model_path": row.model_path,
            }
            for row in rows
        ],
    }


@router.post("/models/sync")
def sync_model_registry(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """
    Register the on-disk model in the model_versions table.

    This only reads models/metadata.json and writes a registry row. It never
    triggers training: retraining stays a deliberate operator action run on the
    host (``python -m backend.scripts.train_models``), so no API caller can
    execute training work. See docs/security.md.
    """
    service = MLService(settings.model_root)
    metadata = service.get_model_info()
    if metadata.get("status") == "not_trained":
        raise HTTPException(
            status_code=409,
            detail="No trained model found on disk. Run the training script first.",
        )

    metrics = metadata.get("metrics", {}) or {}
    version = str(metadata.get("model_version", "unknown"))
    dataset = str(metadata.get("dataset", "unknown"))

    trained_at_raw = metadata.get("trained_at")
    try:
        trained_at = (
            datetime.fromisoformat(str(trained_at_raw).replace("Z", "+00:00"))
            if trained_at_raw
            else datetime.now(timezone.utc)
        )
    except ValueError:
        trained_at = datetime.now(timezone.utc)

    created = []
    for model_type, filename in (
        ("CLASSIFIER", "classifier.joblib"),
        ("ANOMALY_DETECTOR", "anomaly.joblib"),
    ):
        existing = (
            db.query(ModelVersion)
            .filter(
                ModelVersion.model_type == model_type,
                ModelVersion.version == version,
                ModelVersion.dataset == dataset,
            )
            .first()
        )
        if existing:
            continue
        row = ModelVersion(
            model_type=model_type,
            version=version,
            dataset=dataset,
            accuracy=metrics.get("accuracy"),
            precision=metrics.get("precision_macro"),
            recall=metrics.get("recall_macro"),
            f1_score=metrics.get("f1_macro"),
            model_path=str(settings.model_root / filename),
            metadata_path=str(settings.model_root / "metadata.json"),
            is_active=True,
            trained_at=trained_at,
        )
        db.add(row)
        created.append(model_type)

    try:
        db.add(
            AuditLog(
                user_email=admin.email,
                action="model_registry_sync",
                details=json.dumps({"version": version, "created": created}),
            )
        )
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to write model registry")

    return {"status": "ok", "version": version, "created": created}
