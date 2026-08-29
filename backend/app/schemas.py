import datetime as dt
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models import RoleEnum


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: RoleEnum = RoleEnum.soc_analyst
    team: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: RoleEnum
    team: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Traffic ----------
class TrafficRecordOut(BaseModel):
    id: int
    src_ip: str
    dst_ip: str
    src_port: Optional[int]
    dst_port: Optional[int]
    protocol: Optional[str]
    duration: Optional[float]
    total_bytes: Optional[float]
    label: str
    anomaly_score: Optional[float]
    risk_score: Optional[float]
    is_anomalous: bool
    timestamp: dt.datetime

    class Config:
        from_attributes = True


class TrafficStats(BaseModel):
    total_flows: int
    anomalous_flows: int
    benign_flows: int
    top_protocols: dict
    avg_risk_score: float


# ---------- Alerts ----------
class AlertOut(BaseModel):
    id: int
    title: str
    severity: str
    attack_type: Optional[str]
    status: str
    created_at: dt.datetime

    class Config:
        from_attributes = True
