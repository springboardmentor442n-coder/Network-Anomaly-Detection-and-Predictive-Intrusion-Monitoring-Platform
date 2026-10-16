"""Login check, role check (RBAC) and audit log, shared by app.py and extras.py."""
from fastapi import HTTPException, Request
import auth
from db import sql

RANK = {"viewer": 1, "analyst": 2, "admin": 3}

def current_user(request: Request, token: str = ""):
    user = auth.read_token(token or request.headers.get("authorization", "")[7:])
    if not user or auth.get_role(user) is None:
        raise HTTPException(401, "Please log in")
    return user

def require(role):
    """Dependency: the user must be logged in and have at least this role (viewer < analyst < admin)."""
    def check(request: Request, token: str = ""):
        user = current_user(request, token)
        if RANK.get(auth.get_role(user), 0) < RANK[role]:
            raise HTTPException(403, f"This needs the {role} role")
        return user
    return check

def audit(user, action, detail="", request=None):
    ip = request.client.host if request is not None and request.client else None
    sql("INSERT INTO audit_log(ts,username,action,detail,ip) VALUES(UTC_TIMESTAMP(),%s,%s,%s,%s)",
        (user, action, (detail or "")[:200], ip))
