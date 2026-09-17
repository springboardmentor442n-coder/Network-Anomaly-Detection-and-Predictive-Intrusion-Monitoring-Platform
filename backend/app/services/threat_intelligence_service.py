"""
Threat Intelligence Service.

Provider-agnostic IP / domain reputation lookups.

Two providers ship with the platform:

* LocalIndicatorProvider  - always available. Answers only from the local
  ``threat_indicators`` table plus RFC1918/loopback classification. It never
  invents a verdict: an IP with no local record returns ``is_malicious=None``
  with ``status="unknown"``.
* HttpThreatIntelProvider - generic HTTP provider enabled by setting
  THREAT_INTEL_PROVIDER=http, THREAT_INTEL_BASE_URL and THREAT_INTEL_API_KEY.

When no external provider is configured the API reports
``provider_configured: false`` rather than fabricating reputation data.
"""

from __future__ import annotations

import ipaddress
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..core.config import settings
from ..core.errors import ValidationError
from ..models import ThreatIndicator, ThreatIntelligenceResult

logger = logging.getLogger(__name__)


@dataclass
class ReputationResult:
    indicator: str
    indicator_type: str
    provider: str
    status: str  # "known", "unknown", "not_configured", "error"
    is_malicious: Optional[bool] = None
    threat_level: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def classify_ip(value: str) -> Dict[str, Any]:
    """Structural facts about an IP - no reputation claim is made here."""
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        raise ValidationError(f"Not a valid IP address: {value}", field="ip")
    return {
        "version": address.version,
        "is_private": address.is_private,
        "is_loopback": address.is_loopback,
        "is_multicast": address.is_multicast,
        "is_reserved": address.is_reserved,
        "is_global": address.is_global,
    }


class ThreatIntelProvider:
    name = "base"

    @property
    def configured(self) -> bool:  # pragma: no cover - overridden
        return False

    def lookup_ip(self, db: Session, ip: str) -> ReputationResult:
        raise NotImplementedError


class LocalIndicatorProvider(ThreatIntelProvider):
    """Answers from the locally curated indicator table only."""

    name = "local"

    @property
    def configured(self) -> bool:
        return True

    def lookup_ip(self, db: Session, ip: str) -> ReputationResult:
        facts = classify_ip(ip)
        indicator = (
            db.query(ThreatIndicator)
            .filter(
                ThreatIndicator.indicator_type == "IP",
                ThreatIndicator.indicator_value == ip,
            )
            .first()
        )

        if indicator is None:
            return ReputationResult(
                indicator=ip,
                indicator_type="IP",
                provider=self.name,
                status="unknown",
                is_malicious=None,
                threat_level=None,
                details={
                    "reason": "No local indicator record for this address",
                    "classification": facts,
                },
            )

        threat_level = (indicator.threat_level or "UNKNOWN").upper()
        return ReputationResult(
            indicator=ip,
            indicator_type="IP",
            provider=self.name,
            status="known",
            is_malicious=threat_level in {"MEDIUM", "HIGH", "CRITICAL"},
            threat_level=threat_level,
            details={
                "source": indicator.source,
                "description": indicator.description,
                "last_seen": indicator.last_seen.isoformat() if indicator.last_seen else None,
                "classification": facts,
            },
        )


class HttpThreatIntelProvider(ThreatIntelProvider):
    """
    Generic HTTP reputation provider.

    Expects a JSON response. Recognised keys (all optional):
    ``malicious`` / ``is_malicious`` (bool) and ``threat_level`` / ``severity`` (str).
    Unrecognised payloads are surfaced verbatim with status="unknown" rather than
    being coerced into a verdict.
    """

    name = "http"

    @property
    def configured(self) -> bool:
        return bool(settings.threat_intel_base_url and settings.threat_intel_api_key)

    def lookup_ip(self, db: Session, ip: str) -> ReputationResult:
        classify_ip(ip)  # validates the input
        if not self.configured:
            return ReputationResult(
                indicator=ip,
                indicator_type="IP",
                provider=self.name,
                status="not_configured",
                details={
                    "reason": "THREAT_INTEL_BASE_URL and THREAT_INTEL_API_KEY are required"
                },
            )
        try:
            import httpx

            response = httpx.get(
                settings.threat_intel_base_url.rstrip("/") + f"/{ip}",
                headers={"Authorization": f"Bearer {settings.threat_intel_api_key}"},
                timeout=settings.threat_intel_timeout_seconds,
            )
            if response.status_code >= 400:
                return ReputationResult(
                    indicator=ip,
                    indicator_type="IP",
                    provider=self.name,
                    status="error",
                    details={"http_status": response.status_code},
                )
            payload = response.json()
        except Exception as exc:  # noqa: BLE001 - provider failure must not break callers
            logger.warning("Threat intel lookup failed for %s: %s", ip, exc)
            return ReputationResult(
                indicator=ip,
                indicator_type="IP",
                provider=self.name,
                status="error",
                details={"error": str(exc)},
            )

        malicious = payload.get("malicious", payload.get("is_malicious"))
        level = payload.get("threat_level", payload.get("severity"))
        return ReputationResult(
            indicator=ip,
            indicator_type="IP",
            provider=self.name,
            status="known" if malicious is not None or level else "unknown",
            is_malicious=bool(malicious) if malicious is not None else None,
            threat_level=str(level).upper() if level else None,
            details={"raw": payload},
        )


_PROVIDERS = {
    LocalIndicatorProvider.name: LocalIndicatorProvider,
    HttpThreatIntelProvider.name: HttpThreatIntelProvider,
}


class ThreatIntelligenceService:
    """Facade over the configured provider, with local indicator management."""

    def __init__(self, provider: Optional[ThreatIntelProvider] = None):
        if provider is not None:
            self.provider = provider
        else:
            provider_cls = _PROVIDERS.get(
                settings.threat_intel_provider.strip().lower(), LocalIndicatorProvider
            )
            self.provider = provider_cls()
        self.local = LocalIndicatorProvider()

    # ---------------------------------------------------------------- status --
    def configuration_status(self) -> Dict[str, Any]:
        return {
            "provider": self.provider.name,
            "provider_configured": self.provider.configured,
            "available_providers": sorted(_PROVIDERS),
            "message": (
                "Provider ready"
                if self.provider.configured
                else "Provider not configured - set THREAT_INTEL_BASE_URL and THREAT_INTEL_API_KEY"
            ),
        }

    # --------------------------------------------------------------- lookups --
    def lookup_ip(self, db: Session, ip: str) -> ReputationResult:
        """Look up an IP. Falls back to the local provider when unconfigured."""
        result = self.provider.lookup_ip(db, ip)
        if result.status == "not_configured" and self.provider.name != self.local.name:
            fallback = self.local.lookup_ip(db, ip)
            fallback.details["note"] = (
                f"External provider '{self.provider.name}' is not configured; "
                "answered from the local indicator table only."
            )
            return fallback
        return result

    def enrich_detection(
        self, db: Session, detection_id: int, ips: List[str]
    ) -> List[ThreatIntelligenceResult]:
        """Look up each IP tied to a detection and persist the outcome."""
        records: List[ThreatIntelligenceResult] = []
        for ip in [item for item in ips if item]:
            try:
                result = self.lookup_ip(db, ip)
            except ValidationError:
                continue
            record = ThreatIntelligenceResult(
                detection_id=detection_id,
                ip_address=ip,
                is_malicious=result.is_malicious,
                threat_level=result.threat_level,
                provider=result.provider,
                details=json.dumps(result.details, default=str)[:4000],
            )
            db.add(record)
            records.append(record)
        if records:
            db.commit()
            for record in records:
                db.refresh(record)
        return records

    # ------------------------------------------------------------ indicators --
    @staticmethod
    def list_indicators(
        db: Session,
        indicator_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[int, List[ThreatIndicator]]:
        query = db.query(ThreatIndicator)
        if indicator_type:
            query = query.filter(ThreatIndicator.indicator_type == indicator_type.upper())
        total = query.count()
        rows = (
            query.order_by(desc(ThreatIndicator.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
        return total, rows

    @staticmethod
    def upsert_indicator(
        db: Session,
        indicator_type: str,
        indicator_value: str,
        threat_level: Optional[str] = None,
        description: Optional[str] = None,
        source: Optional[str] = None,
    ) -> ThreatIndicator:
        indicator_type = indicator_type.upper()
        if indicator_type not in {"IP", "DOMAIN", "HASH", "URL"}:
            raise ValidationError(
                f"Unsupported indicator type: {indicator_type}", field="indicator_type"
            )
        if indicator_type == "IP":
            classify_ip(indicator_value)

        existing = (
            db.query(ThreatIndicator)
            .filter(ThreatIndicator.indicator_value == indicator_value)
            .first()
        )
        if existing:
            existing.indicator_type = indicator_type
            existing.threat_level = (threat_level or existing.threat_level or "UNKNOWN").upper()
            existing.description = description or existing.description
            existing.source = source or existing.source
            existing.last_seen = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            return existing

        indicator = ThreatIndicator(
            indicator_type=indicator_type,
            indicator_value=indicator_value,
            threat_level=(threat_level or "UNKNOWN").upper(),
            description=description,
            source=source or "manual",
            last_seen=datetime.now(timezone.utc),
        )
        db.add(indicator)
        db.commit()
        db.refresh(indicator)
        return indicator

    @staticmethod
    def delete_indicator(db: Session, indicator_id: int) -> bool:
        indicator = (
            db.query(ThreatIndicator).filter(ThreatIndicator.id == indicator_id).first()
        )
        if not indicator:
            return False
        db.delete(indicator)
        db.commit()
        return True


threat_intelligence_service = ThreatIntelligenceService()
