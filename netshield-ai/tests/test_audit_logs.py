"""Tests for audit logs metadata mapping, search filtering, and endpoint serialization."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.models import AuditLog, User
from app.api.routes.audit_logs import _format_resource
from app.core.security import create_access_token
from app.database.session import SessionLocal

def test_format_resource_helper():
    # 1. Dataset upload/training details
    log_dataset = AuditLog(
        action="MODEL_TRAINING_STARTED",
        details={"filename": "CICIDS2017_sample.csv", "version": "v1"}
    )
    assert _format_resource(log_dataset) == "Dataset (CICIDS2017_sample.csv)"

    # 2. Incident with title
    log_incident = AuditLog(
        action="INCIDENT_CREATED",
        resource_type="incident",
        resource_id="12345678-abcd",
        details={"title": "PortScan Spike"}
    )
    assert _format_resource(log_incident) == "Incident: PortScan Spike"

    # 3. Resource without details but with type and ID
    log_alert = AuditLog(
        action="ALERT_UPDATED",
        resource_type="alert",
        resource_id="e3a8964d-65ac-468b-9ec3"
    )
    assert _format_resource(log_alert) == "Alert #e3a8964d"

    # 4. Auth session login
    log_login = AuditLog(
        action="LOGIN",
        resource_type=None,
        resource_id=None
    )
    assert _format_resource(log_login) == "User Session"

    # 5. Missing/blank metadata
    log_empty = AuditLog(
        action="CUSTOM_EVENT",
        resource_type=None,
        resource_id=None,
        details=None
    )
    assert _format_resource(log_empty) is None

def test_audit_logs_endpoint_serialization_and_search():
    client = TestClient(app)
    db = SessionLocal()
    user = db.query(User).filter(User.is_active == True).first()
    token = create_access_token({"sub": user.id if user else "admin", "role": user.role if user else "ADMIN"})
    headers = {"Authorization": f"Bearer {token}"}
    db.close()

    # Test listing audit logs
    response = client.get("/api/audit-logs/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)

    if len(data["items"]) > 0:
        first_item = data["items"][0]
        # Verify required table columns are all present in each record
        assert "timestamp" in first_item
        assert "user" in first_item
        assert "action" in first_item
        assert "resource" in first_item
        assert "ip" in first_item
        assert "status" in first_item

        # Verify underlying db keys are preserved for backward compatibility
        assert "created_at" in first_item
        assert "username" in first_item
        assert "ip_address" in first_item
        assert "result" in first_item

    # Test filtering by specific action
    response_filter = client.get("/api/audit-logs/?action=LOGIN", headers=headers)
    assert response_filter.status_code == 200
    filter_data = response_filter.json()
    for item in filter_data["items"]:
        assert item["action"] == "LOGIN"
