from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    prediction: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    attack_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    attack_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    attack_type_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    anomaly: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    risk_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    source: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    destination: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="OPEN",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )