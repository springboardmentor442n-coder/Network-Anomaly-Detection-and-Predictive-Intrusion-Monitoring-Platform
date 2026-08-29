import enum
import datetime as dt

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"          # full access, manages teams
    soc_analyst = "soc_analyst"   # views traffic/alerts, triages incidents
    viewer = "viewer"        # read-only, e.g. for auditors/execs


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.soc_analyst, nullable=False)
    team = Column(String, nullable=True)          # e.g. "SOC-Night-Shift"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="user")


class AuditLog(Base):
    """Every sensitive action (login, alert dismissal, role change) gets
    logged here — required for the 'Audit logging' feature in Module 1."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)         # e.g. "LOGIN", "ALERT_ACK"
    detail = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=dt.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


class TrafficRecord(Base):
    """One row per network flow (a summarized connection, not a raw packet).
    This is the shape produced after 'feature extraction' in the pipeline —
    matches the kind of columns CICIDS2017 / UNSW-NB15 provide."""
    __tablename__ = "traffic_records"

    id = Column(Integer, primary_key=True, index=True)
    src_ip = Column(String, index=True)
    dst_ip = Column(String, index=True)
    src_port = Column(Integer)
    dst_port = Column(Integer)
    protocol = Column(String)              # TCP / UDP / ICMP
    duration = Column(Float)               # flow duration, seconds
    total_fwd_packets = Column(Integer, default=0)
    total_bwd_packets = Column(Integer, default=0)
    total_bytes = Column(Float, default=0)
    flow_bytes_per_sec = Column(Float, default=0)

    # Ground-truth label if it came from a labeled training dataset
    label = Column(String, default="BENIGN")

    # Filled in later by the anomaly detection / risk scoring modules
    anomaly_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)   # 0-100
    is_anomalous = Column(Boolean, default=False)

    timestamp = Column(DateTime, default=dt.datetime.utcnow, index=True)


class Alert(Base):
    """Generated when a TrafficRecord crosses the anomaly/risk threshold."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    traffic_record_id = Column(Integer, ForeignKey("traffic_records.id"), nullable=True)
    title = Column(String, nullable=False)
    severity = Column(String, default="low")   # low / medium / high / critical
    attack_type = Column(String, nullable=True)  # e.g. "Port Scan", "DDoS"
    status = Column(String, default="open")    # open / acknowledged / resolved
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
