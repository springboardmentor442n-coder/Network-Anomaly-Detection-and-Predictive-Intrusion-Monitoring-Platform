from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt

from app.db import (
    hash_password,
    get_user_by_email,
    create_user,
    get_all_users as db_get_all_users,
    delete_user as db_delete_user
)

SECRET_KEY = "netshield_super_secret_key_for_jwt_token_auth"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & User Management"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "Security Analyst"

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: dict

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register", response_model=Token)
def register(user: UserRegister):
    existing = get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="User already registered")
    
    hashed_pwd = hash_password(user.password)
    success = create_user(
        email=user.email,
        hashed_password=hashed_pwd,
        full_name=user.full_name,
        role=user.role or "Security Analyst"
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create user in database")
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": {"email": user.email, "full_name": user.full_name, "role": user.role}
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": {"email": user["email"], "full_name": user["full_name"], "role": user["role"]}
    }

@router.get("/me")
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        u = get_user_by_email(email)
        if not u:
            raise HTTPException(status_code=401, detail="User not found")
        return {"email": u["email"], "full_name": u["full_name"], "role": u["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/users")
def get_all_users():
    """Lists all active SOC users with RBAC roles from persistent database."""
    return db_get_all_users()

@router.delete("/users/{email}")
def remove_user(email: str):
    """Removes a user from the persistent database."""
    if email.lower() == "admin@netshield.ai":
        raise HTTPException(status_code=400, detail="Cannot delete default system Admin account.")
    deleted = db_delete_user(email)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"status": "success", "message": f"User {email} deleted successfully"}
