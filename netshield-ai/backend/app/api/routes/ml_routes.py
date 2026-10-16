"""ML routes - training, model management, prediction."""
import os
import asyncio
import logging
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import ModelRun, User, AuditLog
from app.api.deps import get_current_user, require_analyst
from app.ml.trainer import train_cicids2017_model
from app.ml.predictor import load_predictor, get_active_predictor
from app.risk.scorer import compute_risk_score
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class TrainRequest(BaseModel):
    filename: str
    test_size: float = 0.2
    random_seed: int = 42


class PredictRequest(BaseModel):
    features: Dict[str, float]


@router.post("/train")
async def train_model(
    body: TrainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Start model training in background."""
    data_dir = settings.DATA_DIR
    filepath = os.path.join(data_dir, body.filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Dataset file not found: {body.filename}")

    # Create model run record
    version = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    model_run = ModelRun(
        name=f"CICIDS2017_RF_{version}",
        algorithm="RandomForestClassifier",
        dataset="CICIDS2017",
        version=version,
        status="TRAINING",
        trained_by=current_user.id,
    )
    db.add(model_run)
    db.commit()
    db.refresh(model_run)

    model_run_id = model_run.id

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="MODEL_TRAINING_STARTED",
        resource_type="model_run",
        resource_id=model_run_id,
        result="SUCCESS",
        details={"filename": body.filename, "version": version},
    )
    db.add(log)
    db.commit()

    # Run training in background
    background_tasks.add_task(
        _run_training_background,
        model_run_id=model_run_id,
        filepath=filepath,
        test_size=body.test_size,
        random_seed=body.random_seed,
    )

    return {
        "model_run_id": model_run_id,
        "status": "TRAINING",
        "message": "Training started in background.",
        "version": version,
    }


async def _run_training_background(model_run_id: str, filepath: str, test_size: float, random_seed: int):
    """Background task for model training."""
    from app.database.session import SessionLocal
    db = SessionLocal()
    try:
        result = train_cicids2017_model(filepath, model_run_id, test_size, random_seed)

        model_run = db.query(ModelRun).filter(ModelRun.id == model_run_id).first()
        if not model_run:
            return

        if result["success"]:
            model_run.status = "READY"
            model_run.accuracy = result["accuracy"]
            model_run.precision_macro = result["precision_macro"]
            model_run.recall_macro = result["recall_macro"]
            model_run.f1_macro = result["f1_macro"]
            model_run.f1_weighted = result["f1_weighted"]
            model_run.training_samples = result["training_samples"]
            model_run.test_samples = result["test_samples"]
            model_run.num_features = result["num_features"]
            model_run.num_classes = result["num_classes"]
            model_run.training_time_seconds = result["training_time_seconds"]
            model_run.class_report = result["class_report"]
            model_run.confusion_matrix = result["confusion_matrix"]
            model_run.class_names = result["class_names"]
            model_run.feature_names = result["feature_names"]
            model_run.model_path = result["model_path"]
        else:
            model_run.status = "FAILED"
            model_run.error_message = result["error"]

        model_run.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"Training complete: {model_run_id}, success={result['success']}")
    except Exception as e:
        logger.error(f"Background training error: {e}", exc_info=True)
        try:
            model_run = db.query(ModelRun).filter(ModelRun.id == model_run_id).first()
            if model_run:
                model_run.status = "FAILED"
                model_run.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/models/{model_run_id}/activate")
async def activate_model(
    model_run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    """Activate a trained model for predictions."""
    model_run = db.query(ModelRun).filter(ModelRun.id == model_run_id).first()
    if not model_run:
        raise HTTPException(status_code=404, detail="Model not found")
    if model_run.status != "READY":
        raise HTTPException(status_code=400, detail="Model is not in READY state")

    # Deactivate all others
    db.query(ModelRun).filter(ModelRun.is_active == True).update({"is_active": False})

    model_run.is_active = True
    model_run.status = "ACTIVE"
    db.commit()

    # Load into memory
    model_dir = settings.MODEL_DIR
    pipeline_path = os.path.join(model_dir, f"preprocessing_pipeline_{model_run_id}.pkl")
    encoder_path = os.path.join(model_dir, f"label_encoder_{model_run_id}.pkl")

    if not os.path.exists(model_run.model_path):
        raise HTTPException(status_code=500, detail="Model file not found on disk")

    load_predictor(
        model_run_id=model_run_id,
        model_path=model_run.model_path,
        pipeline_path=pipeline_path,
        encoder_path=encoder_path,
        feature_names=model_run.feature_names or [],
    )

    # Audit log
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


@router.get("/status")
async def get_model_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current ML model status."""
    predictor = get_active_predictor()
    active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()

    return {
        "has_active_model": predictor is not None,
        "demo_mode": predictor is None,
        "model_run_id": active_model.id if active_model else None,
        "model_name": active_model.name if active_model else None,
        "accuracy": active_model.accuracy if active_model else None,
        "class_names": active_model.class_names if active_model else None,
    }


@router.post("/predict")
async def predict(
    body: PredictRequest,
    current_user: User = Depends(get_current_user),
):
    """Run a single prediction."""
    predictor = get_active_predictor()
    if not predictor:
        raise HTTPException(status_code=503, detail="No active ML model. Please train and activate a model.")

    import pandas as pd
    df = pd.DataFrame([body.features])
    results = predictor.predict_chunk(df)
    if not results:
        raise HTTPException(status_code=500, detail="Prediction failed")

    pred = results[0]
    risk = compute_risk_score(pred["predicted_class"], pred["confidence"])

    return {
        "predicted_class": pred["predicted_class"],
        "confidence": pred["confidence"],
        "risk_score": risk["final_risk"],
        "risk_label": risk["risk_level"],
        "base_severity": risk["base_severity"],
        "is_mapped": risk["is_mapped"],
    }
