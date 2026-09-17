"""
Monitoring Service.

Pulls flow events from a ``NetworkDataSource`` and runs them through the
detection pipeline, persisting a TrafficRecord per observed flow.

Scoring rule: a flow is only sent to the CICIDS2017 classifier when the source
supplies the complete feature set the model was trained on (``event.model_ready``).
A partially-observed live/Zeek flow is recorded and streamed, but reported as
``scored: false`` with the list of missing features - the platform never pads a
feature vector with invented values just to obtain a prediction.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..core.errors import NotFoundError, ValidationError
from ..models import TrafficRecord
from ..monitoring import registry
from ..monitoring.base import FlowEvent
from .event_bus import event_bus
from .prediction_service import PredictionService

logger = logging.getLogger(__name__)


class MonitoringService:
    def __init__(self, prediction_service: PredictionService):
        self.prediction_service = prediction_service

    # --------------------------------------------------------------- status --
    @staticmethod
    def sources_status() -> Dict[str, Any]:
        statuses = [status.to_dict() for status in registry.statuses()]
        default = registry.default_source()
        return {
            "sources": statuses,
            "default_source": default.name if default else None,
            "any_available": any(status["available"] for status in statuses),
        }

    # ----------------------------------------------------------------- scan --
    def scan(
        self,
        db: Session,
        source_name: str,
        limit: int,
        user_email: str,
        persist_traffic: bool = True,
        notify: bool = True,
    ) -> Dict[str, Any]:
        """
        Pull up to ``limit`` flows from a source and analyze each one.

        Returns a per-flow result list plus a summary. Never raises for a single
        bad flow - failures are reported inline so a batch is never lost.
        """
        source = registry.get(source_name)
        if source is None:
            raise NotFoundError("DataSource", source_name)

        status = source.status()
        if not status.available:
            raise ValidationError(
                status.reason or f"Data source '{source_name}' is not available",
                field="source",
            )

        if limit < 1 or limit > 200:
            raise ValidationError("limit must be between 1 and 200", field="limit")

        results: List[Dict[str, Any]] = []
        scored = 0
        skipped = 0
        alerts_created = 0
        failures = 0

        for event in source.iter_flows(limit=limit):
            entry: Dict[str, Any] = {"flow": event.summary(), "scored": False}

            if not event.model_ready:
                entry["reason"] = (
                    "Source does not provide the full feature set required by the "
                    "trained CICIDS2017 model."
                )
                entry["missing_feature_count"] = len(event.missing_features)
                entry["missing_features_sample"] = event.missing_features[:10]
                skipped += 1
                results.append(entry)
                self._publish_flow(event, None)
                if persist_traffic:
                    self._persist_traffic(db, event, None)
                continue

            try:
                prediction = self.prediction_service.predict(
                    db,
                    event.features,
                    user_email=user_email,
                    source_ip=event.source_ip,
                    destination_ip=event.destination_ip,
                    origin=f"monitor:{source_name}",
                    notify=notify,
                )
            except Exception as exc:  # noqa: BLE001 - one bad flow must not kill the batch
                logger.warning("Scan prediction failed: %s", exc)
                entry["reason"] = f"Prediction failed: {exc}"
                failures += 1
                results.append(entry)
                continue

            entry["scored"] = True
            entry["detection"] = {
                "detection_id": prediction["detection_id"],
                "alert_id": prediction["alert_id"],
                "prediction": prediction["prediction"],
                "confidence": prediction["confidence"],
                "attack_probability": prediction["attack_probability"],
                "is_anomaly": prediction["is_anomaly"],
                "risk_score": prediction["risk_score"],
                "severity": prediction["severity"],
                "ground_truth_label": event.label,
            }
            scored += 1
            if prediction["alert_id"]:
                alerts_created += 1

            if persist_traffic:
                self._persist_traffic(db, event, prediction)
            results.append(entry)

        return {
            "source": source_name,
            "source_kind": source.kind,
            "requested": limit,
            "returned": len(results),
            "scored": scored,
            "skipped_incomplete_features": skipped,
            "failed": failures,
            "alerts_created": alerts_created,
            "results": results,
        }

    # ------------------------------------------------------------- internal --
    @staticmethod
    def _persist_traffic(
        db: Session, event: FlowEvent, prediction: Optional[Dict[str, Any]]
    ) -> None:
        try:
            db.add(
                TrafficRecord(
                    dataset=event.source,
                    label=(
                        prediction["prediction"]
                        if prediction
                        else (event.label or "UNSCORED")
                    ),
                    protocol=str(event.protocol) if event.protocol is not None else None,
                    source_ip=event.source_ip,
                    destination_ip=event.destination_ip,
                    risk_score=prediction["risk_score"] if prediction else None,
                    is_anomaly=bool(prediction["is_anomaly"]) if prediction else False,
                )
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.debug("Failed to persist traffic record: %s", exc)
            db.rollback()

    @staticmethod
    def _publish_flow(event: FlowEvent, prediction: Optional[Dict[str, Any]]) -> None:
        try:
            event_bus.publish(
                "flow",
                {
                    **event.summary(),
                    "scored": prediction is not None,
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.debug("Failed to publish flow event: %s", exc)

    # -------------------------------------------------------------- preview --
    @staticmethod
    def sample_features(source_name: str = "csv_replay") -> Dict[str, Any]:
        """
        Return one real flow from the dataset as example prediction input.

        Used by the prediction UI's "load demo data" action so an analyst never
        has to hand-type 85 features.
        """
        source = registry.get(source_name)
        if source is None:
            raise NotFoundError("DataSource", source_name)
        status = source.status()
        if not status.available:
            raise ValidationError(
                status.reason or f"Data source '{source_name}' is not available",
                field="source",
            )
        for event in source.iter_flows(limit=1):
            return {
                "source": source_name,
                "ground_truth_label": event.label,
                "source_ip": event.source_ip,
                "destination_ip": event.destination_ip,
                "protocol": event.protocol,
                "features": event.features,
                "feature_count": len(event.features),
                "model_ready": event.model_ready,
            }
        raise ValidationError("No flows were returned by the data source", field="source")
