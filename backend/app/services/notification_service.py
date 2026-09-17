"""
Notification Service.

Provides a channel abstraction (email / Slack / generic webhook) that degrades
safely when credentials are not configured. Nothing here raises to the caller:
every send returns a result object and is persisted to the notifications table
so the UI can show exactly why a notification was or was not delivered.

No credentials are read from source - only from environment variables.
"""

from __future__ import annotations

import json
import logging
import smtplib
from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..models import Alert, Notification

logger = logging.getLogger(__name__)

STATUS_SENT = "SENT"
STATUS_FAILED = "FAILED"
STATUS_SKIPPED = "SKIPPED"


@dataclass
class NotificationResult:
    channel: str
    status: str
    recipient: str
    error: Optional[str] = None

    @property
    def delivered(self) -> bool:
        return self.status == STATUS_SENT


class NotificationChannel:
    """Base class for a notification channel."""

    name = "base"

    @property
    def configured(self) -> bool:  # pragma: no cover - overridden
        return False

    @property
    def recipient(self) -> str:  # pragma: no cover - overridden
        return "unknown"

    def send(self, subject: str, body: str, payload: Dict[str, Any]) -> NotificationResult:
        raise NotImplementedError


class EmailChannel(NotificationChannel):
    name = "EMAIL"

    @property
    def configured(self) -> bool:
        return bool(settings.smtp_host and settings.alert_email)

    @property
    def recipient(self) -> str:
        return settings.alert_email or "not-configured"

    def send(self, subject: str, body: str, payload: Dict[str, Any]) -> NotificationResult:
        if not self.configured:
            return NotificationResult(
                self.name,
                STATUS_SKIPPED,
                self.recipient,
                "SMTP host or alert email not configured",
            )

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.alert_email_from or settings.smtp_username or settings.alert_email
        message["To"] = settings.alert_email
        message.set_content(body)

        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(message)
            return NotificationResult(self.name, STATUS_SENT, self.recipient)
        except Exception as exc:  # noqa: BLE001 - notification must never break the request
            logger.warning("Email notification failed: %s", exc)
            return NotificationResult(self.name, STATUS_FAILED, self.recipient, str(exc))


class SlackChannel(NotificationChannel):
    name = "SLACK"

    @property
    def configured(self) -> bool:
        return bool(settings.slack_webhook_url)

    @property
    def recipient(self) -> str:
        return "slack-webhook" if self.configured else "not-configured"

    def send(self, subject: str, body: str, payload: Dict[str, Any]) -> NotificationResult:
        if not self.configured:
            return NotificationResult(
                self.name, STATUS_SKIPPED, self.recipient, "Slack webhook URL not configured"
            )
        try:
            import httpx

            response = httpx.post(
                settings.slack_webhook_url,
                json={"text": f"*{subject}*\n{body}"},
                timeout=settings.webhook_timeout_seconds,
            )
            if response.status_code >= 400:
                return NotificationResult(
                    self.name,
                    STATUS_FAILED,
                    self.recipient,
                    f"HTTP {response.status_code}",
                )
            return NotificationResult(self.name, STATUS_SENT, self.recipient)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Slack notification failed: %s", exc)
            return NotificationResult(self.name, STATUS_FAILED, self.recipient, str(exc))


class WebhookChannel(NotificationChannel):
    name = "WEBHOOK"

    @property
    def configured(self) -> bool:
        return bool(settings.webhook_url)

    @property
    def recipient(self) -> str:
        return "generic-webhook" if self.configured else "not-configured"

    def send(self, subject: str, body: str, payload: Dict[str, Any]) -> NotificationResult:
        if not self.configured:
            return NotificationResult(
                self.name, STATUS_SKIPPED, self.recipient, "Webhook URL not configured"
            )
        try:
            import httpx

            response = httpx.post(
                settings.webhook_url,
                json={"subject": subject, "body": body, "data": payload},
                timeout=settings.webhook_timeout_seconds,
            )
            if response.status_code >= 400:
                return NotificationResult(
                    self.name,
                    STATUS_FAILED,
                    self.recipient,
                    f"HTTP {response.status_code}",
                )
            return NotificationResult(self.name, STATUS_SENT, self.recipient)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Webhook notification failed: %s", exc)
            return NotificationResult(self.name, STATUS_FAILED, self.recipient, str(exc))


class NotificationService:
    """Dispatches notifications across all configured channels."""

    def __init__(self, channels: Optional[List[NotificationChannel]] = None):
        self.channels: List[NotificationChannel] = channels or [
            EmailChannel(),
            SlackChannel(),
            WebhookChannel(),
        ]

    # ------------------------------------------------------------------ api --
    def configuration_status(self) -> Dict[str, Any]:
        """Report which channels are usable without exposing any secret."""
        return {
            channel.name: {
                "configured": channel.configured,
                "recipient": channel.recipient,
                "status": "ready" if channel.configured else "not_configured",
            }
            for channel in self.channels
        }

    def should_notify(self, severity: str) -> bool:
        """Severity-based routing rule (configurable via NETSHIELD_NOTIFY_SEVERITIES)."""
        allowed = {item.strip().upper() for item in settings.notify_severities}
        return severity.upper() in allowed

    def notify_alert(self, db: Session, alert: Alert) -> List[NotificationResult]:
        """
        Send notifications for an alert if its severity matches the routing rules.
        Always records the outcome; never raises.
        """
        if not self.should_notify(alert.severity):
            return []

        subject = f"[NetShield {alert.severity}] {alert.attack_type or 'Threat detected'}"
        body = (
            f"Alert #{alert.id}\n"
            f"Severity: {alert.severity}\n"
            f"Attack type: {alert.attack_type}\n"
            f"Risk score: {alert.risk_score}\n"
            f"Source IP: {alert.source_ip or 'n/a'}\n"
            f"Destination IP: {alert.destination_ip or 'n/a'}\n"
            f"Detected at: {alert.created_at}\n"
        )
        payload = {
            "alert_id": alert.id,
            "severity": alert.severity,
            "attack_type": alert.attack_type,
            "risk_score": alert.risk_score,
            "source_ip": alert.source_ip,
            "destination_ip": alert.destination_ip,
        }

        results: List[NotificationResult] = []
        for channel in self.channels:
            result = channel.send(subject, body, payload)
            results.append(result)
            self._record(db, alert.id, None, result, body)

        try:
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to persist notification records: %s", exc)
            db.rollback()

        return results

    # -------------------------------------------------------------- internal --
    def _record(
        self,
        db: Session,
        alert_id: Optional[int],
        incident_id: Optional[int],
        result: NotificationResult,
        message: str,
    ) -> None:
        try:
            db.add(
                Notification(
                    alert_id=alert_id,
                    incident_id=incident_id,
                    channel=result.channel,
                    recipient=result.recipient,
                    status=result.status,
                    message=message[:2000],
                    error_message=result.error,
                    sent_at=datetime.now(timezone.utc) if result.delivered else None,
                )
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to build notification record: %s", exc)


notification_service = NotificationService()
