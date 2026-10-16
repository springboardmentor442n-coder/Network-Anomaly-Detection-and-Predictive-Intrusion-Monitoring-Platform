"""SQLAlchemy ORM Models for NETSHIELD AI."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database.session import Base
import enum


def generate_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    SOC_OPERATOR = "SOC_OPERATOR"


class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    CONTAINED = "CONTAINED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class ModelStatus(str, enum.Enum):
    TRAINING = "TRAINING"
    READY = "READY"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"
    ACTIVE = "ACTIVE"


class ScanStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    STOPPED = "STOPPED"


class RiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


# ─── USERS ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(256), unique=True, nullable=False, index=True)
    full_name = Column(String(256), nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String(32), nullable=False, default="ANALYST")
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    theme = Column(String(16), default="dark", nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    audit_logs = relationship("AuditLog", back_populates="user")


# ─── TEAMS ──────────────────────────────────────────────────────────────────

class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("User", back_populates="team")


# ─── AUDIT LOGS ─────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    username = Column(String(64), nullable=True)
    action = Column(String(128), nullable=False)
    resource_type = Column(String(64), nullable=True)
    resource_id = Column(String, nullable=True)
    ip_address = Column(String(64), nullable=True)
    result = Column(String(16), nullable=False, default="SUCCESS")
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_created_at", "created_at"),
    )


# ─── TRAFFIC RECORDS ────────────────────────────────────────────────────────

class TrafficRecord(Base):
    __tablename__ = "traffic_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_job_id = Column(String, ForeignKey("scan_jobs.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    source_ip = Column(String(64), nullable=True, index=True)
    destination_ip = Column(String(64), nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(32), nullable=True)
    flow_duration = Column(Float, nullable=True)
    total_fwd_packets = Column(Integer, nullable=True)
    total_bwd_packets = Column(Integer, nullable=True)
    raw_features = Column(JSON, nullable=True)
    predicted_class = Column(String(128), nullable=True, index=True)
    confidence = Column(Float, nullable=True)
    risk_score = Column(Integer, nullable=True)
    risk_level = Column(String(16), nullable=True)
    is_malicious = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    scan_job = relationship("ScanJob", back_populates="traffic_records")

    __table_args__ = (
        Index("ix_traffic_records_source_ip", "source_ip"),
        Index("ix_traffic_records_predicted_class", "predicted_class"),
    )


# ─── ALERTS ─────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_job_id = Column(String, ForeignKey("scan_jobs.id"), nullable=True)
    traffic_record_id = Column(String, ForeignKey("traffic_records.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    source_ip = Column(String(64), nullable=True, index=True)
    destination_ip = Column(String(64), nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(32), nullable=True)
    attack_type = Column(String(128), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    base_risk_score = Column(Integer, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(16), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="NEW", index=True)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=True)
    escalated = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scan_job = relationship("ScanJob", back_populates="alerts")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    incident = relationship("Incident", back_populates="alerts")

    __table_args__ = (
        Index("ix_alerts_risk_level", "risk_level"),
        Index("ix_alerts_attack_type", "attack_type"),
        Index("ix_alerts_status", "status"),
    )


# ─── INCIDENTS ──────────────────────────────────────────────────────────────

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(16), nullable=False, default="MEDIUM")
    source_ip = Column(String(64), nullable=True, index=True)
    attack_type = Column(String(128), nullable=True)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(String(32), nullable=False, default="OPEN", index=True)
    risk_score = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    status_history = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    alerts = relationship("Alert", back_populates="incident")
    assigned_user = relationship("User", foreign_keys=[assigned_to])


# ─── SCAN JOBS ──────────────────────────────────────────────────────────────

class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_name = Column(String(256), nullable=False)
    dataset_path = Column(String(512), nullable=True)
    model_run_id = Column(String, ForeignKey("model_runs.id"), nullable=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    total_rows = Column(Integer, nullable=True)
    processed_rows = Column(Integer, default=0)
    threats_detected = Column(Integer, default=0)
    critical_alerts = Column(Integer, default=0)
    processing_rate = Column(Float, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    traffic_records = relationship("TrafficRecord", back_populates="scan_job")
    alerts = relationship("Alert", back_populates="scan_job")
    model_run = relationship("ModelRun", back_populates="scan_jobs")


# ─── MODEL RUNS ─────────────────────────────────────────────────────────────

class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(256), nullable=False)
    algorithm = Column(String(64), nullable=False, default="RandomForest")
    dataset = Column(String(256), nullable=False, default="CICIDS2017")
    version = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False, default="TRAINING", index=True)
    is_active = Column(Boolean, default=False)
    accuracy = Column(Float, nullable=True)
    precision_macro = Column(Float, nullable=True)
    recall_macro = Column(Float, nullable=True)
    f1_macro = Column(Float, nullable=True)
    f1_weighted = Column(Float, nullable=True)
    training_samples = Column(Integer, nullable=True)
    test_samples = Column(Integer, nullable=True)
    num_features = Column(Integer, nullable=True)
    num_classes = Column(Integer, nullable=True)
    training_time_seconds = Column(Float, nullable=True)
    class_report = Column(JSON, nullable=True)
    confusion_matrix = Column(JSON, nullable=True)
    class_names = Column(JSON, nullable=True)
    feature_names = Column(JSON, nullable=True)
    model_path = Column(String(512), nullable=True)
    error_message = Column(Text, nullable=True)
    trained_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scan_jobs = relationship("ScanJob", back_populates="model_run")
    trainer = relationship("User", foreign_keys=[trained_by])


# ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(32), nullable=False, default="INFO")
    is_read = Column(Boolean, default=False)
    related_id = Column(String, nullable=True)
    related_type = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── THREAT INTELLIGENCE ────────────────────────────────────────────────────

class ThreatIntelligence(Base):
    __tablename__ = "threat_intelligence"

    id = Column(String, primary_key=True, default=generate_uuid)
    indicator_type = Column(String(64), nullable=False)
    indicator_value = Column(String(256), nullable=False, index=True)
    threat_category = Column(String(128), nullable=True)
    severity = Column(String(16), nullable=True)
    confidence = Column(Float, nullable=True)
    source = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=True)
    first_seen = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
