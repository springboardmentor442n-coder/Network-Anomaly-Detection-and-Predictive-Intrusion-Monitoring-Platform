from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base


class NetworkTraffic(Base):
    __tablename__ = "network_traffic"

    traffic_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    source_ip: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    destination_ip: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    protocol: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    source_port: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    destination_port: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    packet_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )