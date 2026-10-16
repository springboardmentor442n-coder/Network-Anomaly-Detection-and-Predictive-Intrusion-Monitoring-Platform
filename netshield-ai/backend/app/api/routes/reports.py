"""Reports routes."""
import csv
import json
import io
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.database.models import TrafficRecord, Alert, Incident, ModelRun, User
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/summary")
async def get_report_summary(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    total_traffic = db.query(TrafficRecord).filter(TrafficRecord.created_at >= since).count()
    malicious = db.query(TrafficRecord).filter(TrafficRecord.is_malicious == True, TrafficRecord.created_at >= since).count()
    total_alerts = db.query(Alert).filter(Alert.created_at >= since).count()
    critical_alerts = db.query(Alert).filter(Alert.risk_level == "Critical", Alert.created_at >= since).count()

    attack_dist = (
        db.query(Alert.attack_type, func.count(Alert.id).label("count"))
        .filter(Alert.created_at >= since)
        .group_by(Alert.attack_type)
        .order_by(func.count(Alert.id).desc())
        .all()
    )

    active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()

    return {
        "report_generated_at": datetime.utcnow().isoformat(),
        "period_days": days,
        "period_start": since.isoformat(),
        "period_end": datetime.utcnow().isoformat(),
        "executive_summary": {
            "total_traffic": total_traffic,
            "malicious_traffic": malicious,
            "benign_traffic": total_traffic - malicious,
            "detection_rate": round(malicious / total_traffic * 100, 1) if total_traffic > 0 else 0,
            "total_alerts": total_alerts,
            "critical_alerts": critical_alerts,
        },
        "attack_distribution": [{"attack_type": r[0], "count": r[1]} for r in attack_dist],
        "model_performance": {
            "model_name": active_model.name if active_model else "N/A",
            "accuracy": active_model.accuracy if active_model else None,
            "f1_weighted": active_model.f1_weighted if active_model else None,
            "status": active_model.status if active_model else "No active model",
        },
    }


@router.get("/export/csv")
async def export_alerts_csv(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    alerts = db.query(Alert).filter(Alert.created_at >= since).order_by(Alert.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Alert ID", "Timestamp", "Source IP", "Destination IP", "Port",
        "Attack Type", "Confidence", "Risk Score", "Risk Level", "Status",
    ])
    for a in alerts:
        writer.writerow([
            a.id, a.timestamp, a.source_ip, a.destination_ip, a.destination_port,
            a.attack_type, a.confidence, a.risk_score, a.risk_level, a.status,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=netshield_alerts_{datetime.utcnow().strftime('%Y%m%d')}.csv"},
    )


@router.get("/export/json")
async def export_report_json(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = await get_report_summary(days=days, db=db, current_user=current_user)
    report_json = json.dumps(report, indent=2, default=str)
    return StreamingResponse(
        iter([report_json]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=netshield_report_{datetime.utcnow().strftime('%Y%m%d')}.json"},
    )
