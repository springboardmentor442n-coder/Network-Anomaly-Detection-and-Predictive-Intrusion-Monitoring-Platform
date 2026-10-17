from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Boolean

from database import Base, get_db


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    user_email = Column(String(255))
    action = Column(String(60))
    detail = Column(Text, nullable=True)


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    source = Column(String(10))            # CSV or LIVE
    run_id = Column(Integer, nullable=True)
    attack = Column(String(40))
    risk_score = Column(Float)
    confidence = Column(Float)
    risk_level = Column(String(10))
    status = Column(String(20), default="New")   # New, Investigating, Resolved
    updated_by = Column(String(255), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    title = Column(String(200))
    body = Column(Text)
    read = Column(Boolean, default=False)


def audit(db, email, action, detail=""):
    """Write one audit log row. Never lets logging break a request."""
    try:
        db.add(AuditLog(user_email=email, action=action, detail=detail))
        db.commit()
    except Exception as e:
        db.rollback()
        print("audit failed:", e)