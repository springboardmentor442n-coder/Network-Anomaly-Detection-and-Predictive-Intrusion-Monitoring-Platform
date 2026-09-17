"""
Threat intelligence, notifications, monitoring sources and rate limiting.

These cover the "degrades safely when unconfigured" contract: an integration
with no credentials must report itself as unconfigured and must never fabricate
a result or break the request.
"""

import os
from pathlib import Path

import pytest

from backend.app.core import rate_limit
from backend.app.core.errors import ValidationError
from backend.app.models import Notification, ThreatIndicator
from backend.app.monitoring import registry
from backend.app.monitoring.base import FlowEvent
from backend.app.monitoring.capture import PacketCaptureDataSource, scapy_available
from backend.app.monitoring.cicids import CSVReplayDataSource
from backend.app.monitoring.zeek import ZeekDataSource
from backend.app.services.notification_service import (
    STATUS_FAILED,
    STATUS_SENT,
    STATUS_SKIPPED,
    EmailChannel,
    NotificationChannel,
    NotificationResult,
    NotificationService,
    SlackChannel,
    WebhookChannel,
)
from backend.app.services.threat_intelligence_service import (
    HttpThreatIntelProvider,
    LocalIndicatorProvider,
    ThreatIntelligenceService,
    classify_ip,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]


# ------------------------------------------------------- threat intelligence --

def test_classify_ip_reports_structure_only():
    facts = classify_ip("192.168.1.10")
    assert facts["is_private"] is True
    assert facts["is_global"] is False
    assert facts["version"] == 4


def test_classify_ip_rejects_garbage():
    with pytest.raises(ValidationError):
        classify_ip("not-an-ip")


def test_unknown_ip_returns_no_verdict(db):
    result = LocalIndicatorProvider().lookup_ip(db, "203.0.113.7")
    assert result.status == "unknown"
    assert result.is_malicious is None, "an unknown IP must not be labelled malicious"
    assert result.threat_level is None


def test_known_indicator_returns_verdict(db):
    ThreatIntelligenceService.upsert_indicator(
        db, "IP", "203.0.113.8", threat_level="HIGH", description="test", source="unit-test"
    )
    result = LocalIndicatorProvider().lookup_ip(db, "203.0.113.8")
    assert result.status == "known"
    assert result.is_malicious is True
    assert result.threat_level == "HIGH"


def test_low_threat_indicator_is_not_malicious(db):
    ThreatIntelligenceService.upsert_indicator(
        db, "IP", "203.0.113.9", threat_level="LOW", source="unit-test"
    )
    result = LocalIndicatorProvider().lookup_ip(db, "203.0.113.9")
    assert result.is_malicious is False


def test_http_provider_reports_not_configured_without_credentials(db):
    provider = HttpThreatIntelProvider()
    if provider.configured:
        pytest.skip("An external threat intel provider is configured in this environment")
    result = provider.lookup_ip(db, "203.0.113.10")
    assert result.status == "not_configured"
    assert result.is_malicious is None


def test_service_falls_back_to_local_when_provider_unconfigured(db):
    service = ThreatIntelligenceService(provider=HttpThreatIntelProvider())
    if service.provider.configured:
        pytest.skip("An external threat intel provider is configured in this environment")
    result = service.lookup_ip(db, "203.0.113.11")
    assert result.provider == "local"
    assert "not configured" in result.details.get("note", "")


def test_upsert_indicator_updates_existing(db):
    first = ThreatIntelligenceService.upsert_indicator(
        db, "IP", "203.0.113.12", threat_level="LOW", source="a"
    )
    second = ThreatIntelligenceService.upsert_indicator(
        db, "IP", "203.0.113.12", threat_level="CRITICAL", source="b"
    )
    assert first.id == second.id
    assert second.threat_level == "CRITICAL"


def test_upsert_rejects_unknown_indicator_type(db):
    with pytest.raises(ValidationError):
        ThreatIntelligenceService.upsert_indicator(db, "MAGIC", "x")


def test_upsert_rejects_invalid_ip(db):
    with pytest.raises(ValidationError):
        ThreatIntelligenceService.upsert_indicator(db, "IP", "999.999.999.999")


def test_delete_indicator(db):
    indicator = ThreatIntelligenceService.upsert_indicator(db, "IP", "203.0.113.13")
    assert ThreatIntelligenceService.delete_indicator(db, indicator.id) is True
    assert ThreatIntelligenceService.delete_indicator(db, indicator.id) is False


def test_threat_intel_api_status(client, analyst):
    _, headers = analyst
    body = client.get("/api/threat-intel/status", headers=headers).json()
    assert "provider" in body
    assert "provider_configured" in body
    assert "message" in body


def test_threat_intel_api_rejects_bad_ip(client, analyst):
    _, headers = analyst
    assert client.get("/api/threat-intel/lookup/nope", headers=headers).status_code == 400


def test_threat_intel_api_admin_can_manage(client, admin):
    _, headers = admin
    created = client.post(
        "/api/threat-intel/indicators",
        headers=headers,
        json={"indicator_type": "IP", "indicator_value": "198.51.100.5", "threat_level": "HIGH"},
    )
    assert created.status_code == 201
    indicator_id = created.json()["id"]

    listed = client.get("/api/threat-intel/indicators", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    assert client.delete(
        f"/api/threat-intel/indicators/{indicator_id}", headers=headers
    ).status_code == 200


# ------------------------------------------------------------- notifications --

class _StubChannel(NotificationChannel):
    name = "STUB"

    def __init__(self, configured=True, outcome=STATUS_SENT, error=None):
        self._configured = configured
        self._outcome = outcome
        self._error = error
        self.calls = 0

    @property
    def configured(self):
        return self._configured

    @property
    def recipient(self):
        return "stub-recipient"

    def send(self, subject, body, payload):
        self.calls += 1
        return NotificationResult(self.name, self._outcome, self.recipient, self._error)


def _alert(db):
    from backend.app.models import Alert, Detection

    detection = Detection(
        prediction="DDoS",
        confidence=0.99,
        risk_score=95,
        severity="CRITICAL",
        is_anomaly=True,
        features_json="{}",
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)

    alert = Alert(
        detection_id=detection.id,
        severity="CRITICAL",
        status="NEW",
        attack_type="DDoS",
        risk_score=95,
        source_ip="10.2.2.2",
        destination_ip="10.2.2.3",
        description="test",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def test_unconfigured_channels_report_not_configured():
    service = NotificationService()
    status = service.configuration_status()
    for channel in ("EMAIL", "SLACK", "WEBHOOK"):
        assert channel in status
        assert status[channel]["status"] in {"ready", "not_configured"}


def test_unconfigured_channel_skips_without_raising(db):
    alert = _alert(db)
    service = NotificationService(channels=[_StubChannel(configured=False, outcome=STATUS_SKIPPED)])
    results = service.notify_alert(db, alert)
    assert len(results) == 1
    assert results[0].status == STATUS_SKIPPED
    assert results[0].delivered is False


def test_successful_notification_is_recorded(db):
    alert = _alert(db)
    service = NotificationService(channels=[_StubChannel()])
    results = service.notify_alert(db, alert)
    assert results[0].delivered is True

    record = (
        db.query(Notification)
        .filter(Notification.alert_id == alert.id, Notification.channel == "STUB")
        .first()
    )
    assert record is not None
    assert record.status == STATUS_SENT
    assert record.sent_at is not None


def test_failed_notification_is_recorded_and_does_not_raise(db):
    alert = _alert(db)
    channel = _StubChannel(outcome=STATUS_FAILED, error="connection refused")
    service = NotificationService(channels=[channel])
    results = service.notify_alert(db, alert)

    assert results[0].status == STATUS_FAILED
    record = (
        db.query(Notification)
        .filter(Notification.alert_id == alert.id, Notification.status == STATUS_FAILED)
        .first()
    )
    assert record is not None
    assert "connection refused" in (record.error_message or "")


def test_severity_routing_skips_low_severity(db, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "notify_severities", ["CRITICAL"])
    alert = _alert(db)
    alert.severity = "LOW"
    db.commit()

    channel = _StubChannel()
    service = NotificationService(channels=[channel])
    assert service.notify_alert(db, alert) == []
    assert channel.calls == 0, "a LOW alert must not reach a channel"


def test_severity_routing_allows_configured_severity(db, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "notify_severities", ["HIGH", "CRITICAL"])
    service = NotificationService(channels=[_StubChannel()])
    assert service.should_notify("HIGH") is True
    assert service.should_notify("CRITICAL") is True
    assert service.should_notify("MEDIUM") is False


def test_real_channels_skip_when_env_is_empty(db):
    """Email/Slack/webhook with no credentials must skip, not error."""
    alert = _alert(db)
    for channel in (EmailChannel(), SlackChannel(), WebhookChannel()):
        if channel.configured:
            continue
        result = channel.send("subject", "body", {})
        assert result.status == STATUS_SKIPPED
        assert "not configured" in (result.error or "").lower()


# ----------------------------------------------------------------- monitoring --

def test_registry_lists_all_four_sources():
    names = registry.names()
    for expected in ("cicids2017", "csv_replay", "packet_capture", "zeek"):
        assert expected in names


def test_every_source_reports_status_without_raising():
    for status in registry.statuses():
        assert isinstance(status.available, bool)
        if not status.available:
            assert status.reason, f"{status.name} must explain why it is unavailable"


def test_packet_capture_disabled_by_default_and_explains_itself():
    source = PacketCaptureDataSource(enabled=False)
    status = source.status()
    assert status.available is False
    assert "disabled" in status.reason.lower()
    # Must yield nothing rather than raise.
    assert list(source.iter_flows(limit=5)) == []


def test_packet_capture_reports_missing_dependency():
    source = PacketCaptureDataSource(enabled=True)
    status = source.status()
    ok, _ = scapy_available()
    if ok:
        assert status.available is True
    else:
        assert status.available is False
        assert "scapy" in status.reason.lower() or "npcap" in status.reason.lower()


def test_zeek_unconfigured_reports_reason():
    source = ZeekDataSource(log_dir=None)
    status = source.status()
    assert status.available is False
    assert "not configured" in status.reason.lower()
    assert list(source.iter_flows(limit=5)) == []


def test_zeek_missing_directory_reports_reason(tmp_path):
    source = ZeekDataSource(log_dir=str(tmp_path / "does-not-exist"))
    assert source.status().available is False


def test_zeek_parses_conn_log(tmp_path):
    log_dir = tmp_path / "zeek"
    log_dir.mkdir()
    (log_dir / "conn.log").write_text(
        "#separator \\x09\n"
        "#fields\tts\tuid\tid.orig_h\tid.orig_p\tid.resp_h\tid.resp_p\tproto\t"
        "duration\torig_bytes\tresp_bytes\torig_pkts\tresp_pkts\thistory\n"
        "1700000000.0\tCabc\t10.0.0.1\t4444\t10.0.0.2\t80\ttcp\t"
        "1.5\t500\t900\t5\t7\tShAdDa\n",
        encoding="utf-8",
    )

    source = ZeekDataSource(log_dir=str(log_dir))
    assert source.status().available is True

    events = list(source.iter_flows(limit=5))
    assert len(events) == 1
    event = events[0]
    assert event.source_ip == "10.0.0.1"
    assert event.destination_ip == "10.0.0.2"
    assert event.source_port == 4444
    assert event.destination_port == 80
    assert event.protocol == "TCP"
    assert event.packet_count == 12
    assert event.byte_count == 1400


def test_flow_event_coverage_and_model_readiness():
    complete = FlowEvent(source="t", timestamp="now", features={"a": 1, "b": 2})
    assert complete.model_ready is True
    assert complete.feature_coverage == 1.0

    partial = FlowEvent(
        source="t", timestamp="now", features={"a": 1}, missing_features=["b", "c", "d"]
    )
    assert partial.model_ready is False
    assert partial.feature_coverage == 0.25


def test_flow_event_summary_excludes_feature_vector():
    event = FlowEvent(source="t", timestamp="now", features={"a": 1}, source_ip="1.1.1.1")
    summary = event.summary()
    assert "features" not in summary
    assert summary["source_ip"] == "1.1.1.1"


def test_replay_cursor_advances_and_resets(dataset_available):
    if not dataset_available:
        pytest.skip("CICIDS2017 dataset not present")
    source = CSVReplayDataSource(PROJECT_ROOT)
    first = [event.label for event in source.iter_flows(limit=3)]
    assert source.cursor == 3

    second = [event.label for event in source.iter_flows(limit=3)]
    assert source.cursor == 6
    assert len(first) == len(second) == 3

    source.reset()
    assert source.cursor == 0


def test_replay_yields_model_ready_events(dataset_available):
    if not dataset_available:
        pytest.skip("CICIDS2017 dataset not present")
    source = CSVReplayDataSource(PROJECT_ROOT)
    for event in source.iter_flows(limit=2):
        assert event.model_ready is True
        assert event.missing_features == []
        assert event.label is not None


def test_monitoring_api_sources(client, analyst):
    _, headers = analyst
    body = client.get("/api/monitoring/sources", headers=headers).json()
    assert "sources" in body
    assert "any_available" in body
    assert len(body["sources"]) == 4


def test_monitoring_api_unknown_source_404(client, analyst):
    _, headers = analyst
    assert client.get("/api/monitoring/sources/nope", headers=headers).status_code == 404
    assert (
        client.post("/api/monitoring/scan?source=nope&limit=1", headers=headers).status_code
        == 404
    )


def test_monitoring_api_unavailable_source_409(client, analyst):
    _, headers = analyst
    response = client.post("/api/monitoring/scan?source=zeek&limit=1", headers=headers)
    # 409 when Zeek is not configured; 200 if a Zeek log happens to be present.
    assert response.status_code in {200, 409}


def test_monitoring_api_validates_limit(client, analyst):
    _, headers = analyst
    assert (
        client.post("/api/monitoring/scan?source=csv_replay&limit=0", headers=headers).status_code
        == 422
    )
    assert (
        client.post(
            "/api/monitoring/scan?source=csv_replay&limit=999", headers=headers
        ).status_code
        == 422
    )


# --------------------------------------------------------------- rate limiting --

def test_parse_rate_handles_units():
    assert rate_limit.parse_rate("10/minute") == (10, 60)
    assert rate_limit.parse_rate("5/second") == (5, 1)
    assert rate_limit.parse_rate("100/hour") == (100, 3600)


def test_parse_rate_falls_back_on_garbage():
    assert rate_limit.parse_rate("nonsense") == (60, 60)


def test_fixed_window_limiter_blocks_then_reports_retry_after():
    limiter = rate_limit.FixedWindowLimiter()
    for _ in range(3):
        allowed, _ = limiter.check("k", 3, 60)
        assert allowed is True

    allowed, retry_after = limiter.check("k", 3, 60)
    assert allowed is False
    assert retry_after >= 1


def test_fixed_window_limiter_is_per_key():
    limiter = rate_limit.FixedWindowLimiter()
    assert limiter.check("a", 1, 60)[0] is True
    assert limiter.check("a", 1, 60)[0] is False
    assert limiter.check("b", 1, 60)[0] is True


def test_login_is_rate_limited(client, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    monkeypatch.setattr(settings, "rate_limit_login", "3/minute")
    rate_limit.reset_limits()

    statuses = [
        client.post(
            "/api/auth/login", json={"email": "nobody@example.test", "password": "WrongPass123"}
        ).status_code
        for _ in range(5)
    ]
    assert 429 in statuses, f"expected a 429 among {statuses}"

    blocked = client.post(
        "/api/auth/login", json={"email": "nobody@example.test", "password": "WrongPass123"}
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_rate_limit_can_be_disabled(client, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_enabled", False)
    rate_limit.reset_limits()

    statuses = [
        client.post(
            "/api/auth/login", json={"email": "nobody@example.test", "password": "WrongPass123"}
        ).status_code
        for _ in range(8)
    ]
    assert 429 not in statuses


def test_rate_limit_status_report_has_no_secrets():
    report = rate_limit.status_report()
    assert "enabled" in report
    assert "limits" in report
    serialised = str(report).lower()
    for secret_marker in ("password", "secret", "token", "api_key"):
        assert secret_marker not in serialised
