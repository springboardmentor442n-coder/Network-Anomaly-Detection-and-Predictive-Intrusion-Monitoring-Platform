"""
Application configuration.

All values are read from environment variables with safe local defaults.
Never hardcode secrets here - use environment variables (see .env.example).
"""

from pathlib import Path
from typing import List, Optional
import os


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _get_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _get_list(name: str, default: str) -> List[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings:
    # ---------------------------------------------------------------- core ---
    app_name: str = os.getenv("NETSHIELD_APP_NAME", "NetShield AI")
    environment: str = os.getenv("NETSHIELD_ENV", "development")
    debug: bool = _get_bool("NETSHIELD_DEBUG", False)

    # ------------------------------------------------------------ database ---
    database_url: str = os.getenv(
        "NETSHIELD_DATABASE_URL", f"sqlite:///{PROJECT_ROOT / 'netshield.db'}"
    )

    # ------------------------------------------------------------ security ---
    jwt_secret: str = os.getenv(
        "NETSHIELD_JWT_SECRET", "change-this-local-secret-key-32-chars"
    )
    jwt_expiry_minutes: int = _get_int("NETSHIELD_JWT_EXPIRY_MINUTES", 120)
    cors_origins: List[str] = _get_list("NETSHIELD_CORS_ORIGINS", "*")
    password_min_length: int = _get_int("NETSHIELD_PASSWORD_MIN_LENGTH", 8)

    # --------------------------------------------------------- rate limits ---
    rate_limit_enabled: bool = _get_bool("NETSHIELD_RATE_LIMIT_ENABLED", True)
    rate_limit_login: str = os.getenv("NETSHIELD_RATE_LIMIT_LOGIN", "10/minute")
    rate_limit_register: str = os.getenv("NETSHIELD_RATE_LIMIT_REGISTER", "5/minute")
    rate_limit_default: str = os.getenv("NETSHIELD_RATE_LIMIT_DEFAULT", "300/minute")

    # ------------------------------------------------------------ data/ml ----
    data_root: Path = Path(os.getenv("NETSHIELD_DATA_ROOT", str(PROJECT_ROOT)))
    model_root: Path = Path(
        os.getenv("NETSHIELD_MODEL_ROOT", str(PROJECT_ROOT / "models"))
    )
    analytics_sample_limit: int = _get_int("NETSHIELD_ANALYTICS_SAMPLE_LIMIT", 250_000)
    analytics_chunk_size: int = _get_int("NETSHIELD_ANALYTICS_CHUNK_SIZE", 50_000)
    analytics_cache_seconds: int = _get_int("NETSHIELD_ANALYTICS_CACHE_SECONDS", 300)

    # ------------------------------------------------------- alert routing ---
    # Minimum risk score that creates an alert from a detection.
    #
    # Default 65 (HIGH) rather than 35 (MEDIUM): a flow the classifier confidently
    # labels benign but which Isolation Forest flags as an outlier already scores
    # ~50 under the documented formula (35 anomaly + 15 confidence), so a MEDIUM
    # threshold turns ordinary benign traffic into alerts. Tune with
    # NETSHIELD_ALERT_MIN_RISK_SCORE; see docs/technical-pipeline.md.
    alert_min_risk_score: int = _get_int("NETSHIELD_ALERT_MIN_RISK_SCORE", 65)
    # Severities that trigger an outbound notification.
    notify_severities: List[str] = _get_list(
        "NETSHIELD_NOTIFY_SEVERITIES", "CRITICAL"
    )

    # ------------------------------------------------------------- email -----
    smtp_host: Optional[str] = os.getenv("NETSHIELD_SMTP_HOST")
    smtp_port: int = _get_int("NETSHIELD_SMTP_PORT", 587)
    smtp_username: Optional[str] = os.getenv("NETSHIELD_SMTP_USERNAME")
    smtp_password: Optional[str] = os.getenv("NETSHIELD_SMTP_PASSWORD")
    smtp_use_tls: bool = _get_bool("NETSHIELD_SMTP_USE_TLS", True)
    alert_email: Optional[str] = os.getenv("NETSHIELD_ALERT_EMAIL")
    alert_email_from: Optional[str] = os.getenv("NETSHIELD_ALERT_EMAIL_FROM")

    # ------------------------------------------------------------- slack -----
    slack_webhook_url: Optional[str] = os.getenv("NETSHIELD_SLACK_WEBHOOK_URL")

    # ----------------------------------------------------- generic webhook ---
    webhook_url: Optional[str] = os.getenv("NETSHIELD_WEBHOOK_URL")
    webhook_timeout_seconds: int = _get_int("NETSHIELD_WEBHOOK_TIMEOUT", 5)

    # ------------------------------------------------- threat intelligence ---
    threat_intel_provider: str = os.getenv("THREAT_INTEL_PROVIDER", "local")
    threat_intel_api_key: Optional[str] = os.getenv("THREAT_INTEL_API_KEY")
    threat_intel_base_url: Optional[str] = os.getenv("THREAT_INTEL_BASE_URL")
    threat_intel_timeout_seconds: int = _get_int("THREAT_INTEL_TIMEOUT", 5)

    # ----------------------------------------------------- packet capture ----
    capture_enabled: bool = _get_bool("NETSHIELD_CAPTURE_ENABLED", False)
    capture_interface: Optional[str] = os.getenv("NETSHIELD_CAPTURE_INTERFACE")
    capture_bpf_filter: Optional[str] = os.getenv("NETSHIELD_CAPTURE_BPF_FILTER")
    zeek_log_dir: Optional[str] = os.getenv("NETSHIELD_ZEEK_LOG_DIR")

    # ---------------------------------------------------------- streaming ----
    replay_interval_seconds: float = float(
        os.getenv("NETSHIELD_REPLAY_INTERVAL_SECONDS", "2.0")
    )
    stream_max_events: int = _get_int("NETSHIELD_STREAM_MAX_EVENTS", 200)

    # ------------------------------------------------------------ helpers ----
    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}

    @property
    def jwt_secret_is_default(self) -> bool:
        return self.jwt_secret == "change-this-local-secret-key-32-chars"

    def configuration_status(self) -> dict:
        """
        Report which optional integrations are configured.
        Never returns secret values - only booleans / non-sensitive names.
        """
        return {
            "environment": self.environment,
            "database": "postgresql"
            if self.database_url.startswith("postgres")
            else "sqlite",
            "jwt_secret_configured": not self.jwt_secret_is_default,
            "cors_restricted": self.cors_origins != ["*"],
            "rate_limiting": self.rate_limit_enabled,
            "email_configured": bool(
                self.smtp_host and self.smtp_username and self.alert_email
            ),
            "slack_configured": bool(self.slack_webhook_url),
            "webhook_configured": bool(self.webhook_url),
            "threat_intel_provider": self.threat_intel_provider,
            "threat_intel_configured": bool(self.threat_intel_api_key)
            or self.threat_intel_provider == "local",
            "packet_capture_enabled": self.capture_enabled,
            "zeek_configured": bool(self.zeek_log_dir),
            "notify_severities": self.notify_severities,
            "alert_min_risk_score": self.alert_min_risk_score,
        }


settings = Settings()
