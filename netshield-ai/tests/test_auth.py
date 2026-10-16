"""
NETSHIELD AI - Authentication Unit Tests
"""
import pytest
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password

def test_password_hashing():
    password = "SecOpsPassword2026!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_generation():
    data = {"sub": "admin@netshield.ai", "role": "ADMIN"}
    token = create_access_token(data)
    assert token is not None
    decoded = decode_access_token(token)
    assert decoded["sub"] == "admin@netshield.ai"
    assert decoded["role"] == "ADMIN"
