from pathlib import Path
import os


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings:
    app_name: str = os.getenv("NETSHIELD_APP_NAME", "NetShield AI")
    database_url: str = os.getenv(
        "NETSHIELD_DATABASE_URL", f"sqlite:///{PROJECT_ROOT / 'netshield.db'}"
    )
    jwt_secret: str = os.getenv("NETSHIELD_JWT_SECRET", "change-this-local-secret-key-32-chars")
    jwt_expiry_minutes: int = int(os.getenv("NETSHIELD_JWT_EXPIRY_MINUTES", "120"))
    cors_origins: list[str] = os.getenv("NETSHIELD_CORS_ORIGINS", "*").split(",")
    data_root: Path = Path(os.getenv("NETSHIELD_DATA_ROOT", str(PROJECT_ROOT)))
    model_root: Path = Path(os.getenv("NETSHIELD_MODEL_ROOT", str(PROJECT_ROOT / "models")))


settings = Settings()
