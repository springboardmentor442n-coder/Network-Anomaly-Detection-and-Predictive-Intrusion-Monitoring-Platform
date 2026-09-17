"""
ML Detection Service - handles model loading and inference.
"""

import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any

import joblib
import pandas as pd

from ..core.errors import ModelError, ValidationError
from ..ml.risk import calculate_risk

logger = logging.getLogger(__name__)


class DetectionService:
    """
    Manages model loading and inference for network traffic detection.
    Preserved from existing implementation, refactored for clarity.
    """

    def __init__(self, model_root: Path):
        self.model_root = Path(model_root)
        self.classifier_path = self.model_root / "classifier.joblib"
        self.anomaly_path = self.model_root / "anomaly.joblib"
        self.metadata_path = self.model_root / "metadata.json"
        self._classifier = None
        self._anomaly = None
        self._preprocessor = None
        self._metadata = None

    @property
    def ready(self) -> bool:
        """Check if models are available for inference."""
        return self.classifier_path.exists() and self.anomaly_path.exists()

    def metadata(self) -> Dict[str, Any]:
        """Get model metadata without loading models."""
        if not self.metadata_path.exists():
            return {"status": "not_trained"}
        if self._metadata is None:
            try:
                self._metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Failed to load metadata: {e}")
                return {"status": "error", "error": str(e)}
        return self._metadata

    def _load_models(self) -> None:
        """Load models into memory (lazy loading)."""
        if not self.ready:
            raise ModelError(
                "Models are not trained. Run 'python -m backend.scripts.train_models' first.",
                {"model_root": str(self.model_root)}
            )

        if self._classifier is None:
            try:
                self._classifier = joblib.load(self.classifier_path)
                logger.info(f"Loaded classifier from {self.classifier_path}")
            except Exception as e:
                raise ModelError(f"Failed to load classifier: {e}", {"path": str(self.classifier_path)})

        if self._anomaly is None:
            try:
                loaded = joblib.load(self.anomaly_path)
                self._preprocessor, self._anomaly = loaded
                logger.info(f"Loaded anomaly detector from {self.anomaly_path}")
            except Exception as e:
                raise ModelError(f"Failed to load anomaly detector: {e}", {"path": str(self.anomaly_path)})

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make a prediction on provided features.

        Args:
            features: Dictionary of feature names to values

        Returns:
            Dictionary containing prediction, confidence, risk_score, severity, is_anomaly

        Raises:
            ModelError: If models are not ready or prediction fails
            ValidationError: If features are invalid
        """
        if not self.ready:
            raise ModelError(
                "Models are not trained. Run 'python -m backend.scripts.train_models' first."
            )

        if not isinstance(features, dict) or not features:
            raise ValidationError("Features must be a non-empty dictionary")

        self._load_models()

        try:
            frame = pd.DataFrame([features])

            # Classification
            prediction = str(self._classifier.predict(frame)[0])
            probabilities = self._classifier.predict_proba(frame)[0]
            confidence = float(max(probabilities))

            # Attack probability (sum of non-benign classes)
            classes = self._classifier.named_steps["classifier"].classes_
            attack_probability = float(
                sum(
                    prob
                    for label, prob in zip(classes, probabilities)
                    if str(label).casefold() not in {"benign", "normal"}
                )
            )

            # Per-class probabilities (top classes only, to keep payloads small)
            class_probabilities = {
                str(label): float(prob)
                for label, prob in sorted(
                    zip(classes, probabilities), key=lambda pair: pair[1], reverse=True
                )
                if float(prob) > 0.0
            }

            # Anomaly detection
            transformed = self._preprocessor.transform(frame)
            is_anomaly = bool(self._anomaly.predict(transformed)[0] == -1)

            # Isolation Forest decision function: negative means more anomalous.
            anomaly_score = None
            try:
                anomaly_score = float(self._anomaly.decision_function(transformed)[0])
            except Exception:  # noqa: BLE001 - score is optional metadata
                anomaly_score = None

            # Risk scoring
            risk_score, severity = calculate_risk(is_anomaly, attack_probability, confidence, prediction)

            return {
                "prediction": prediction,
                "is_anomaly": is_anomaly,
                "anomaly_score": anomaly_score,
                "confidence": confidence,
                "attack_probability": attack_probability,
                "class_probabilities": class_probabilities,
                "risk_score": risk_score,
                "severity": severity,
            }
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ModelError(f"Prediction failed: {e}", {"features_keys": list(features.keys())})


class MLService:
    """
    High-level ML service coordinating detection, prediction, and model management.
    """

    def __init__(self, model_root: Path):
        self.detection_service = DetectionService(model_root)

    def get_model_info(self) -> Dict[str, Any]:
        """Get comprehensive model information."""
        return self.detection_service.metadata()

    def get_model_metrics(self) -> Dict[str, Any]:
        """Get model evaluation metrics."""
        metadata = self.detection_service.metadata()
        return metadata.get("metrics", {})

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Make a prediction using the detection service."""
        return self.detection_service.predict(features)

    def is_ready(self) -> bool:
        """Check if ML pipeline is ready."""
        return self.detection_service.ready
