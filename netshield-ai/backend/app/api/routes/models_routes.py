"""Model performance routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.database.models import ModelRun, User
from app.api.deps import get_current_user, require_analyst

router = APIRouter()


@router.get("/")
async def list_models(
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    models = db.query(ModelRun).order_by(desc(ModelRun.created_at)).offset(skip).limit(limit).all()
    total = db.query(ModelRun).count()
    return {"total": total, "items": [_model_dict(m) for m in models]}


@router.get("/{model_run_id}")
async def get_model(
    model_run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = db.query(ModelRun).filter(ModelRun.id == model_run_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return _model_dict(model, include_details=True)


@router.get("/{model_run_id}/status")
async def get_model_status(
    model_run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = db.query(ModelRun).filter(ModelRun.id == model_run_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {
        "status": model.status,
        "is_active": model.is_active,
        "accuracy": model.accuracy,
        "training_time": model.training_time_seconds,
        "error_message": model.error_message,
    }


def _model_dict(m: ModelRun, include_details: bool = False) -> dict:
    result = {
        "id": m.id,
        "name": m.name,
        "algorithm": m.algorithm,
        "dataset": m.dataset,
        "version": m.version,
        "status": m.status,
        "is_active": m.is_active,
        "accuracy": m.accuracy,
        "precision_macro": m.precision_macro,
        "recall_macro": m.recall_macro,
        "f1_macro": m.f1_macro,
        "f1_weighted": m.f1_weighted,
        "training_samples": m.training_samples,
        "test_samples": m.test_samples,
        "num_features": m.num_features,
        "num_classes": m.num_classes,
        "training_time_seconds": m.training_time_seconds,
        "class_names": m.class_names,
        "error_message": m.error_message,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }
    if include_details:
        result["class_report"] = m.class_report
        result["confusion_matrix"] = m.confusion_matrix
        result["feature_names"] = m.feature_names
    return result
