"""
Shared pytest fixtures.

Each test module gets an isolated SQLite database in a temp directory, so tests
never touch the developer's netshield.db. Rate limiting is disabled by default
and re-enabled explicitly by the tests that exercise it.
"""

import os
import uuid
import tempfile
from pathlib import Path

import pytest

# Environment must be set before backend.app is imported anywhere.
_TMP_DB = Path(tempfile.mkdtemp(prefix="netshield-tests-")) / "test.db"
os.environ.setdefault("NETSHIELD_DATABASE_URL", f"sqlite:///{_TMP_DB}")
os.environ.setdefault("NETSHIELD_RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("NETSHIELD_JWT_SECRET", "test-secret-key-at-least-32-characters-long")

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.core.rate_limit import reset_limits  # noqa: E402
from backend.app.database import Base, SessionLocal, engine  # noqa: E402
from backend.app.main import app  # noqa: E402
from backend.app.models import User  # noqa: E402
from backend.app.core.security import hash_password  # noqa: E402
from backend.app.services.analytics_service import AnalyticsService  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[1]

GOOD_PASSWORD = "Str0ngPassphrase1"


@pytest.fixture(autouse=True)
def _clean_state():
    """Reset rate-limit counters and analytics cache between tests."""
    reset_limits()
    AnalyticsService.clear_cache()
    yield
    reset_limits()


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def unique_email(prefix: str = "analyst") -> str:
    """
    Collision-proof test email.

    Uses a random suffix rather than a module counter: pytest imports conftest
    as `conftest` while test modules import it as `tests.conftest`, giving two
    module objects - a shared counter would restart and produce duplicates.
    """
    return f"{prefix}-{uuid.uuid4().hex[:12]}@example.test"


@pytest.fixture
def analyst(client):
    """Register a fresh analyst and return (email, auth_headers)."""
    email = unique_email("analyst")
    response = client.post(
        "/api/auth/register", json={"email": email, "password": GOOD_PASSWORD}
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return email, {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin(client, db):
    """Create an admin user directly in the database and return (email, headers)."""
    email = unique_email("admin")
    db.add(
        User(
            email=email,
            password_hash=hash_password(GOOD_PASSWORD),
            role="admin",
            is_active=True,
        )
    )
    db.commit()
    response = client.post(
        "/api/auth/login", json={"email": email, "password": GOOD_PASSWORD}
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return email, {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def dataset_available() -> bool:
    return (PROJECT_ROOT / "CICIDS2017_improved").exists() and any(
        (PROJECT_ROOT / "CICIDS2017_improved").glob("*.csv")
    )


@pytest.fixture(scope="session")
def models_available() -> bool:
    models = PROJECT_ROOT / "models"
    return (models / "classifier.joblib").exists() and (models / "anomaly.joblib").exists()


@pytest.fixture(scope="session")
def real_features(dataset_available):
    """A real feature vector from the corpus, or skip if the dataset is absent."""
    if not dataset_available:
        pytest.skip("CICIDS2017 dataset not present")
    from backend.app.monitoring import registry

    source = registry.get("csv_replay")
    for event in source.iter_flows(limit=1):
        return event.features, event.label
    pytest.skip("Dataset produced no rows")
