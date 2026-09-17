from datetime import datetime, timedelta, timezone
from typing import List
import base64
import hashlib
import hmac
import os
import re

import jwt

from .config import settings


# Rejected outright regardless of length/composition.
_COMMON_PASSWORDS = {
    "password",
    "password1",
    "password123",
    "12345678",
    "123456789",
    "qwertyui",
    "letmein1",
    "changeme",
    "admin123",
    "netshield",
    "welcome1",
}


def validate_password_strength(password: str) -> List[str]:
    """
    Return a list of problems with a password. Empty list means acceptable.

    Rules: minimum length (configurable), at least one letter, at least one
    digit, and not a well-known weak password.
    """
    problems: List[str] = []
    minimum = settings.password_min_length

    if len(password) < minimum:
        problems.append(f"Must be at least {minimum} characters long")
    if not re.search(r"[A-Za-z]", password):
        problems.append("Must contain at least one letter")
    if not re.search(r"\d", password):
        problems.append("Must contain at least one digit")
    if password.strip().lower() in _COMMON_PASSWORDS:
        problems.append("Is a commonly used password; choose something less predictable")

    return problems


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"pbkdf2_sha256$120000${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, rounds, salt_text, digest_text = encoded.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_text)
        expected = base64.b64decode(digest_text)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, role: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiry_minutes)
    return jwt.encode({"sub": subject, "role": role, "exp": expires}, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
