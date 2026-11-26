from datetime import UTC, datetime, timedelta
import hashlib
from typing import Any

import jwt

from app.config import get_settings


class TokenError(Exception):
    pass


def password_hash_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:16]


def create_access_token(
    user_id: int,
    role: str,
    expire_minutes: int | None = None,
) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    ttl_minutes = expire_minutes if expire_minutes is not None else settings.jwt_expire_minutes
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "purpose": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("purpose", "access") != "access":
            raise TokenError("Invalid token purpose")
        return payload
    except jwt.PyJWTError as exc:
        raise TokenError("Invalid or expired token") from exc


def create_password_reset_token(
    user_id: int,
    password_hash: str,
    expire_minutes: int = 30,
) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "purpose": "password_reset",
        "ph": password_hash_fingerprint(password_hash),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_password_reset_token(token: str) -> tuple[int, str]:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("purpose") != "password_reset":
            raise TokenError("Invalid reset token")
        user_id = int(payload["sub"])
        ph = str(payload["ph"])
        return user_id, ph
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise TokenError("Invalid or expired reset token") from exc
