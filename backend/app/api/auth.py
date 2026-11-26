import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.security.deps import get_current_user
from app.security.jwt import (
    TokenError,
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    password_hash_fingerprint,
)
from app.security.password import hash_password, verify_password
from app.security.rate_limit import SlidingWindowRateLimiter, make_rate_limit_dependency
from app.services.email import EmailSender, get_email_sender, render_password_reset_email

logger = logging.getLogger("daily_lessons.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

_settings = get_settings()
login_rate_limiter = SlidingWindowRateLimiter(
    max_requests=_settings.login_rate_limit_max,
    window_seconds=_settings.login_rate_limit_window_seconds,
)
rate_limit_login = make_rate_limit_dependency(login_rate_limiter, "login")


REMEMBER_ME_MINUTES = 60 * 24 * 30  # 30 days
SESSION_ONLY_MINUTES = 60 * 24      # 24 hours


def _set_auth_cookie(
    response: Response,
    token: str,
    *,
    persistent: bool = True,
    max_age_seconds: int | None = None,
) -> None:
    settings = get_settings()
    cookie_max_age: int | None = None
    if persistent:
        cookie_max_age = (
            max_age_seconds
            if max_age_seconds is not None
            else settings.jwt_expire_minutes * 60
        )
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=cookie_max_age,
        path="/",
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    normalized_email = body.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == normalized_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name=body.name.strip(),
        email=normalized_email,
        password_hash=hash_password(body.password),
        role=UserRole.user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role.value)
    _set_auth_cookie(response, token, persistent=True)
    return user


@router.post(
    "/login",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit_login)],
)
def login(
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    normalized_email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if body.remember_me:
        token = create_access_token(user.id, user.role.value, expire_minutes=REMEMBER_ME_MINUTES)
        _set_auth_cookie(
            response,
            token,
            persistent=True,
            max_age_seconds=REMEMBER_ME_MINUTES * 60,
        )
    else:
        token = create_access_token(user.id, user.role.value, expire_minutes=SESSION_ONLY_MINUTES)
        _set_auth_cookie(response, token, persistent=False)
    return user


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
    )
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/forgot-password", dependencies=[Depends(rate_limit_login)])
def forgot_password(
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    email_sender: EmailSender = Depends(get_email_sender),
) -> dict[str, str]:
    normalized_email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == normalized_email))

    if user:
        settings = get_settings()
        token = create_password_reset_token(user.id, user.password_hash)
        reset_url = f"{settings.frontend_origin.rstrip('/')}/reset-password?token={token}"
        subject, html_body, text_body = render_password_reset_email(
            user_name=user.name,
            reset_url=reset_url,
        )
        try:
            email_sender.send_email(
                to_email=user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
        except Exception as exc:
            logger.warning(
                "Password reset email could not be sent via SMTP (%s). Dev reset URL: %s",
                exc,
                reset_url,
            )

    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    try:
        user_id, expected_ph = decode_password_reset_token(body.token)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link",
        ) from exc

    user = db.get(User, user_id)
    if not user or password_hash_fingerprint(user.password_hash) != expected_ph:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has already been used",
        )

    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated successfully. You can now sign in."}
