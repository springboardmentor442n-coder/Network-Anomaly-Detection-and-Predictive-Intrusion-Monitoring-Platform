"""Threat Intelligence routes."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import ThreatIntelligence, User
from app.api.deps import get_current_user

router = APIRouter()

# Demo threat intelligence data (clearly labeled)
DEMO_THREAT_INTEL = [
    {"indicator_type": "IP", "indicator_value": "192.168.1.100", "threat_category": "Port Scanner", "severity": "Medium", "confidence": 0.75, "source": "DEMO DATA"},
    {"indicator_type": "IP", "indicator_value": "10.0.0.50", "threat_category": "DDoS Botnet", "severity": "High", "confidence": 0.88, "source": "DEMO DATA"},
    {"indicator_type": "IP", "indicator_value": "172.16.0.200", "threat_category": "Brute Force", "severity": "Medium", "confidence": 0.82, "source": "DEMO DATA"},
    {"indicator_type": "IP", "indicator_value": "203.0.113.15", "threat_category": "Malware C2", "severity": "Critical", "confidence": 0.95, "source": "DEMO DATA"},
    {"indicator_type": "IP", "indicator_value": "198.51.100.8", "threat_category": "Web Attack", "severity": "High", "confidence": 0.79, "source": "DEMO DATA"},
]


@router.get("/")
async def get_threat_intelligence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get threat intelligence indicators."""
    # Check DB for real data
    db_intel = db.query(ThreatIntelligence).limit(100).all()

    if db_intel:
        items = [
            {
                "id": t.id,
                "indicator_type": t.indicator_type,
                "indicator_value": t.indicator_value,
                "threat_category": t.threat_category,
                "severity": t.severity,
                "confidence": t.confidence,
                "source": t.source,
                "is_demo": t.is_demo,
                "description": t.description,
                "last_seen": t.last_seen.isoformat() if t.last_seen else None,
            }
            for t in db_intel
        ]
        return {"is_demo": any(t.is_demo for t in db_intel), "items": items}

    # Return demo data (clearly labeled)
    return {
        "is_demo": True,
        "demo_notice": "DEMO DATA - These are demonstration indicators. Connect real threat intel feeds via the API.",
        "items": [
            {**item, "is_demo": True, "id": f"demo-{i}"}
            for i, item in enumerate(DEMO_THREAT_INTEL)
        ],
    }


@router.get("/suspicious-ips")
async def get_suspicious_ips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get IPs from threat intelligence (demo)."""
    return {
        "is_demo": True,
        "items": [
            {"ip": item["indicator_value"], "category": item["threat_category"],
             "severity": item["severity"], "is_demo": True}
            for item in DEMO_THREAT_INTEL
            if item["indicator_type"] == "IP"
        ],
    }
