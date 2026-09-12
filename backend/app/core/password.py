import hashlib
import hmac
import os


ITERATIONS = 310_000


def hash_password(password: str) -> str:
    """
    Create a salted PBKDF2-SHA256 password hash.
    """

    salt = os.urandom(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        ITERATIONS,
    )

    return (
        f"pbkdf2_sha256${ITERATIONS}$"
        f"{salt.hex()}${password_hash.hex()}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    """
    Verify a plain-text password against a stored PBKDF2 hash.
    """

    try:
        algorithm, iterations, salt_hex, hash_hex = stored_hash.split("$")

        if algorithm != "pbkdf2_sha256":
            return False

        iterations = int(iterations)

        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)

        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )

        return hmac.compare_digest(
            actual_hash,
            expected_hash,
        )

    except (ValueError, TypeError):
        return False