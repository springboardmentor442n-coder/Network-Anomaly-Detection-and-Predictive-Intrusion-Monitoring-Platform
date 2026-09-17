"""
Backwards-compatible aliases for the pre-2.0 API surface.

The original MVP exposed these paths and the shipped vanilla-JS dashboard calls
them. They are kept working so no existing client breaks, and they delegate to
the same services as the new routes rather than duplicating logic.

  GET  /api/ml/model-info      -> /api/predictions/model-info
  GET  /api/ml/metrics         -> /api/predictions/metrics
  POST /api/ml/predict         -> /api/predictions
  GET  /api/traffic/analytics  -> /api/analytics/traffic
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.errors import ModelError, ValidationError
from ..database import get_db
from ..models import User
from ..schemas import PredictionRequest
from ..services import AnalyticsService, MLService, PredictionService
from .dependencies import current_user

router = APIRouter(prefix="/api", tags=["legacy"], include_in_schema=False)

_ml_service = MLService(settings.model_root)
_prediction_service = PredictionService(_ml_service)
_analytics_service = AnalyticsService(settings.data_root)


@router.get("/ml/model-info", deprecated=True)
def legacy_model_info(user: User = Depends(current_user)):
    """Deprecated: use GET /api/predictions/model-info."""
    return _ml_service.get_model_info()


@router.get("/ml/metrics", deprecated=True)
def legacy_metrics(user: User = Depends(current_user)):
    """Deprecated: use GET /api/predictions/metrics."""
    return _ml_service.get_model_metrics()


@router.post("/ml/predict", deprecated=True)
def legacy_predict(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Deprecated: use POST /api/predictions."""
    try:
        result = _prediction_service.predict(db, request.features, user.email)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.message)
    except ModelError as exc:
        raise HTTPException(status_code=503, detail=exc.message)

    # Original response shape.
    return {
        "prediction": result["prediction"],
        "is_anomaly": result["is_anomaly"],
        "confidence": result["confidence"],
        "attack_probability": result["attack_probability"],
        "risk_score": result["risk_score"],
        "severity": result["severity"],
    }


@router.get("/traffic/analytics", deprecated=True)
def legacy_traffic_analytics(user: User = Depends(current_user)):
    """Deprecated: use GET /api/analytics/traffic."""
    analytics = _analytics_service.get_traffic_analytics()
    analytics["model_ready"] = _ml_service.is_ready()
    return analytics
