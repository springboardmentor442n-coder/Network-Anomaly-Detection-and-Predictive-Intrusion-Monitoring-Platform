
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), default="Analyst", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    runs = relationship("PastRun", back_populates="user")


class PastRun(Base):
    __tablename__ = "past_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    source = Column(String(20), nullable=False)  # CSV or LIVE
    filename = Column(String(255), nullable=True)
    total_rows = Column(Integer, default=0, nullable=False)
    threats_detected = Column(Integer, default=0, nullable=False)
    critical_threats = Column(Integer, default=0, nullable=False)
    active_alerts = Column(Integer, default=0, nullable=False)
    threat_distribution = Column(Text, nullable=True)
    risk_distribution = Column(Text, nullable=True)
    results_json = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    user = relationship("User", back_populates="runs")