"""
NETSHIELD AI - ML Trainer
Trains Random Forest on CICIDS2017 dataset and saves model artifacts.
"""
import os
import json
import time
import logging
import joblib
import numpy as np
from datetime import datetime
from typing import Dict, Optional, Callable
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
from app.core.config import settings
from app.ml.preprocessing import load_and_preprocess_for_training

logger = logging.getLogger(__name__)


def train_cicids2017_model(
    filepath: str,
    model_run_id: str,
    test_size: float = 0.2,
    random_seed: int = 42,
    progress_callback: Optional[Callable] = None,
) -> Dict:
    """
    Train Random Forest on CICIDS2017 dataset.
    Returns a dict with all training results.
    """
    model_dir = settings.MODEL_DIR
    os.makedirs(model_dir, exist_ok=True)

    result = {
        "success": False,
        "error": None,
        "model_path": None,
        "accuracy": None,
        "precision_macro": None,
        "recall_macro": None,
        "f1_macro": None,
        "f1_weighted": None,
        "training_samples": None,
        "test_samples": None,
        "num_features": None,
        "num_classes": None,
        "training_time_seconds": None,
        "class_report": None,
        "confusion_matrix": None,
        "class_names": None,
        "feature_names": None,
    }

    try:
        if progress_callback:
            progress_callback("Loading and preprocessing dataset...", 5)

        start_time = time.time()

        # Load and preprocess
        (
            X_train, X_test, y_train, y_test,
            feature_names, label_encoder, preprocessing_pipeline
        ) = load_and_preprocess_for_training(filepath, test_size, random_seed)

        if progress_callback:
            progress_callback("Training Random Forest classifier...", 30)

        result["training_samples"] = len(X_train)
        result["test_samples"] = len(X_test)
        result["num_features"] = len(feature_names)
        result["num_classes"] = len(label_encoder.classes_)
        result["class_names"] = list(label_encoder.classes_)
        result["feature_names"] = feature_names

        logger.info(f"Training RF: {len(X_train)} samples, {len(feature_names)} features, {len(label_encoder.classes_)} classes")

        # Train Random Forest
        clf = RandomForestClassifier(
            n_estimators=100,
            random_state=random_seed,
            n_jobs=-1,
            class_weight="balanced",
        )
        clf.fit(X_train, y_train)

        if progress_callback:
            progress_callback("Evaluating model...", 75)

        # Evaluate
        y_pred = clf.predict(X_test)
        y_pred_proba = clf.predict_proba(X_test)

        accuracy = float(accuracy_score(y_test, y_pred))
        precision_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
        recall_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
        f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
        f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

        cm = confusion_matrix(y_test, y_pred)
        class_report = classification_report(
            y_test, y_pred,
            target_names=label_encoder.classes_,
            output_dict=True,
            zero_division=0
        )

        training_time = time.time() - start_time

        result.update({
            "accuracy": accuracy,
            "precision_macro": precision_macro,
            "recall_macro": recall_macro,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "training_time_seconds": training_time,
            "class_report": class_report,
            "confusion_matrix": cm.tolist(),
        })

        if progress_callback:
            progress_callback("Saving model artifacts...", 90)

        # Save model artifacts
        model_path = os.path.join(model_dir, f"cicids2017_model_{model_run_id}.pkl")
        pipeline_path = os.path.join(model_dir, f"preprocessing_pipeline_{model_run_id}.pkl")
        encoder_path = os.path.join(model_dir, f"label_encoder_{model_run_id}.pkl")
        metadata_path = os.path.join(model_dir, f"model_metadata_{model_run_id}.json")

        joblib.dump(clf, model_path)
        joblib.dump(preprocessing_pipeline, pipeline_path)
        joblib.dump(label_encoder, encoder_path)

        metadata = {
            "model_run_id": model_run_id,
            "algorithm": "RandomForestClassifier",
            "dataset": "CICIDS2017",
            "trained_at": datetime.utcnow().isoformat(),
            "accuracy": accuracy,
            "precision_macro": precision_macro,
            "recall_macro": recall_macro,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "num_features": len(feature_names),
            "num_classes": len(label_encoder.classes_),
            "class_names": list(label_encoder.classes_),
            "feature_names": feature_names,
            "training_time_seconds": training_time,
            "random_seed": random_seed,
            "test_size": test_size,
            "model_path": model_path,
            "pipeline_path": pipeline_path,
            "encoder_path": encoder_path,
        }
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        result["model_path"] = model_path
        result["success"] = True

        if progress_callback:
            progress_callback("Training complete!", 100)

        logger.info(f"Model trained successfully. Accuracy: {accuracy:.4f}")

    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        result["error"] = str(e)

    return result
