"""
Prediction Service - orchestrates the full intrusion prediction workflow.

For every analyzed flow:
  1. validate + preprocess input
  2. run the attack classifier
  3. run the anomaly detector
  4. compute attack probability and confidence
  5. compute the risk score and severity (centralized in ml.risk)
  6. persist a Detection record
  7. create an Alert when the risk score crosses the configured threshold
  8. dispatch notifications per severity routing rules
  9. publish a real-time event
 10. write an audit log entry
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.errors import ModelError, ValidationError
from ..ml.risk import explain as explain_risk, policy as risk_policy, severity_for_score
from ..models import AuditLog, Detection
from .alert_service import AlertService
from .event_bus import event_bus
from .ml_service import MLService
from .notification_service import notification_service

logger = logging.getLogger(__name__)


class PredictionService:
    """Coordinates ML inference with alerting, notification and audit."""

    def __init__(self, ml_service: MLService):
        self.ml_service = ml_service

    # ------------------------------------------------------------- policy ----
    @property
    def alert_threshold(self) -> int:
        return settings.alert_min_risk_score

    def should_alert(self, risk_score: int) -> bool:
        return risk_score >= self.alert_threshold

    @staticmethod
    def get_severity_from_score(risk_score: int) -> str:
        return severity_for_score(risk_score)

    @staticmethod
    def scoring_policy() -> Dict[str, Any]:
        return risk_policy()

    # ------------------------------------------------------------ predict ----
    def predict(
        self,
        db: Session,
        features: Dict[str, Any],
        user_email: str,
        source_ip: Optional[str] = None,
        destination_ip: Optional[str] = None,
        origin: str = "manual",
        notify: bool = True,
    ) -> Dict[str, Any]:
        """
        Run the complete prediction workflow and return the full result.

        Raises ValidationError for bad input and ModelError when the models are
        unavailable; everything downstream of the detection record (alerting,
        notification, streaming, audit) degrades without failing the request.
        """
        if not isinstance(features, dict) or not features:
            raise ValidationError("Features must be a non-empty dictionary", field="features")

        ml_result = self.ml_service.predict(features)

        explanation = explain_risk(
            ml_result["is_anomaly"],
            ml_result["attack_probability"],
            ml_result["confidence"],
            ml_result["prediction"],
        )

        detection = Detection(
            prediction=ml_result["prediction"],
            confidence=ml_result["confidence"],
            risk_score=ml_result["risk_score"],
            severity=ml_result["severity"],
            is_anomaly=ml_result["is_anomaly"],
            features_json=json.dumps(features, default=str),
        )
        db.add(detection)
        db.flush()
        detection_id = detection.id

        alert = None
        if self.should_alert(ml_result["risk_score"]):
            try:
                alert = AlertService.create_alert_from_detection(
                    db,
                    detection_id,
                    detection,
                    source_ip=source_ip,
                    destination_ip=destination_ip,
                )
            except Exception as exc:  # noqa: BLE001 - alerting must not break detection
                logger.warning("Alert creation failed for detection %s: %s", detection_id, exc)

        try:
            db.add(
                AuditLog(
                    user_email=user_email,
                    action="prediction",
                    details=json.dumps(
                        {
                            "detection_id": detection_id,
                            "alert_id": alert.id if alert else None,
                            "prediction": ml_result["prediction"],
                            "risk_score": ml_result["risk_score"],
                            "severity": ml_result["severity"],
                            "origin": origin,
                        }
                    ),
                )
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Audit logging failed: %s", exc)
            db.rollback()
            db.commit()

        db.refresh(detection)

        # Notifications (severity-routed; no-ops when nothing is configured).
        notifications: List[Dict[str, Any]] = []
        if alert is not None and notify:
            try:
                for result in notification_service.notify_alert(db, alert):
                    notifications.append(
                        {
                            "channel": result.channel,
                            "status": result.status,
                            "error": result.error,
                        }
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Notification dispatch failed: %s", exc)

        result: Dict[str, Any] = {
            "detection_id": detection_id,
            "alert_id": alert.id if alert else None,
            "prediction": ml_result["prediction"],
            "confidence": ml_result["confidence"],
            "attack_probability": ml_result["attack_probability"],
            "is_anomaly": ml_result["is_anomaly"],
            "risk_score": ml_result["risk_score"],
            "severity": ml_result["severity"],
            "timestamp": detection.created_at or datetime.now(timezone.utc),
            "model_version": self._model_version(),
            "class_probabilities": ml_result.get("class_probabilities", {}),
            "explanation": explanation,
            "notifications": notifications,
            "source_ip": source_ip,
            "destination_ip": destination_ip,
            "origin": origin,
        }

        # Real-time fan-out.
        try:
            event_bus.publish(
                "detection",
                {
                    "detection_id": detection_id,
                    "alert_id": alert.id if alert else None,
                    "prediction": result["prediction"],
                    "severity": result["severity"],
                    "risk_score": result["risk_score"],
                    "is_anomaly": result["is_anomaly"],
                    "confidence": result["confidence"],
                    "source_ip": source_ip,
                    "destination_ip": destination_ip,
                    "origin": origin,
                    "timestamp": str(result["timestamp"]),
                },
            )
            if alert is not None:
                event_bus.publish(
                    "alert",
                    {
                        "alert_id": alert.id,
                        "detection_id": detection_id,
                        "severity": alert.severity,
                        "status": alert.status,
                        "attack_type": alert.attack_type,
                        "risk_score": alert.risk_score,
                        "source_ip": alert.source_ip,
                        "destination_ip": alert.destination_ip,
                    },
                )
        except Exception as exc:  # noqa: BLE001
            logger.debug("Event publish failed: %s", exc)

        logger.info(
            "Prediction complete detection_id=%s prediction=%s risk=%s alert=%s origin=%s",
            detection_id,
            result["prediction"],
            result["risk_score"],
            result["alert_id"],
            origin,
        )
        return result

    # ------------------------------------------------------------ helpers ----
    def _model_version(self) -> str:
        try:
            return str(self.ml_service.get_model_info().get("model_version", "unknown"))
        except Exception:  # noqa: BLE001
            return "unknown"
