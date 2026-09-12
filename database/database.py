from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# Project root directory
BASE_DIR = Path(__file__).resolve().parent.parent


# SQLite database file
DATABASE_PATH = BASE_DIR / "database" / "netshield.db"


# SQLite connection URL
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"


# SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False
    },
)


# Database session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# Base class for SQLAlchemy models
Base = declarative_base()


def get_db():
    """
    Provide a database session for FastAPI endpoints.
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()