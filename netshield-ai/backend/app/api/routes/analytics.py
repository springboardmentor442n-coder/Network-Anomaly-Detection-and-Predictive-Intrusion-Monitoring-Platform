"""Analytics routes."""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database.session import get_db
from app.database.models import TrafficRecord, Alert, Incident, ModelRun, User
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    total_traffic = db.query(TrafficRecord).filter(TrafficRecord.created_at >= since).count()
    malicious = db.query(TrafficRecord).filter(
        TrafficRecord.is_malicious == True, TrafficRecord.created_at >= since
    ).count()
    total_alerts = db.query(Alert).filter(Alert.created_at >= since).count()
    critical_alerts = db.query(Alert).filter(
        Alert.risk_level == "Critical", Alert.created_at >= since
    ).count()

    return {
        "period_days": days,
        "total_traffic": total_traffic,
        "malicious_traffic": malicious,
        "benign_traffic": total_traffic - malicious,
        "total_alerts": total_alerts,
        "critical_alerts": critical_alerts,
        "detection_rate": round(malicious / total_traffic * 100, 1) if total_traffic > 0 else 0,
    }


@router.get("/traffic-trend")
async def get_traffic_trend(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    records = db.query(TrafficRecord).filter(TrafficRecord.created_at >= since).all()

    # Group by day
    buckets = {}
    for r in records:
        day_key = r.created_at.strftime("%Y-%m-%d")
        if day_key not in buckets:
            buckets[day_key] = {"date": day_key, "total": 0, "malicious": 0, "benign": 0}
        buckets[day_key]["total"] += 1
        if r.is_malicious:
            buckets[day_key]["malicious"] += 1
        else:
            buckets[day_key]["benign"] += 1

    return sorted(buckets.values(), key=lambda x: x["date"])


@router.get("/attack-distribution")
async def get_attack_distribution(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    results = (
        db.query(Alert.attack_type, func.count(Alert.id).label("count"))
        .filter(Alert.created_at >= since)
        .group_by(Alert.attack_type)
        .order_by(func.count(Alert.id).desc())
        .all()
    )
    return [{"attack_type": r[0], "count": r[1]} for r in results]


@router.get("/risk-distribution")
async def get_risk_distribution(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    results = (
        db.query(Alert.risk_level, func.count(Alert.id).label("count"))
        .filter(Alert.created_at >= since)
        .group_by(Alert.risk_level)
        .all()
    )
    return [{"risk_level": r[0], "count": r[1]} for r in results]


@router.get("/top-source-ips")
async def get_top_source_ips(
    limit: int = 10,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    results = (
        db.query(
            Alert.source_ip,
            func.count(Alert.id).label("total_alerts"),
            func.avg(Alert.risk_score).label("avg_risk"),
            func.max(Alert.risk_score).label("max_risk"),
        )
        .filter(Alert.source_ip != None, Alert.created_at >= since)
        .group_by(Alert.source_ip)
        .order_by(func.count(Alert.id).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "ip": r[0],
            "total_alerts": r[1],
            "avg_risk": round(float(r[2]), 1),
            "max_risk": r[3],
        }
        for r in results
    ]


@router.get("/protocol-distribution")
async def get_protocol_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(TrafficRecord.protocol, func.count(TrafficRecord.id).label("count"))
        .filter(TrafficRecord.protocol != None)
        .group_by(TrafficRecord.protocol)
        .order_by(func.count(TrafficRecord.id).desc())
        .limit(10)
        .all()
    )
    return [{"protocol": r[0], "count": r[1]} for r in results]
