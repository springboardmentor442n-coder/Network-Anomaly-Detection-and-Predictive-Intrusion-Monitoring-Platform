"""Alert and incident lifecycle, via services and the API."""

import pytest

from backend.app.core.errors import NotFoundError, ValidationError
from backend.app.models import Alert, Detection, Incident
from backend.app.services import AlertService, IncidentService


def _detection(db, severity="HIGH", risk=80, prediction="DoS Hulk"):
    detection = Detection(
        prediction=prediction,
        confidence=0.95,
        risk_score=risk,
        severity=severity,
        is_anomaly=True,
        features_json="{}",
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)
    return detection


# ------------------------------------------------------------- alert service --

def test_alert_created_from_detection(db):
    detection = _detection(db)
    alert = AlertService.create_alert_from_detection(
        db, detection.id, detection, source_ip="10.1.1.1", destination_ip="10.1.1.2"
    )
    assert alert.status == "NEW"
    assert alert.severity == "HIGH"
    assert alert.detection_id == detection.id
    assert alert.source_ip == "10.1.1.1"
    assert alert.risk_score == 80
    assert alert.description


def test_get_alert_raises_for_unknown_id(db):
    with pytest.raises(NotFoundError):
        AlertService.get_alert(db, 10_000_001)


def test_acknowledge_records_actor_and_timestamp(db):
    detection = _detection(db)
    alert = AlertService.create_alert_from_detection(db, detection.id, detection)
    updated = AlertService.acknowledge_alert(db, alert.id, "who@example.test")
    assert updated.status == "ACKNOWLEDGED"
    assert updated.acknowledged_by == "who@example.test"
    assert updated.acknowledged_at is not None


def test_resolve_records_actor_and_timestamp(db):
    detection = _detection(db)
    alert = AlertService.create_alert_from_detection(db, detection.id, detection)
    updated = AlertService.resolve_alert(db, alert.id, "who@example.test", notes="handled")
    assert updated.status == "RESOLVED"
    assert updated.resolved_by == "who@example.test"
    assert updated.resolved_at is not None
    assert updated.notes == "handled"


def test_false_positive_transition(db):
    detection = _detection(db)
    alert = AlertService.create_alert_from_detection(db, detection.id, detection)
    updated = AlertService.mark_false_positive(db, alert.id, "who@example.test")
    assert updated.status == "FALSE_POSITIVE"


def test_invalid_status_is_rejected(db):
    detection = _detection(db)
    alert = AlertService.create_alert_from_detection(db, detection.id, detection)
    with pytest.raises(ValidationError):
        AlertService.update_alert_status(db, alert.id, "BOGUS", "who@example.test")


def test_listing_rejects_invalid_filters(db):
    with pytest.raises(ValidationError):
        AlertService.list_alerts(db, status="NOPE")
    with pytest.raises(ValidationError):
        AlertService.list_alerts(db, severity="NOPE")


def test_listing_filters_and_paginates(db):
    detection = _detection(db, severity="CRITICAL", risk=95)
    for _ in range(3):
        AlertService.create_alert_from_detection(db, detection.id, detection)

    total, rows = AlertService.list_alerts(db, severity="CRITICAL", limit=2)
    assert total >= 3
    assert len(rows) == 2
    assert all(row.severity == "CRITICAL" for row in rows)


def test_alert_stats_are_counts(db):
    stats = AlertService.get_alert_stats(db)
    for key in ("total_alerts", "new_alerts", "critical_alerts", "high_alerts"):
        assert isinstance(stats[key], int)
        assert stats[key] >= 0


# ---------------------------------------------------------- incident service --

def test_create_incident(db):
    incident = IncidentService.create_incident(
        db, title="Port scan", severity="HIGH", description="x", priority=2
    )
    assert incident.status == "OPEN"
    assert incident.priority == 2


def test_create_incident_validates_severity(db):
    with pytest.raises(ValidationError):
        IncidentService.create_incident(db, title="x", severity="NOPE")


@pytest.mark.parametrize("priority", [0, 11, -1])
def test_create_incident_validates_priority(db, priority):
    with pytest.raises(ValidationError):
        IncidentService.create_incident(db, title="x", severity="LOW", priority=priority)


def test_update_incident_sets_closed_at(db):
    incident = IncidentService.create_incident(db, title="x", severity="LOW")
    assert incident.closed_at is None
    updated = IncidentService.update_incident(db, incident.id, status="CLOSED")
    assert updated.status == "CLOSED"
    assert updated.closed_at is not None


def test_update_incident_rejects_bad_status(db):
    incident = IncidentService.create_incident(db, title="x", severity="LOW")
    with pytest.raises(ValidationError):
        IncidentService.update_incident(db, incident.id, status="NOPE")


def test_notes_are_ordered_newest_first(db):
    incident = IncidentService.create_incident(db, title="x", severity="LOW")
    IncidentService.add_note(db, incident.id, "a@example.test", "first")
    IncidentService.add_note(db, incident.id, "b@example.test", "second")
    notes = IncidentService.get_incident_notes(db, incident.id)
    assert len(notes) == 2
    assert {note.note for note in notes} == {"first", "second"}


def test_note_on_missing_incident_raises(db):
    with pytest.raises(NotFoundError):
        IncidentService.add_note(db, 10_000_002, "a@example.test", "x")


def test_link_alert_is_idempotent(db):
    detection = _detection(db)
    alert = AlertService.create_alert_from_detection(db, detection.id, detection)
    incident = IncidentService.create_incident(db, title="x", severity="LOW")

    first = IncidentService.link_alert(db, incident.id, alert.id)
    second = IncidentService.link_alert(db, incident.id, alert.id)
    assert first.id == second.id, "linking twice must not create a duplicate row"


def test_link_missing_alert_raises(db):
    incident = IncidentService.create_incident(db, title="x", severity="LOW")
    with pytest.raises(NotFoundError):
        IncidentService.link_alert(db, incident.id, 10_000_003)


# --------------------------------------------------------------------- api ----

def test_alert_api_roundtrip(client, analyst, db):
    _, headers = analyst
    detection = _detection(db, severity="CRITICAL", risk=92)
    alert = AlertService.create_alert_from_detection(db, detection.id, detection)

    listed = client.get("/api/alerts?severity=CRITICAL", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    fetched = client.get(f"/api/alerts/{alert.id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["id"] == alert.id

    acked = client.post(f"/api/alerts/{alert.id}/acknowledge", headers=headers)
    assert acked.status_code == 200
    assert acked.json()["status"] == "ACKNOWLEDGED"

    resolved = client.post(f"/api/alerts/{alert.id}/resolve", headers=headers)
    assert resolved.json()["status"] == "RESOLVED"


def test_alert_api_404_for_unknown(client, analyst):
    _, headers = analyst
    assert client.get("/api/alerts/10000004", headers=headers).status_code == 404


def test_alert_api_rejects_bad_filter(client, analyst):
    _, headers = analyst
    assert client.get("/api/alerts?status=NOPE", headers=headers).status_code == 400


def test_incident_api_roundtrip(client, analyst):
    _, headers = analyst

    created = client.post(
        "/api/incidents",
        headers=headers,
        json={"title": "Suspected scan", "severity": "HIGH", "priority": 3},
    )
    assert created.status_code == 201
    incident_id = created.json()["id"]

    noted = client.post(
        f"/api/incidents/{incident_id}/notes", headers=headers, json={"note": "triaging"}
    )
    assert noted.status_code == 200

    detail = client.get(f"/api/incidents/{incident_id}", headers=headers)
    assert detail.status_code == 200
    assert len(detail.json()["notes"]) == 1

    patched = client.patch(
        f"/api/incidents/{incident_id}", headers=headers, json={"status": "INVESTIGATING"}
    )
    assert patched.json()["status"] == "INVESTIGATING"


def test_incident_api_validates_payload(client, analyst):
    _, headers = analyst
    bad_severity = client.post(
        "/api/incidents", headers=headers, json={"title": "x", "severity": "NOPE"}
    )
    assert bad_severity.status_code == 400

    empty_note = client.post(
        "/api/incidents", headers=headers, json={"title": "x", "severity": "LOW"}
    )
    incident_id = empty_note.json()["id"]
    assert (
        client.post(
            f"/api/incidents/{incident_id}/notes", headers=headers, json={"note": ""}
        ).status_code
        == 422
    )


def test_incident_api_404(client, analyst):
    _, headers = analyst
    assert client.get("/api/incidents/10000005", headers=headers).status_code == 404


def test_alert_response_exposes_triage_fields(client, analyst, db):
    """
    The Alerts UI shows who acknowledged/resolved an alert and its investigation
    note, so the response schema must carry those fields.
    """
    _, headers = analyst
    detection = _detection(db)
    alert = AlertService.create_alert_from_detection(db, detection.id, detection)

    fresh = client.get(f"/api/alerts/{alert.id}", headers=headers).json()
    for field in (
        "notes",
        "acknowledged_at",
        "acknowledged_by",
        "resolved_at",
        "resolved_by",
    ):
        assert field in fresh, f"AlertResponse must expose {field}"

    acked = client.post(f"/api/alerts/{alert.id}/acknowledge", headers=headers).json()
    assert acked["acknowledged_by"]
    assert acked["acknowledged_at"]

    resolved = client.patch(
        f"/api/alerts/{alert.id}",
        headers=headers,
        json={"status": "RESOLVED", "notes": "confirmed benign scanner"},
    ).json()
    assert resolved["resolved_by"]
    assert resolved["notes"] == "confirmed benign scanner"
