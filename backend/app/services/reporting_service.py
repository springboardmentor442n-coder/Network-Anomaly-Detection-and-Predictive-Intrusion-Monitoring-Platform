"""
Security Reporting Service.

Reports are built exclusively from rows in the database and from the active
model's persisted metrics. Nothing is estimated, extrapolated or invented: if a
period contains no detections the report says so and produces an empty
recommendation set.

Export formats: JSON (always), CSV (always), PDF (only when reportlab is
installed - otherwise the API reports the format as unavailable rather than
returning a broken file).
"""

from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Alert, Detection, Incident, Report
from .ml_service import MLService

logger = logging.getLogger(__name__)

BENIGN_LABELS = {"benign", "normal"}


def pdf_available() -> bool:
    try:
        import reportlab  # noqa: F401

        return True
    except ImportError:
        return False


class ReportingService:
    def __init__(self, ml_service: MLService):
        self.ml_service = ml_service

    # ---------------------------------------------------------------- build --
    def build_report_data(
        self,
        db: Session,
        period_start: datetime,
        period_end: datetime,
        report_type: str = "SECURITY",
    ) -> Dict[str, Any]:
        """Aggregate everything the report needs straight from the database."""
        detections = (
            db.query(Detection)
            .filter(Detection.created_at >= period_start, Detection.created_at <= period_end)
            .all()
        )

        total_traffic = len(detections)
        benign = sum(1 for d in detections if str(d.prediction).casefold() in BENIGN_LABELS)
        anomalies = sum(1 for d in detections if d.is_anomaly)
        attacks = total_traffic - benign
        high_risk = sum(1 for d in detections if (d.risk_score or 0) >= 65)
        critical = sum(1 for d in detections if d.severity == "CRITICAL")

        severity_distribution: Dict[str, int] = {}
        attack_distribution: Dict[str, int] = {}
        for detection in detections:
            severity_distribution[detection.severity] = (
                severity_distribution.get(detection.severity, 0) + 1
            )
            if str(detection.prediction).casefold() not in BENIGN_LABELS:
                attack_distribution[detection.prediction] = (
                    attack_distribution.get(detection.prediction, 0) + 1
                )

        alerts = (
            db.query(Alert)
            .filter(Alert.created_at >= period_start, Alert.created_at <= period_end)
            .all()
        )
        alert_status_distribution: Dict[str, int] = {}
        for alert in alerts:
            alert_status_distribution[alert.status] = (
                alert_status_distribution.get(alert.status, 0) + 1
            )

        incidents = (
            db.query(Incident)
            .filter(Incident.created_at >= period_start, Incident.created_at <= period_end)
            .all()
        )
        incident_status_distribution: Dict[str, int] = {}
        for incident in incidents:
            incident_status_distribution[incident.status] = (
                incident_status_distribution.get(incident.status, 0) + 1
            )

        top_threats = sorted(
            attack_distribution.items(), key=lambda pair: pair[1], reverse=True
        )[:10]

        model_metrics = self._model_section()

        data: Dict[str, Any] = {
            "report_type": report_type,
            "period": {
                "start": period_start.isoformat(),
                "end": period_end.isoformat(),
            },
            "traffic_statistics": {
                "total_analyzed_flows": total_traffic,
                "benign_flows": benign,
                "non_benign_flows": attacks,
                "anomalous_flows": anomalies,
            },
            "attack_statistics": {
                "total_attacks": attacks,
                "distinct_attack_types": len(attack_distribution),
                "attack_distribution": attack_distribution,
                "top_threats": [
                    {"attack_type": name, "count": count} for name, count in top_threats
                ],
            },
            "risk_statistics": {
                "high_risk_detections": high_risk,
                "critical_detections": critical,
                "severity_distribution": severity_distribution,
            },
            "alerts": {
                "total": len(alerts),
                "status_distribution": alert_status_distribution,
            },
            "incidents": {
                "total": len(incidents),
                "status_distribution": incident_status_distribution,
            },
            "model_performance": model_metrics,
            "recommendations": self._recommendations(
                total_traffic=total_traffic,
                attacks=attacks,
                anomalies=anomalies,
                high_risk=high_risk,
                critical=critical,
                alert_status_distribution=alert_status_distribution,
                incident_status_distribution=incident_status_distribution,
                top_threats=top_threats,
            ),
        }
        data["summary"] = self._summary(data)
        return data

    # -------------------------------------------------------------- persist --
    def generate_and_store(
        self,
        db: Session,
        title: str,
        generated_by: str,
        period_start: datetime,
        period_end: datetime,
        report_type: str = "SECURITY",
    ) -> Tuple[Report, Dict[str, Any]]:
        data = self.build_report_data(db, period_start, period_end, report_type)

        report = Report(
            title=title,
            report_type=report_type,
            period_start=period_start,
            period_end=period_end,
            generated_by=generated_by,
            total_traffic=data["traffic_statistics"]["total_analyzed_flows"],
            total_attacks=data["attack_statistics"]["total_attacks"],
            total_anomalies=data["traffic_statistics"]["anomalous_flows"],
            high_risk_count=data["risk_statistics"]["high_risk_detections"],
            critical_count=data["risk_statistics"]["critical_detections"],
            summary=data["summary"],
            recommendations="\n".join(data["recommendations"]),
            data_json=json.dumps(data, default=str),
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report, data

    @staticmethod
    def list_reports(
        db: Session, limit: int = 50, offset: int = 0
    ) -> Tuple[int, List[Report]]:
        query = db.query(Report)
        total = query.count()
        rows = (
            query.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()
        )
        return total, rows

    @staticmethod
    def get_report(db: Session, report_id: int) -> Optional[Report]:
        return db.query(Report).filter(Report.id == report_id).first()

    # --------------------------------------------------------------- export --
    @staticmethod
    def to_csv(data: Dict[str, Any]) -> str:
        buffer = io.StringIO()
        writer = csv.writer(buffer, lineterminator="\n")
        writer.writerow(["section", "metric", "value"])
        writer.writerow(["period", "start", data["period"]["start"]])
        writer.writerow(["period", "end", data["period"]["end"]])

        for section in (
            "traffic_statistics",
            "risk_statistics",
        ):
            for key, value in data[section].items():
                if isinstance(value, dict):
                    for sub_key, sub_value in value.items():
                        writer.writerow([section, f"{key}.{sub_key}", sub_value])
                else:
                    writer.writerow([section, key, value])

        writer.writerow(
            ["attack_statistics", "total_attacks", data["attack_statistics"]["total_attacks"]]
        )
        for item in data["attack_statistics"]["top_threats"]:
            writer.writerow(["top_threats", item["attack_type"], item["count"]])

        for key, value in data["alerts"]["status_distribution"].items():
            writer.writerow(["alerts", key, value])
        for key, value in data["incidents"]["status_distribution"].items():
            writer.writerow(["incidents", key, value])

        for key, value in (data["model_performance"] or {}).items():
            if not isinstance(value, (dict, list)):
                writer.writerow(["model_performance", key, value])

        for index, recommendation in enumerate(data["recommendations"], start=1):
            writer.writerow(["recommendations", f"item_{index}", recommendation])

        return buffer.getvalue()

    @staticmethod
    def to_pdf(title: str, data: Dict[str, Any]) -> bytes:
        """Render the report to PDF. Raises RuntimeError if reportlab is absent."""
        if not pdf_available():
            raise RuntimeError(
                "PDF export requires reportlab. Install with 'pip install reportlab'."
            )

        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            PageBreak,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
            title=title,
        )
        styles = getSampleStyleSheet()
        story: List[Any] = [
            Paragraph(title, styles["Title"]),
            Paragraph(
                f"Period: {data['period']['start']} to {data['period']['end']}",
                styles["Normal"],
            ),
            Spacer(1, 8 * mm),
        ]

        def table(heading: str, rows: List[Tuple[str, Any]]) -> None:
            story.append(Paragraph(heading, styles["Heading2"]))
            if not rows:
                story.append(Paragraph("No data for this period.", styles["Normal"]))
                story.append(Spacer(1, 4 * mm))
                return
            table_data = [["Metric", "Value"]] + [[str(k), str(v)] for k, v in rows]
            widths = [95 * mm, 65 * mm]
            rendered = Table(table_data, colWidths=widths, hAlign="LEFT")
            rendered.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17212b")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c8d3cd")),
                        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f6f4")]),
                    ]
                )
            )
            story.append(rendered)
            story.append(Spacer(1, 6 * mm))

        table("Traffic statistics", list(data["traffic_statistics"].items()))
        table(
            "Risk statistics",
            [
                ("high_risk_detections", data["risk_statistics"]["high_risk_detections"]),
                ("critical_detections", data["risk_statistics"]["critical_detections"]),
            ]
            + list(data["risk_statistics"]["severity_distribution"].items()),
        )
        table(
            "Top threats",
            [(item["attack_type"], item["count"]) for item in data["attack_statistics"]["top_threats"]],
        )
        table("Alerts by status", list(data["alerts"]["status_distribution"].items()))
        table("Incidents by status", list(data["incidents"]["status_distribution"].items()))
        table(
            "Model performance",
            [
                (k, v)
                for k, v in (data["model_performance"] or {}).items()
                if not isinstance(v, (dict, list))
            ],
        )

        story.append(Paragraph("Recommendations", styles["Heading2"]))
        if data["recommendations"]:
            for recommendation in data["recommendations"]:
                story.append(Paragraph(f"- {recommendation}", styles["Normal"]))
        else:
            story.append(
                Paragraph(
                    "No recommendations: no detections were recorded in this period.",
                    styles["Normal"],
                )
            )

        doc.build(story)
        return buffer.getvalue()

    # ------------------------------------------------------------- internal --
    def _model_section(self) -> Dict[str, Any]:
        try:
            metadata = self.ml_service.get_model_info()
        except Exception as exc:  # noqa: BLE001
            return {"status": "unavailable", "error": str(exc)}

        if metadata.get("status") == "not_trained":
            return {"status": "not_trained"}

        metrics = metadata.get("metrics", {}) or {}
        return {
            "status": "trained",
            "model_version": metadata.get("model_version"),
            "dataset": metadata.get("dataset"),
            "trained_at": metadata.get("trained_at"),
            "sample_rows": metadata.get("sample_rows"),
            "accuracy": metrics.get("accuracy"),
            "precision_macro": metrics.get("precision_macro"),
            "recall_macro": metrics.get("recall_macro"),
            "f1_macro": metrics.get("f1_macro"),
            "f1_weighted": metrics.get("f1_weighted"),
        }

    @staticmethod
    def _summary(data: Dict[str, Any]) -> str:
        traffic = data["traffic_statistics"]
        risk = data["risk_statistics"]
        if traffic["total_analyzed_flows"] == 0:
            return (
                "No flows were analyzed in this period, so no traffic, attack or "
                "risk statistics are available."
            )
        return (
            f"{traffic['total_analyzed_flows']} flows analyzed: "
            f"{traffic['benign_flows']} classified benign, "
            f"{traffic['non_benign_flows']} classified as a non-benign class, "
            f"{traffic['anomalous_flows']} flagged anomalous. "
            f"{risk['high_risk_detections']} detections scored 65 or higher, "
            f"{risk['critical_detections']} were CRITICAL. "
            f"{data['alerts']['total']} alerts and {data['incidents']['total']} incidents "
            "were recorded."
        )

    @staticmethod
    def _recommendations(
        *,
        total_traffic: int,
        attacks: int,
        anomalies: int,
        high_risk: int,
        critical: int,
        alert_status_distribution: Dict[str, int],
        incident_status_distribution: Dict[str, int],
        top_threats: List[Tuple[str, int]],
    ) -> List[str]:
        """Recommendations derived only from observed counts."""
        recommendations: List[str] = []

        if total_traffic == 0:
            return recommendations

        if critical:
            recommendations.append(
                f"{critical} CRITICAL detections were recorded - review and triage these first."
            )
        if high_risk:
            recommendations.append(
                f"{high_risk} detections scored 65 or above; confirm each has an owning alert or incident."
            )

        new_alerts = alert_status_distribution.get("NEW", 0)
        if new_alerts:
            recommendations.append(
                f"{new_alerts} alerts are still in NEW state and have not been acknowledged."
            )

        false_positives = alert_status_distribution.get("FALSE_POSITIVE", 0)
        total_alerts = sum(alert_status_distribution.values())
        if total_alerts and false_positives / total_alerts > 0.3:
            recommendations.append(
                f"{false_positives} of {total_alerts} alerts were marked false positive "
                "(>30%); consider raising NETSHIELD_ALERT_MIN_RISK_SCORE or retraining."
            )

        open_incidents = incident_status_distribution.get("OPEN", 0)
        if open_incidents:
            recommendations.append(
                f"{open_incidents} incidents remain OPEN and need an assigned analyst."
            )

        if top_threats:
            name, count = top_threats[0]
            recommendations.append(
                f"'{name}' was the most frequent non-benign classification ({count} flows); "
                "review controls covering that technique."
            )

        if anomalies and attacks == 0:
            recommendations.append(
                f"{anomalies} flows were flagged anomalous while the classifier reported no "
                "attack class - these are candidates for manual review and labelling."
            )

        return recommendations
