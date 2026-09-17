"""Authentication, password policy, JWT handling and RBAC."""

import os
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from backend.app.core.config import settings
from backend.app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from tests.conftest import GOOD_PASSWORD, unique_email


# --------------------------------------------------------------- registration --

def test_register_returns_token_and_analyst_role(client):
    email = unique_email()
    response = client.post(
        "/api/auth/register", json={"email": email, "password": GOOD_PASSWORD}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    payload = decode_access_token(token)
    assert payload["sub"] == email
    assert payload["role"] == "analyst", "registration must never grant admin"


def test_register_rejects_duplicate_email(client):
    email = unique_email()
    first = client.post("/api/auth/register", json={"email": email, "password": GOOD_PASSWORD})
    assert first.status_code == 200
    second = client.post("/api/auth/register", json={"email": email, "password": GOOD_PASSWORD})
    assert second.status_code == 409


def test_register_normalizes_email_case(client):
    email = unique_email()
    client.post("/api/auth/register", json={"email": email.upper(), "password": GOOD_PASSWORD})
    login = client.post("/api/auth/login", json={"email": email.lower(), "password": GOOD_PASSWORD})
    assert login.status_code == 200


@pytest.mark.parametrize(
    "password",
    ["short1A", "alllettersonly", "12345678", "password"],
)
def test_register_rejects_weak_passwords(client, password):
    response = client.post(
        "/api/auth/register", json={"email": unique_email(), "password": password}
    )
    assert response.status_code == 422


def test_password_policy_messages():
    assert validate_password_strength(GOOD_PASSWORD) == []
    assert any("digit" in problem for problem in validate_password_strength("onlyletters"))
    assert any("letter" in problem for problem in validate_password_strength("12345678"))
    assert any("characters long" in problem for problem in validate_password_strength("Ab1"))
    assert any("commonly used" in problem for problem in validate_password_strength("password"))


# ---------------------------------------------------------------------- login --

def test_login_succeeds_with_correct_credentials(client, analyst):
    email, _ = analyst
    response = client.post("/api/auth/login", json={"email": email, "password": GOOD_PASSWORD})
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"


def test_login_rejects_wrong_password(client, analyst):
    email, _ = analyst
    response = client.post("/api/auth/login", json={"email": email, "password": "WrongPass123"})
    assert response.status_code == 401


def test_login_does_not_leak_account_existence(client, analyst):
    email, _ = analyst
    wrong_password = client.post(
        "/api/auth/login", json={"email": email, "password": "WrongPass123"}
    )
    unknown_user = client.post(
        "/api/auth/login", json={"email": "nobody@example.test", "password": "WrongPass123"}
    )
    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json()["detail"] == unknown_user.json()["detail"]


def test_deactivated_user_cannot_log_in(client, admin, db):
    from backend.app.models import User

    email = unique_email("deact")
    client.post("/api/auth/register", json={"email": email, "password": GOOD_PASSWORD})
    user = db.query(User).filter(User.email == email).first()
    user.is_active = False
    db.commit()

    response = client.post("/api/auth/login", json={"email": email, "password": GOOD_PASSWORD})
    assert response.status_code == 403


# ------------------------------------------------------------------------ jwt --

def test_hash_and_verify_password_roundtrip():
    encoded = hash_password("correct-horse-1")
    assert verify_password("correct-horse-1", encoded)
    assert not verify_password("wrong-horse-1", encoded)


def test_password_hash_is_salted():
    assert hash_password("same-password-1") != hash_password("same-password-1")


def test_password_hash_never_contains_plaintext():
    encoded = hash_password("SuperSecret123")
    assert "SuperSecret123" not in encoded
    assert encoded.startswith("pbkdf2_sha256$")


def test_verify_password_handles_malformed_hash():
    assert not verify_password("anything", "not-a-valid-hash")
    assert not verify_password("anything", "md5$1$abc$def")


def test_protected_route_requires_token(client):
    assert client.get("/api/predictions/model-info").status_code == 401
    assert client.get("/api/alerts").status_code == 401
    assert client.get("/api/analytics/overview").status_code == 401


def test_invalid_token_is_rejected(client):
    response = client.get(
        "/api/predictions/model-info", headers={"Authorization": "Bearer not-a-jwt"}
    )
    assert response.status_code == 401


def test_expired_token_is_rejected(client, analyst):
    email, _ = analyst
    expired = jwt.encode(
        {
            "sub": email,
            "role": "analyst",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    response = client.get(
        "/api/predictions/model-info", headers={"Authorization": f"Bearer {expired}"}
    )
    assert response.status_code == 401


def test_token_signed_with_other_secret_is_rejected(client, analyst):
    email, _ = analyst
    forged = jwt.encode(
        {
            "sub": email,
            "role": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        },
        "a-different-secret-entirely",
        algorithm="HS256",
    )
    response = client.get("/api/admin/users", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_token_carries_expiry():
    token = create_access_token("x@example.test", "analyst")
    payload = decode_access_token(token)
    assert "exp" in payload


# ----------------------------------------------------------------------- rbac --

def test_analyst_cannot_reach_admin_endpoints(client, analyst):
    _, headers = analyst
    for path in (
        "/api/admin/users",
        "/api/admin/stats",
        "/api/admin/audit-logs",
        "/api/admin/system-config",
        "/api/admin/models",
    ):
        assert client.get(path, headers=headers).status_code == 403, path


def test_admin_can_reach_admin_endpoints(client, admin):
    _, headers = admin
    assert client.get("/api/admin/users", headers=headers).status_code == 200
    assert client.get("/api/admin/stats", headers=headers).status_code == 200
    assert client.get("/api/admin/system-config", headers=headers).status_code == 200


def test_analyst_cannot_create_threat_indicator(client, analyst):
    _, headers = analyst
    response = client.post(
        "/api/threat-intel/indicators",
        headers=headers,
        json={"indicator_type": "IP", "indicator_value": "10.0.0.9"},
    )
    assert response.status_code == 403


# ------------------------------------------------------------------------ me --

def test_me_returns_profile(client, analyst):
    email, headers = analyst
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == email
    assert body["role"] == "analyst"
    assert "password_hash" not in body, "password hash must never be serialised"


def test_logout_is_audited(client, analyst, db):
    from backend.app.models import AuditLog

    email, headers = analyst
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    entry = (
        db.query(AuditLog)
        .filter(AuditLog.user_email == email, AuditLog.action == "logout")
        .first()
    )
    assert entry is not None


def test_login_failure_is_audited(client, analyst, db):
    from backend.app.models import AuditLog

    email, _ = analyst
    client.post("/api/auth/login", json={"email": email, "password": "WrongPass123"})
    entry = (
        db.query(AuditLog)
        .filter(AuditLog.user_email == email, AuditLog.action == "login_failed")
        .first()
    )
    assert entry is not None
    assert "WrongPass123" not in (entry.details or ""), "audit must not record passwords"
