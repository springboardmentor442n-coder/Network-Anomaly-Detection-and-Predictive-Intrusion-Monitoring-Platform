"""Model performance routes."""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.database.session import get_db
from app.database.models import ModelRun, User, AuditLog
from app.api.deps import get_current_user, require_analyst
from app.ml.predictor import get_active_predictor, load_predictor
from app.ml.loader import ensure_active_model_loaded

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


@router.get("/active")
async def get_active_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the currently active trained CICIDS2017 model."""
    active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()
    if not active_model:
        ensure_active_model_loaded(db)
        active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()

    if not active_model:
        raise HTTPException(status_code=404, detail="No active CICIDS2017 model found")

    predictor = get_active_predictor()
    data = _model_dict(active_model, include_details=True)
    data["is_loaded_in_memory"] = predictor is not None
    return data


@router.get("/metrics")
async def get_active_model_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive evaluation metrics and feature importances for the active model."""
    active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()
    if not active_model:
        ensure_active_model_loaded(db)
        active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()

    if not active_model:
        raise HTTPException(status_code=404, detail="No active CICIDS2017 model found")

    # Calculate feature importances if classifier is in memory
    predictor = get_active_predictor()
    feature_importances = []
    if predictor and hasattr(predictor.clf, "feature_importances_") and predictor.feature_names:
        importances = predictor.clf.feature_importances_
        sorted_pairs = sorted(
            zip(predictor.feature_names, importances),
            key=lambda x: x[1],
            reverse=True,
        )
        feature_importances = [
            {"feature": feat, "importance": round(float(imp), 4)}
            for feat, imp in sorted_pairs[:15]
        ]

    return {
        "model_id": active_model.id,
        "name": active_model.name,
        "algorithm": active_model.algorithm,
        "dataset": active_model.dataset,
        "accuracy": active_model.accuracy,
        "precision_macro": active_model.precision_macro,
        "recall_macro": active_model.recall_macro,
        "f1_macro": active_model.f1_macro,
        "f1_weighted": active_model.f1_weighted,
        "training_samples": active_model.training_samples,
        "test_samples": active_model.test_samples,
        "num_features": active_model.num_features,
        "num_classes": active_model.num_classes,
        "class_names": active_model.class_names,
        "confusion_matrix": active_model.confusion_matrix,
        "class_report": active_model.class_report,
        "training_time_seconds": active_model.training_time_seconds,
        "feature_importances": feature_importances,
    }


@router.post("/{model_run_id}/activate")
async def activate_model(
    model_run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Activate a trained model for predictions."""
    model_run = db.query(ModelRun).filter(ModelRun.id == model_run_id).first()
    if not model_run:
        raise HTTPException(status_code=404, detail="Model not found")
    if model_run.status not in ["READY", "ACTIVE"]:
        raise HTTPException(status_code=400, detail="Model is not in READY or ACTIVE state")

    # Deactivate all others
    db.query(ModelRun).filter(ModelRun.is_active == True).update({"is_active": False})

    model_run.is_active = True
    model_run.status = "ACTIVE"
    db.commit()

    # Load into memory
    model_dir = settings.MODEL_DIR
    model_path = model_run.model_path or os.path.join(model_dir, f"cicids2017_model_{model_run_id}.pkl")
    pipeline_path = os.path.join(model_dir, f"preprocessing_pipeline_{model_run_id}.pkl")
    encoder_path = os.path.join(model_dir, f"label_encoder_{model_run_id}.pkl")

    if not os.path.exists(model_path):
        raise HTTPException(status_code=500, detail="Model file not found on disk")

    load_predictor(
        model_run_id=model_run_id,
        model_path=model_path,
        pipeline_path=pipeline_path,
        encoder_path=encoder_path,
        feature_names=model_run.feature_names or [],
    )

    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="MODEL_ACTIVATED",
        resource_type="model_run",
        resource_id=model_run_id,
        result="SUCCESS",
    )
    db.add(log)
    db.commit()

    return {"message": "Model activated successfully", "model_run_id": model_run_id}


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
