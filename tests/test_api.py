from fastapi.testclient import TestClient

from backend.app.main import app


def test_health_and_protected_route():
    client = TestClient(app)
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/api/ml/model-info").status_code == 401
