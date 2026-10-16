"""
NETSHIELD AI - ML Model Auto-Loader
Ensures a trained CICIDS2017 model is loaded into memory on application startup.
"""
import os
import json
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import SessionLocal
from app.database.models import ModelRun
from app.ml.predictor import load_predictor, get_active_predictor, ModelPredictor

logger = logging.getLogger(__name__)


def _resolve_path(path: Optional[str], default_dir: str, default_filename: str) -> str:
    if path and os.path.exists(path):
        return os.path.abspath(path)
    if path:
        candidate = os.path.join(default_dir, os.path.basename(path))
        if os.path.exists(candidate):
            return os.path.abspath(candidate)
    return os.path.abspath(os.path.join(default_dir, default_filename))


def ensure_active_model_loaded(db: Optional[Session] = None) -> Optional[ModelPredictor]:
    """
    Ensure an active trained CICIDS2017 model is loaded in memory.
    If no model is currently marked active in the DB, it activates the best ready model
    (such as cicids2017_baseline_primary) and loads it.
    """
    existing_predictor = get_active_predictor()
    if existing_predictor is not None:
        return existing_predictor

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        model_dir = os.path.abspath(settings.RESOLVED_MODEL_DIR)
        os.makedirs(model_dir, exist_ok=True)

        # 1. Check for an active model in DB whose files exist
        active_model = db.query(ModelRun).filter(ModelRun.is_active == True).first()
        target_model = None

        if active_model:
            model_path = _resolve_path(active_model.model_path, model_dir, f"cicids2017_model_{active_model.id}.pkl")
            pipeline_path = _resolve_path(None, model_dir, f"preprocessing_pipeline_{active_model.id}.pkl")
            encoder_path = _resolve_path(None, model_dir, f"label_encoder_{active_model.id}.pkl")
            if os.path.exists(model_path) and os.path.exists(pipeline_path) and os.path.exists(encoder_path):
                target_model = active_model
            else:
                logger.warning(f"Active model {active_model.id} files missing on disk. Searching for fallback.")
                active_model.is_active = False
                db.commit()

        # 2. If no valid active model, check for cicids2017_baseline_primary in DB or metadata file
        if not target_model:
            baseline_run = db.query(ModelRun).filter(ModelRun.id == "cicids2017_baseline_primary").first()
            baseline_meta_file = os.path.join(model_dir, "model_metadata_cicids2017_baseline_primary.json")
            baseline_pkl = os.path.join(model_dir, "cicids2017_model_cicids2017_baseline_primary.pkl")

            if not baseline_run and os.path.exists(baseline_meta_file) and os.path.exists(baseline_pkl):
                try:
                    with open(baseline_meta_file, "r") as f:
                        meta = json.load(f)
                    baseline_run = ModelRun(
                        id="cicids2017_baseline_primary",
                        name="CICIDS2017 Random Forest Baseline",
                        algorithm=meta.get("algorithm", "RandomForestClassifier"),
                        dataset=meta.get("dataset", "CICIDS2017"),
                        version="1.0.0",
                        status="READY",
                        is_active=False,
                        accuracy=meta.get("accuracy"),
                        precision_macro=meta.get("precision_macro"),
                        recall_macro=meta.get("recall_macro"),
                        f1_macro=meta.get("f1_macro"),
                        f1_weighted=meta.get("f1_weighted"),
                        training_samples=meta.get("training_samples"),
                        test_samples=meta.get("test_samples"),
                        num_features=meta.get("num_features"),
                        num_classes=meta.get("num_classes"),
                        class_names=meta.get("class_names"),
                        feature_names=meta.get("feature_names"),
                        confusion_matrix=meta.get("confusion_matrix"),
                        class_report=meta.get("class_report"),
                        model_path=baseline_pkl,
                    )
                    db.add(baseline_run)
                    db.commit()
                    db.refresh(baseline_run)
                    logger.info("Registered cicids2017_baseline_primary in DB from metadata file.")
                except Exception as ex:
                    logger.error(f"Failed to register baseline from metadata: {ex}")

            if baseline_run:
                target_model = baseline_run

        # 3. If still no target, pick any READY model with files on disk
        if not target_model:
            candidate_models = db.query(ModelRun).filter(ModelRun.status.in_(["READY", "ACTIVE"])).all()
            for cand in candidate_models:
                m_path = cand.model_path or os.path.join(model_dir, f"cicids2017_model_{cand.id}.pkl")
                p_path = os.path.join(model_dir, f"preprocessing_pipeline_{cand.id}.pkl")
                e_path = os.path.join(model_dir, f"label_encoder_{cand.id}.pkl")
                if os.path.exists(m_path) and os.path.exists(p_path) and os.path.exists(e_path):
                    target_model = cand
                    break

        if not target_model:
            logger.warning("No trained CICIDS2017 model available on disk to load.")
            return None

        # Activate target_model
        db.query(ModelRun).filter(ModelRun.id != target_model.id).update({"is_active": False})
        target_model.is_active = True
        target_model.status = "ACTIVE"
        db.commit()

        # Load predictor into memory
        model_path = _resolve_path(target_model.model_path, model_dir, f"cicids2017_model_{target_model.id}.pkl")
        pipeline_path = _resolve_path(None, model_dir, f"preprocessing_pipeline_{target_model.id}.pkl")
        encoder_path = _resolve_path(None, model_dir, f"label_encoder_{target_model.id}.pkl")

        predictor = load_predictor(
            model_run_id=target_model.id,
            model_path=model_path,
            pipeline_path=pipeline_path,
            encoder_path=encoder_path,
            feature_names=target_model.feature_names or [],
        )

        logger.info(f"✅ Successfully loaded and activated model: {target_model.name} (ID: {target_model.id}) with {len(target_model.feature_names or [])} features.")
        return predictor

    except Exception as e:
        logger.error(f"Error loading active model: {e}", exc_info=True)
        return None
    finally:
        if close_db:
            db.close()
