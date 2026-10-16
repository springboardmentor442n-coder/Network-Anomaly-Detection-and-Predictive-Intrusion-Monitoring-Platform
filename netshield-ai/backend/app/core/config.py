"""Application configuration settings."""
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    APP_NAME: str = "NETSHIELD AI"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "netshield-super-secret-key-change-in-production-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'netshield.db').replace('\\\\', '/')}"
    )

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # ML
    MODEL_DIR: str = "./models"
    DATA_DIR: str = "./data"
    CHUNK_SIZE: int = 1000
    RANDOM_SEED: int = 42
    TEST_SIZE: float = 0.2

    # Alert
    ALERT_ESCALATION_COUNT: int = 3
    ALERT_ESCALATION_WINDOW_MINUTES: int = 10
    ALERT_ESCALATION_BONUS: int = 15

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
