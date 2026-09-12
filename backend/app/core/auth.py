from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


SECRET_KEY = "netshield-ai-development-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


security = HTTPBearer()


def create_access_token(username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": username,
        "role": role,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")

    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:

    token = credentials.credentials

    try:
        payload = verify_access_token(token)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    role = payload.get("role")

    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "username": username,
        "role": role,
    }


def require_role(required_role: str):

    def role_checker(
        current_user: dict = Depends(get_current_user),
    ) -> dict:

        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )

        return current_user

    return role_checker