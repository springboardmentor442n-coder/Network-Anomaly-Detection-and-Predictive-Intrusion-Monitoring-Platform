from datetime import datetime, timedelta
from typing import Optional
import hashlib
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt

SECRET_KEY = "netshield_super_secret_key_for_jwt_token_auth"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & User Management"])

def hash_password(password: str) -> str:
    """Hashes a password using SHA-256 with a salt."""
    salt = "netshield_salt_"
    return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# In-memory mock database with pre-configured SOC user roles
users_db = {
    "admin@netshield.ai": {
        "email": "admin@netshield.ai",
        "hashed_password": hash_password("admin123"),
        "full_name": "Dr. Sarah Vance",
        "role": "Admin"
    },
    "analyst@netshield.ai": {
        "email": "analyst@netshield.ai",
        "hashed_password": hash_password("analyst123"),
        "full_name": "Marcus Holloway",
        "role": "Security Analyst"
    },
    "operator@netshield.ai": {
        "email": "operator@netshield.ai",
        "hashed_password": hash_password("operator123"),
        "full_name": "Alex Chen",
        "role": "SOC Operator"
    }
}

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
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="User already registered")
    
    hashed_pwd = hash_password(user.password)
    user_dict = {
        "email": user.email,
        "hashed_password": hashed_pwd,
        "full_name": user.full_name,
        "role": user.role
    }
    users_db[user.email] = user_dict
    
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
    user = users_db.get(form_data.username)
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
        if email is None or email not in users_db:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        u = users_db[email]
        return {"email": u["email"], "full_name": u["full_name"], "role": u["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
