from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# Authentication & User Management
# ============================================================================

class Credentials(BaseModel):
    email: str
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreateRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    role: str = "analyst"


class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ============================================================================
# Prediction & Detection
# ============================================================================

class PredictionRequest(BaseModel):
    features: dict[str, object]

    @field_validator("features")
    @classmethod
    def validate_features(cls, v):
        if not isinstance(v, dict) or not v:
            raise ValueError("features must be a non-empty dictionary")
        return v


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    attack_probability: float
    is_anomaly: bool
    risk_score: int
    severity: str
    timestamp: datetime
    model_version: str

    model_config = ConfigDict(from_attributes=True)


class DetectionResponse(BaseModel):
    id: int
    prediction: str
    confidence: float
    risk_score: float
    severity: str
    is_anomaly: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Alerts
# ============================================================================

class AlertResponse(BaseModel):
    id: int
    detection_id: int
    severity: str
    status: str
    source_ip: Optional[str]
    destination_ip: Optional[str]
    attack_type: Optional[str]
    risk_score: Optional[float]
    description: Optional[str]
    notes: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertUpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class AlertListResponse(BaseModel):
    total: int
    alerts: list[AlertResponse]


# ============================================================================
# Incidents
# ============================================================================

class IncidentNoteResponse(BaseModel):
    id: int
    incident_id: int
    author: str
    note: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    severity: str
    status: str
    assigned_analyst: Optional[str]
    priority: int
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class IncidentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str
    priority: int = 5
    assigned_analyst: Optional[str] = None


class IncidentUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    assigned_analyst: Optional[str] = None
    investigation_notes: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentAddNoteRequest(BaseModel):
    note: str = Field(min_length=1)


class IncidentDetailResponse(IncidentResponse):
    notes: list[IncidentNoteResponse] = []


# ============================================================================
# Threat Intelligence
# ============================================================================

class ThreatIndicatorResponse(BaseModel):
    id: int
    indicator_type: str
    indicator_value: str
    threat_level: Optional[str]
    description: Optional[str]
    source: Optional[str]
    last_seen: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ThreatIntelligenceResultResponse(BaseModel):
    id: int
    detection_id: int
    ip_address: Optional[str]
    is_malicious: Optional[bool]
    threat_level: Optional[str]
    provider: Optional[str]
    details: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Analytics
# ============================================================================

class TrafficAnalyticsResponse(BaseModel):
    dataset: str
    status: str
    total_records_sampled: int
    normal_records: int
    anomalous_records: int
    attack_distribution: list[tuple[str, int]]
    protocol_distribution: list[tuple[str, int]]
    top_sources: list[tuple[str, int]]
    top_destinations: list[tuple[str, int]]
    model_ready: bool


class SecurityMetricsResponse(BaseModel):
    total_traffic: int
    benign_traffic: int
    anomalous_traffic: int
    total_attacks: int
    high_risk_detections: int
    critical_alerts: int
    open_incidents: int


class ModelMetricsResponse(BaseModel):
    model_version: str
    dataset: str
    trained_at: datetime
    accuracy: Optional[float]
    precision: Optional[float]
    recall: Optional[float]
    f1_score: Optional[float]


# ============================================================================
# Notifications
# ============================================================================

class NotificationResponse(BaseModel):
    id: int
    alert_id: Optional[int]
    incident_id: Optional[int]
    channel: str
    recipient: str
    status: str
    sent_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Reports
# ============================================================================

class ReportResponse(BaseModel):
    id: int
    title: str
    report_type: str
    period_start: datetime
    period_end: datetime
    generated_by: str
    total_traffic: Optional[int]
    total_attacks: Optional[int]
    total_anomalies: Optional[int]
    high_risk_count: Optional[int]
    critical_count: Optional[int]
    summary: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Error Response
# ============================================================================

class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[dict] = None
