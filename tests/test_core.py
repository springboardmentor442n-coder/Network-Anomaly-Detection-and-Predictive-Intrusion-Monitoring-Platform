from fastapi.testclient import TestClient

from backend.app.main import app
from ml.prediction_service import get_risk_level


def test_risk_level_boundaries():
    assert get_risk_level(0) == "LOW"
    assert get_risk_level(24.99) == "LOW"
    assert get_risk_level(25) == "MEDIUM"
    assert get_risk_level(49.99) == "MEDIUM"
    assert get_risk_level(50) == "HIGH"
    assert get_risk_level(74.99) == "HIGH"
    assert get_risk_level(75) == "CRITICAL"
    assert get_risk_level(100) == "CRITICAL"


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy"
    }


def test_root_endpoint():
    with TestClient(app) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "NetShield AI API is running"
    }