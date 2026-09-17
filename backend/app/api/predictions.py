"""
Prediction & Detection API Routes.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.errors import ModelError, ValidationError
from ..database import get_db
from ..ml.risk import explain as explain_risk, policy as risk_policy
from ..models import Detection, User
from ..schemas import PredictionRequest
from ..services import MLService, PredictionService
from .dependencies import current_user

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

_ml_service = MLService(settings.model_root)
_prediction_service = PredictionService(_ml_service)


class ExplainRequest(BaseModel):
    is_anomaly: bool
    attack_probability: float
    confidence: float
    prediction: str


class PredictWithContextRequest(PredictionRequest):
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None


@router.post("")
def predict(
    request: PredictWithContextRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """
    Analyze a flow.

    Runs classification and anomaly detection, computes the risk score, persists
    a detection, raises an alert when the score crosses the configured threshold,
    dispatches severity-routed notifications, publishes a real-time event and
    writes an audit entry.

    The response includes a full ``explanation`` object breaking the risk score
    into its contributing terms.
    """
    try:
        return _prediction_service.predict(
            db,
            request.features,
            user.email,
            source_ip=request.source_ip,
            destination_ip=request.destination_ip,
            origin="manual",
        )
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    except ModelError as exc:
        raise HTTPException(status_code=503, detail=exc.message)


@router.post("/explain")
def explain(request: ExplainRequest, user: User = Depends(current_user)):
    """
    Break a risk score into its components without running the model.

    Useful for showing an analyst how the score would change under different
    inputs. Uses the same code path as scoring, so it cannot drift.
    """
    return explain_risk(
        request.is_anomaly,
        request.attack_probability,
        request.confidence,
        request.prediction,
    )


@router.get("/risk-policy")
def get_risk_policy(user: User = Depends(current_user)):
    """Current risk-scoring weights and severity thresholds."""
    return risk_policy()


@router.get("/model-info")
def get_model_info(user: User = Depends(current_user)):
    """Model metadata: version, dataset, classes, features, metrics."""
    return _ml_service.get_model_info()


@router.get("/metrics")
def get_model_metrics(user: User = Depends(current_user)):
    """Model evaluation metrics recorded at training time."""
    return _ml_service.get_model_metrics()


@router.get("/features")
def get_expected_features(user: User = Depends(current_user)):
    """
    The feature names the active model expects, grouped for the prediction form.

    The UI uses this to render a grouped, validated input form instead of a flat
    wall of 80+ fields.
    """
    metadata = _ml_service.get_model_info()
    if metadata.get("status") == "not_trained":
        raise HTTPException(
            status_code=503,
            detail="No trained model found. Run 'python -m backend.scripts.train_models'.",
        )

    identity = {
        "id",
        "Flow ID",
        "Timestamp",
        "Src IP",
        "Dst IP",
        "Source IP",
        "Destination IP",
    }
    features: List[str] = [
        name for name in (metadata.get("features") or []) if name not in identity
    ]

    groups: Dict[str, List[str]] = {
        "Identity & ports": [],
        "Flow timing": [],
        "Packet counts": [],
        "Packet sizes": [],
        "TCP flags": [],
        "Throughput": [],
        "Bulk & subflow": [],
        "Idle / active": [],
        "Other": [],
    }

    for name in features:
        lowered = name.lower()
        if any(token in lowered for token in ("port", "protocol")):
            groups["Identity & ports"].append(name)
        elif "iat" in lowered or "duration" in lowered:
            groups["Flow timing"].append(name)
        elif "flag" in lowered:
            groups["TCP flags"].append(name)
        elif "/s" in lowered or "rate" in lowered:
            groups["Throughput"].append(name)
        elif "bulk" in lowered or "subflow" in lowered:
            groups["Bulk & subflow"].append(name)
        elif "idle" in lowered or "active" in lowered:
            groups["Idle / active"].append(name)
        elif "packet" in lowered and ("count" in lowered or "total" in lowered):
            groups["Packet counts"].append(name)
        elif "length" in lowered or "size" in lowered or "packet" in lowered:
            groups["Packet sizes"].append(name)
        else:
            groups["Other"].append(name)

    return {
        "feature_count": len(features),
        "features": features,
        "groups": {name: items for name, items in groups.items() if items},
        "note": (
            "All listed features are required for scoring. Use "
            "GET /api/monitoring/sample-flow to load a real example row."
        ),
    }


@router.get("/status")
def get_prediction_status(user: User = Depends(current_user)):
    """Whether the ML pipeline can serve predictions right now."""
    ready = _ml_service.is_ready()
    return {
        "ready": ready,
        "alert_threshold": _prediction_service.alert_threshold,
        "model_info": _ml_service.get_model_info() if ready else {"status": "not_trained"},
    }


@router.get("/detections")
def list_detections(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List stored detections, newest first."""
    query = db.query(Detection)
    if severity:
        query = query.filter(Detection.severity == severity.upper())
    total = query.count()
    rows = (
        query.order_by(Detection.created_at.desc()).offset(offset).limit(limit).all()
    )
    return {
        "total": total,
        "detections": [
            {
                "id": row.id,
                "prediction": row.prediction,
                "confidence": row.confidence,
                "risk_score": row.risk_score,
                "severity": row.severity,
                "is_anomaly": row.is_anomaly,
                "created_at": row.created_at,
            }
            for row in rows
        ],
    }


@router.get("/detections/{detection_id}")
def get_detection(
    detection_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """One detection, including the feature vector that produced it."""
    row = db.query(Detection).filter(Detection.id == detection_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Detection not found: {detection_id}")
    return {
        "id": row.id,
        "prediction": row.prediction,
        "confidence": row.confidence,
        "risk_score": row.risk_score,
        "severity": row.severity,
        "is_anomaly": row.is_anomaly,
        "features_json": row.features_json,
        "created_at": row.created_at,
    }
