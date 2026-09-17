"""
Threat Intelligence API Routes.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.errors import ValidationError
from ..database import get_db
from ..models import Detection, User
from ..schemas import ThreatIndicatorResponse
from ..services import threat_intelligence_service as tis
from ..services.threat_intelligence_service import ThreatIntelligenceService
from .dependencies import admin_user, current_user

router = APIRouter(prefix="/api/threat-intel", tags=["threat-intelligence"])


class IndicatorCreateRequest(BaseModel):
    indicator_type: str = Field(description="IP, DOMAIN, HASH or URL")
    indicator_value: str = Field(min_length=1)
    threat_level: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None


@router.get("/status")
def provider_status(user: User = Depends(current_user)):
    """
    Report the configured provider.

    When no external provider is configured this returns
    ``provider_configured: false`` - the platform never fabricates reputation.
    """
    return tis.configuration_status()


@router.get("/lookup/{ip}")
def lookup_ip(ip: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """
    Look up an IP's reputation.

    An address with no local record and no external provider returns
    ``status: "unknown"`` with ``is_malicious: null`` - never a guessed verdict.
    """
    try:
        return tis.lookup_ip(db, ip).to_dict()
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)


@router.post("/detections/{detection_id}/enrich")
def enrich_detection(
    detection_id: int,
    ips: List[str] = Query(default=[], description="IPs to check for this detection"),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Check IPs associated with a detection and persist the results."""
    detection = db.query(Detection).filter(Detection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail=f"Detection not found: {detection_id}")

    records = tis.enrich_detection(db, detection_id, ips)
    return {
        "detection_id": detection_id,
        "checked": len(records),
        "results": [
            {
                "id": record.id,
                "ip_address": record.ip_address,
                "is_malicious": record.is_malicious,
                "threat_level": record.threat_level,
                "provider": record.provider,
            }
            for record in records
        ],
    }


@router.get("/indicators")
def list_indicators(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    indicator_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List locally curated indicators of compromise."""
    total, rows = ThreatIntelligenceService.list_indicators(
        db, indicator_type=indicator_type, limit=limit, offset=offset
    )
    return {
        "total": total,
        "indicators": [ThreatIndicatorResponse.model_validate(row) for row in rows],
    }


@router.post("/indicators", response_model=ThreatIndicatorResponse, status_code=201)
def create_indicator(
    request: IndicatorCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Add or update a local indicator (admin only)."""
    try:
        indicator = ThreatIntelligenceService.upsert_indicator(
            db,
            indicator_type=request.indicator_type,
            indicator_value=request.indicator_value,
            threat_level=request.threat_level,
            description=request.description,
            source=request.source,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    return ThreatIndicatorResponse.model_validate(indicator)


@router.delete("/indicators/{indicator_id}")
def delete_indicator(
    indicator_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_user),
):
    """Remove a local indicator (admin only)."""
    if not ThreatIntelligenceService.delete_indicator(db, indicator_id):
        raise HTTPException(status_code=404, detail=f"Indicator not found: {indicator_id}")
    return {"status": "ok", "deleted": indicator_id}
