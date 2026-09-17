"""
End-to-end API coverage: prediction workflow, analytics, reports, streaming,
admin, error handling and legacy compatibility.
"""

import json

import pytest

from backend.app.models import Alert, AuditLog, Detection


# ------------------------------------------------------------------- health --

def test_health_and_ready(client):
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/ready").json()["status"] == "ready"


def test_openapi_schema_builds(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "paths" in response.json()


# -------------------------------------------------------- prediction workflow --

def test_prediction_status(client, analyst):
    _, headers = analyst
    body = client.get("/api/predictions/status", headers=headers).json()
    assert "ready" in body
    assert "alert_threshold" in body


def test_expected_features_are_grouped(client, analyst, models_available):
    if not models_available:
        pytest.skip("Trained models not present")
    _, headers = analyst
    body = client.get("/api/predictions/features", headers=headers).json()

    assert body["feature_count"] > 0
    assert len(body["groups"]) > 1, "features must be grouped for the form UI"
    # Identity columns must never be asked for.
    for leaked in ("Src IP", "Dst IP", "Flow ID", "Timestamp"):
        assert leaked not in body["features"]


def test_prediction_rejects_empty_features(client, analyst):
    _, headers = analyst
    response = client.post("/api/predictions", headers=headers, json={"features": {}})
    assert response.status_code == 422


def test_prediction_rejects_missing_body(client, analyst):
    _, headers = analyst
    response = client.post("/api/predictions", headers=headers, json={})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert "fields" in body["details"]


def test_full_prediction_workflow(client, analyst, db, models_available, real_features):
    if not models_available:
        pytest.skip("Trained models not present")
    email, headers = analyst
    features, label = real_features

    response = client.post(
        "/api/predictions",
        headers=headers,
        json={
            "features": features,
            "source_ip": "10.9.9.1",
            "destination_ip": "10.9.9.2",
        },
    )
    assert response.status_code == 200
    body = response.json()

    # Required response contract.
    for key in (
        "prediction",
        "confidence",
        "attack_probability",
        "is_anomaly",
        "risk_score",
        "severity",
        "timestamp",
        "model_version",
    ):
        assert key in body, f"missing {key}"

    assert 0 <= body["risk_score"] <= 100
    assert body["severity"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["explanation"]["risk_score"] == body["risk_score"]

    # A detection row must exist.
    detection = db.query(Detection).filter(Detection.id == body["detection_id"]).first()
    assert detection is not None
    assert detection.prediction == body["prediction"]
    assert json.loads(detection.features_json)

    # The prediction must be audited.
    audit = (
        db.query(AuditLog)
        .filter(AuditLog.user_email == email, AuditLog.action == "prediction")
        .order_by(AuditLog.id.desc())
        .first()
    )
    assert audit is not None


def test_alert_created_only_above_threshold(client, analyst, db, models_available, real_features):
    if not models_available:
        pytest.skip("Trained models not present")
    _, headers = analyst
    features, _ = real_features

    body = client.post("/api/predictions", headers=headers, json={"features": features}).json()
    threshold = client.get("/api/predictions/status", headers=headers).json()["alert_threshold"]

    if body["risk_score"] >= threshold:
        assert body["alert_id"] is not None
        alert = db.query(Alert).filter(Alert.id == body["alert_id"]).first()
        assert alert.risk_score == body["risk_score"]
        assert alert.severity == body["severity"]
    else:
        assert body["alert_id"] is None, "an alert must not be raised below the threshold"


def test_explain_endpoint_matches_scoring(client, analyst):
    _, headers = analyst
    response = client.post(
        "/api/predictions/explain",
        headers=headers,
        json={
            "is_anomaly": True,
            "attack_probability": 0.9,
            "confidence": 0.95,
            "prediction": "DDoS",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["risk_score"] == 100
    assert body["severity"] == "CRITICAL"
    assert len(body["components"]) == 4


def test_detections_listing_and_detail(client, analyst, db):
    _, headers = analyst
    detection = Detection(
        prediction="Portscan",
        confidence=0.8,
        risk_score=70,
        severity="HIGH",
        is_anomaly=True,
        features_json='{"a": 1}',
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)

    listed = client.get("/api/predictions/detections?limit=5", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    detail = client.get(f"/api/predictions/detections/{detection.id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["prediction"] == "Portscan"

    assert client.get("/api/predictions/detections/9999999", headers=headers).status_code == 404


def test_risk_policy_endpoint(client, analyst):
    _, headers = analyst
    body = client.get("/api/predictions/risk-policy", headers=headers).json()
    assert body["anomaly_points"] == 35
    assert body["severity_thresholds"]["HIGH"] == 65


# ---------------------------------------------------------------- analytics --

def test_overview_shape(client, analyst):
    _, headers = analyst
    body = client.get("/api/analytics/overview", headers=headers).json()
    for key in (
        "metrics",
        "severity_distribution",
        "alert_status_distribution",
        "attack_trends",
        "top_attacks",
        "top_source_ips",
        "top_destination_ips",
        "recent_detections",
    ):
        assert key in body, f"missing {key}"


def test_security_metrics_are_non_negative_integers(client, analyst):
    _, headers = analyst
    metrics = client.get("/api/analytics/security-metrics", headers=headers).json()
    for key in (
        "total_traffic",
        "benign_traffic",
        "anomalous_traffic",
        "total_attacks",
        "high_risk_detections",
        "critical_alerts",
        "open_incidents",
    ):
        assert isinstance(metrics[key], int)
        assert metrics[key] >= 0


def test_metrics_are_internally_consistent(client, analyst):
    _, headers = analyst
    metrics = client.get("/api/analytics/security-metrics", headers=headers).json()
    assert metrics["benign_traffic"] <= metrics["total_traffic"]
    assert metrics["total_attacks"] == metrics["total_traffic"] - metrics["benign_traffic"]


def test_traffic_analytics_reports_real_counts(client, analyst, dataset_available):
    _, headers = analyst
    body = client.get("/api/analytics/traffic", headers=headers).json()

    if not dataset_available:
        assert body["status"] == "not_found"
        assert body["message"]
        return

    assert body["status"] == "ready"
    assert body["total_records_sampled"] > 0
    # Sampled count must never exceed the configured limit.
    assert body["total_records_sampled"] <= body["sample_limit"] + body.get("file_count", 0) * 50_000
    assert body["normal_records"] + body["anomalous_records"] == body["total_records_sampled"]
    assert len(body["attack_distribution"]) > 0


def test_traffic_analytics_is_cached(client, analyst, dataset_available):
    if not dataset_available:
        pytest.skip("CICIDS2017 dataset not present")
    _, headers = analyst
    first = client.get("/api/analytics/traffic", headers=headers).json()
    second = client.get("/api/analytics/traffic", headers=headers).json()
    assert first["cached"] is False
    assert second["cached"] is True, "repeat reads must hit the cache, not rescan the corpus"


def test_analytics_endpoints_respond(client, analyst):
    _, headers = analyst
    for path in (
        "/api/analytics/attack-trends",
        "/api/analytics/severity-distribution",
        "/api/analytics/top-attacks",
        "/api/analytics/top-ips",
        "/api/analytics/detections-by-type",
        "/api/analytics/recent-detections",
        "/api/analytics/risk-policy",
        "/api/analytics/model-metrics",
    ):
        assert client.get(path, headers=headers).status_code == 200, path


def test_model_metrics_are_not_hardcoded(client, analyst, models_available):
    if not models_available:
        pytest.skip("Trained models not present")
    _, headers = analyst
    body = client.get("/api/analytics/model-metrics", headers=headers).json()
    assert body["status"] == "trained"
    assert 0.0 <= body["accuracy"] <= 1.0
    assert 0.0 <= body["f1_macro"] <= 1.0
    assert body["confusion_matrix"], "the stored confusion matrix must be returned"
    assert len(body["confusion_matrix"]) == len(body["classes"])


def test_analytics_validates_hours_range(client, analyst):
    _, headers = analyst
    assert client.get("/api/analytics/overview?hours=0", headers=headers).status_code == 422
    assert client.get("/api/analytics/overview?hours=99999", headers=headers).status_code == 422


# ------------------------------------------------------------------ reports --

def test_report_formats_declare_availability(client, analyst):
    _, headers = analyst
    body = client.get("/api/reports/formats", headers=headers).json()
    assert body["json"]["available"] is True
    assert body["csv"]["available"] is True
    assert isinstance(body["pdf"]["available"], bool)
    if not body["pdf"]["available"]:
        assert "reportlab" in body["pdf"]["reason"]


def test_report_preview_is_built_from_data(client, analyst):
    _, headers = analyst
    body = client.get("/api/reports/preview?days=7", headers=headers).json()
    assert "traffic_statistics" in body
    assert "recommendations" in body
    assert isinstance(body["recommendations"], list)
    assert body["summary"]


def test_report_create_list_and_export(client, analyst):
    _, headers = analyst
    created = client.post("/api/reports", headers=headers, json={"days": 7})
    assert created.status_code == 201
    report_id = created.json()["id"]

    listed = client.get("/api/reports", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    as_json = client.get(f"/api/reports/{report_id}?format=json", headers=headers)
    assert as_json.status_code == 200
    assert "data" in as_json.json()

    as_csv = client.get(f"/api/reports/{report_id}?format=csv", headers=headers)
    assert as_csv.status_code == 200
    assert as_csv.headers["content-type"].startswith("text/csv")
    assert "section,metric,value" in as_csv.text


def test_report_pdf_reports_unavailability_cleanly(client, analyst):
    _, headers = analyst
    report_id = client.post("/api/reports", headers=headers, json={"days": 1}).json()["id"]
    response = client.get(f"/api/reports/{report_id}?format=pdf", headers=headers)
    from backend.app.services import pdf_available

    if pdf_available():
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    else:
        assert response.status_code == 503
        assert "reportlab" in response.json()["detail"]


def test_report_404_and_bad_format(client, analyst):
    _, headers = analyst
    assert client.get("/api/reports/9999999", headers=headers).status_code == 404
    report_id = client.post("/api/reports", headers=headers, json={"days": 1}).json()["id"]
    assert (
        client.get(f"/api/reports/{report_id}?format=xml", headers=headers).status_code == 422
    )


def test_report_generation_is_audited(client, analyst, db):
    email, headers = analyst
    client.post("/api/reports", headers=headers, json={"days": 3})
    entry = (
        db.query(AuditLog)
        .filter(AuditLog.user_email == email, AuditLog.action == "report_generated")
        .first()
    )
    assert entry is not None


# ---------------------------------------------------------------- streaming --

def test_stream_status_lists_transports(client, analyst):
    _, headers = analyst
    body = client.get("/api/stream/status", headers=headers).json()
    for transport in ("websocket", "sse", "polling"):
        assert body[transport]["available"] is True
        assert body[transport]["path"]


def test_polling_fallback_works(client, analyst):
    _, headers = analyst
    body = client.get("/api/stream/events", headers=headers).json()
    assert "events" in body
    assert "last_event_id" in body


def test_prediction_publishes_an_event(client, analyst, models_available, real_features):
    if not models_available:
        pytest.skip("Trained models not present")
    _, headers = analyst
    features, _ = real_features

    before = client.get("/api/stream/events", headers=headers).json()["last_event_id"]
    client.post("/api/predictions", headers=headers, json={"features": features})
    after = client.get("/api/stream/events", headers=headers).json()

    assert after["last_event_id"] > before
    assert any(event["type"] == "detection" for event in after["events"])


def test_sse_rejects_bad_token(client):
    response = client.get("/api/stream/sse?token=not-a-token")
    assert response.status_code == 401


def test_websocket_rejects_bad_token(client):
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/stream/ws?token=bad") as websocket:
            websocket.receive_json()


def test_websocket_accepts_valid_token(client, analyst):
    _, headers = analyst
    token = headers["Authorization"].split(" ", 1)[1]
    with client.websocket_connect(f"/api/stream/ws?token={token}") as websocket:
        message = websocket.receive_json()
        assert message["type"] == "connected"


# -------------------------------------------------------------------- admin --

def test_admin_user_management(client, admin, analyst):
    _, admin_headers = admin
    analyst_email, _ = analyst

    users = client.get("/api/admin/users", headers=admin_headers).json()
    target = next(item for item in users if item["email"] == analyst_email)
    user_id = target["id"]

    promoted = client.post(f"/api/admin/users/{user_id}/promote-admin", headers=admin_headers)
    assert promoted.json()["role"] == "admin"

    demoted = client.post(f"/api/admin/users/{user_id}/demote-analyst", headers=admin_headers)
    assert demoted.json()["role"] == "analyst"

    deactivated = client.post(f"/api/admin/users/{user_id}/deactivate", headers=admin_headers)
    assert deactivated.json()["is_active"] is False

    reactivated = client.post(f"/api/admin/users/{user_id}/activate", headers=admin_headers)
    assert reactivated.json()["is_active"] is True


def test_admin_patch_rejects_invalid_role(client, admin, analyst):
    _, admin_headers = admin
    analyst_email, _ = analyst
    users = client.get("/api/admin/users", headers=admin_headers).json()
    user_id = next(item for item in users if item["email"] == analyst_email)["id"]

    response = client.patch(
        f"/api/admin/users/{user_id}", headers=admin_headers, json={"role": "superuser"}
    )
    assert response.status_code == 400


def test_admin_user_404(client, admin):
    _, headers = admin
    assert client.get("/api/admin/users/9999999", headers=headers).status_code == 404


def test_admin_audit_log_query(client, admin):
    _, headers = admin
    body = client.get("/api/admin/audit-logs?limit=10", headers=headers).json()
    assert "total" in body
    assert isinstance(body["logs"], list)

    actions = client.get("/api/admin/audit-logs/actions", headers=headers).json()
    assert isinstance(actions["actions"], list)


def test_admin_user_activity(client, admin, analyst):
    _, admin_headers = admin
    analyst_email, _ = analyst
    users = client.get("/api/admin/users", headers=admin_headers).json()
    user_id = next(item for item in users if item["email"] == analyst_email)["id"]

    body = client.get(f"/api/admin/users/{user_id}/activity", headers=admin_headers).json()
    assert body["user"]["email"] == analyst_email
    assert isinstance(body["activity"], list)


def test_system_config_exposes_no_secrets(client, admin):
    _, headers = admin
    response = client.get("/api/admin/system-config", headers=headers)
    assert response.status_code == 200

    body = response.json()
    assert "application" in body
    assert "notifications" in body
    assert "threat_intelligence" in body
    assert "warnings" in body

    # The JWT secret, SMTP password and API key values must never appear.
    from backend.app.core.config import settings

    serialised = json.dumps(body)
    assert settings.jwt_secret not in serialised
    if settings.smtp_password:
        assert settings.smtp_password not in serialised
    if settings.threat_intel_api_key:
        assert settings.threat_intel_api_key not in serialised


def test_model_registry_sync(client, admin, models_available):
    _, headers = admin
    response = client.post("/api/admin/models/sync", headers=headers)

    if not models_available:
        assert response.status_code == 409
        return

    assert response.status_code == 200
    listed = client.get("/api/admin/models", headers=headers).json()
    assert listed["active_on_disk"]["ready"] is True
    assert len(listed["registered_versions"]) >= 1

    # Syncing twice must not duplicate registry rows.
    again = client.post("/api/admin/models/sync", headers=headers).json()
    assert again["created"] == []


# ---------------------------------------------------------- legacy endpoints --

def test_legacy_endpoints_still_work(client, analyst, models_available):
    _, headers = analyst
    assert client.get("/api/traffic/analytics", headers=headers).status_code == 200
    if models_available:
        assert client.get("/api/ml/model-info", headers=headers).status_code == 200
        assert client.get("/api/ml/metrics", headers=headers).status_code == 200


def test_legacy_endpoints_require_auth(client):
    assert client.get("/api/traffic/analytics").status_code == 401
    assert client.get("/api/ml/model-info").status_code == 401
    assert client.post("/api/ml/predict", json={"features": {"a": 1}}).status_code == 401


def test_legacy_predict_returns_original_shape(
    client, analyst, models_available, real_features
):
    if not models_available:
        pytest.skip("Trained models not present")
    _, headers = analyst
    features, _ = real_features

    body = client.post("/api/ml/predict", headers=headers, json={"features": features}).json()
    assert set(body) == {
        "prediction",
        "is_anomaly",
        "confidence",
        "attack_probability",
        "risk_score",
        "severity",
    }


# ------------------------------------------------------------ error handling --

def test_unknown_route_returns_404(client, analyst):
    _, headers = analyst
    assert client.get("/api/does-not-exist", headers=headers).status_code == 404


def test_validation_errors_are_structured(client):
    response = client.post("/api/auth/login", json={"email": "x@y.z"})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert isinstance(body["details"]["fields"], list)


def test_predict_without_models_returns_503(client, analyst, monkeypatch, tmp_path):
    """A missing model must surface as 503, not a 500 stack trace."""
    from backend.app.api import predictions

    monkeypatch.setattr(predictions._ml_service.detection_service, "model_root", tmp_path)
    monkeypatch.setattr(
        predictions._ml_service.detection_service,
        "classifier_path",
        tmp_path / "classifier.joblib",
    )
    monkeypatch.setattr(
        predictions._ml_service.detection_service,
        "anomaly_path",
        tmp_path / "anomaly.joblib",
    )

    _, headers = analyst
    response = client.post("/api/predictions", headers=headers, json={"features": {"a": 1}})
    assert response.status_code == 503
    assert "train_models" in response.json()["detail"]
