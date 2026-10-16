"""Users in MySQL (XAMPP), PBKDF2 password hashes, HMAC-signed expiring tokens."""
import base64, hashlib, hmac, json, os, secrets, time
import pymysql
from db import sql

SECRET = os.getenv("NETSHIELD_SECRET") or secrets.token_hex(32)  # set it, or logins reset on restart
TTL = 8 * 3600

def _hash(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()

def create_user(user, pw) -> bool:
    salt, first = secrets.token_hex(16), not sql("SELECT 1 FROM users LIMIT 1")   # the very first account becomes admin
    try:
        sql("INSERT INTO users(username, salt, pw, role) VALUES(%s,%s,%s,%s)",
            (user.lower(), salt, _hash(pw, salt), "admin" if first else "viewer"))
        return True
    except pymysql.err.IntegrityError:
        return False

def get_role(user):
    rows = sql("SELECT role FROM users WHERE username=%s", (user.lower(),))
    return rows[0]["role"] if rows else None

def check_user(user, pw) -> bool:
    rows = sql("SELECT salt, pw FROM users WHERE username=%s", (user.lower(),))
    return bool(rows) and hmac.compare_digest(rows[0]["pw"], _hash(pw, rows[0]["salt"]))

def _sig(body): return hmac.new(SECRET.encode(), body.encode(), "sha256").hexdigest()

def make_token(user) -> str:
    body = base64.urlsafe_b64encode(json.dumps({"u": user.lower(), "exp": time.time() + TTL}).encode()).decode()
    return f"{body}.{_sig(body)}"

def read_token(token):
    try:
        body, sig = token.split(".")
        if not hmac.compare_digest(sig, _sig(body)): return None
        d = json.loads(base64.urlsafe_b64decode(body))
        return d["u"] if d["exp"] > time.time() else None
    except Exception:
        return None
