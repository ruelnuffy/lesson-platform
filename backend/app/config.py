from functools import lru_cache
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_database_url() -> str:
    if os.getenv("VERCEL"):
        return "sqlite:////tmp/dailylessons.db"
    return "postgresql+psycopg://dailylessons:dailylessons_dev_password@postgres:5432/dailylessons"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Daily Lessons"
    environment: str = "development"
    timezone: str = "Africa/Lagos"

    database_url: str = _default_database_url()

    jwt_secret_key: str = "change-me-to-a-long-random-secret-at-least-32-chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    auth_cookie_name: str = "access_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: str = "lax"

    frontend_origin: str = "http://localhost:5173"

    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    paystack_webhook_secret: str = ""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    email_from: str = "Daily Lessons <no-reply@example.com>"

    daily_email_hour: int = 6
    daily_email_minute: int = 30
    cron_secret: str = ""
    blob_read_write_token: str = ""

    # Rate limiting defaults
    login_rate_limit_max: int = 10
    login_rate_limit_window_seconds: int = 60
    quiz_rate_limit_max: int = 20
    quiz_rate_limit_window_seconds: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
