"""Audit logs routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database.session import get_db
from app.database.models import AuditLog, User
from app.api.deps import require_analyst

router = APIRouter()


def _format_resource(log: AuditLog) -> Optional[str]:
    """Derive a human-readable resource description from audit record metadata without inventing data."""
    if log.details and isinstance(log.details, dict):
        if "filename" in log.details and log.details["filename"]:
            return f"Dataset ({log.details['filename']})"
        if "title" in log.details and log.details["title"]:
            return f"Incident: {log.details['title']}"
        if "reason" in log.details and log.details["reason"]:
            return f"Auth: {log.details['reason']}"

    if log.resource_type and log.resource_id:
        short_id = str(log.resource_id)[:8] if len(str(log.resource_id)) >= 8 else str(log.resource_id)
        res_name = log.resource_type.replace("_", " ").title()
        return f"{res_name} #{short_id}"

    if log.resource_type:
        return log.resource_type.replace("_", " ").title()

    if log.resource_id:
        short_id = str(log.resource_id)[:8] if len(str(log.resource_id)) >= 8 else str(log.resource_id)
        return f"Resource #{short_id}"

    if log.action in ("LOGIN", "LOGOUT"):
        return "User Session"
    if log.action == "LOGIN_FAILED":
        return "Auth Portal"

    return None


@router.get("/")
async def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search across action, username, IP, or resource"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """List system audit logs and security events with normalized metadata fields."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action.strip())

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(term),
                AuditLog.username.ilike(term),
                AuditLog.ip_address.ilike(term),
                AuditLog.resource_type.ilike(term),
                AuditLog.resource_id.ilike(term),
                AuditLog.result.ilike(term),
            )
        )

    total = query.count()
    logs = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    items = []
    for log in logs:
        actor_name = log.username or (log.user.username if log.user else None)
        iso_time = log.created_at.isoformat() if log.created_at else None
        formatted_time = log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None
        resource_desc = _format_resource(log)

        items.append({
            # Original schema fields
            "id": log.id,
            "user_id": log.user_id,
            "username": actor_name,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "result": log.result,
            "details": log.details,
            "created_at": iso_time,

            # Standardized mapped fields for frontend tables & common variations
            "timestamp": formatted_time or iso_time,
            "user": actor_name,
            "actor": actor_name,
            "service": actor_name or "System",
            "resource": resource_desc,
            "ip": log.ip_address,
            "status": log.result,
        })

    return {
        "total": total,
        "items": items,
    }
