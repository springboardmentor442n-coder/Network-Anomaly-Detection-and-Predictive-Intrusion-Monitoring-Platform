"""
Network Monitoring API Routes.

Exposes the NetworkDataSource abstraction: which sources exist, which are
usable on this host, and a scan endpoint that pulls flows and runs them through
the detection pipeline.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.errors import NotFoundError, ValidationError
from ..database import get_db
from ..models import User
from ..monitoring import registry
from ..services import MLService, MonitoringService, PredictionService
from .dependencies import current_user

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

_ml_service = MLService(settings.model_root)
_monitoring_service = MonitoringService(PredictionService(_ml_service))


@router.get("/sources")
def list_sources(user: User = Depends(current_user)):
    """
    List every monitoring data source with its availability.

    Unavailable sources include a human-readable reason (missing dataset,
    capture disabled, Npcap absent, Zeek not configured) instead of failing.
    """
    return _monitoring_service.sources_status()


@router.get("/sources/{source_name}")
def get_source(source_name: str, user: User = Depends(current_user)):
    """Detailed status for one source."""
    source = registry.get(source_name)
    if source is None:
        raise HTTPException(status_code=404, detail=f"Unknown data source: {source_name}")
    return source.status().to_dict()


@router.get("/sample-flow")
def sample_flow(
    source: str = Query("csv_replay"),
    user: User = Depends(current_user),
):
    """
    One real flow from the dataset, usable as prediction input.

    Powers the "load example data" action in the prediction UI so an analyst
    never has to hand-enter the full feature vector.
    """
    try:
        return MonitoringService.sample_features(source)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message)
    except ValidationError as exc:
        raise HTTPException(status_code=409, detail=exc.message)


@router.post("/scan")
def scan(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    source: str = Query("csv_replay", description="Data source name"),
    limit: int = Query(10, ge=1, le=200),
    persist: bool = Query(True, description="Persist a TrafficRecord per flow"),
    notify: bool = Query(True, description="Dispatch notifications for new alerts"),
):
    """
    Pull flows from a source and analyze them.

    Flows whose source cannot supply the full trained feature set are recorded
    and returned with ``scored: false`` plus the missing feature list, rather
    than being scored against a padded vector.
    """
    try:
        return _monitoring_service.scan(
            db,
            source_name=source,
            limit=limit,
            user_email=user.email,
            persist_traffic=persist,
            notify=notify,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message)
    except ValidationError as exc:
        raise HTTPException(status_code=409, detail=exc.message)


@router.post("/replay/reset")
def reset_replay(user: User = Depends(current_user)):
    """Rewind the CSV replay cursor to the start of the corpus."""
    source = registry.get("csv_replay")
    if source is None:
        raise HTTPException(status_code=404, detail="csv_replay source is not registered")
    source.reset()
    return {"status": "ok", "cursor": source.cursor}
