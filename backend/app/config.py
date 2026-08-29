"""
Central configuration. Values are read from environment variables (or a .env
file) so secrets never get hardcoded into source code.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Database ---
    database_url: str = "postgresql://netshield:netshield@localhost:5432/netshield"

    # --- JWT / Auth ---
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 hour analyst shift

    # --- App ---
    app_name: str = "NetShield AI"
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
