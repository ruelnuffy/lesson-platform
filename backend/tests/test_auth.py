from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import login_rate_limiter
from app.config import get_settings
from app.models import (
    Course,
    EmailLog,
    EmailStatus,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    Question,
    Quiz,
    QuizAttempt,
    User,
    UserRole,
)
from app.security.password import hash_password


def test_health_endpoint(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_register_sets_httponly_cookie_and_returns_user(client: TestClient) -> None:
    res = client.post(
        "/api/auth/register",
        json={
            "name": "Ada Lovelace",
            "email": "Ada@Example.com",
            "password": "supersecretpassword",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Ada Lovelace"
    assert data["email"] == "ada@example.com"
    assert data["role"] == "user"
    assert "password" not in data
    assert "password_hash" not in data

    settings = get_settings()
    set_cookie = res.headers.get("set-cookie", "")
    assert f"{settings.auth_cookie_name}=" in set_cookie
    assert "HttpOnly" in set_cookie

    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "ada@example.com"


def test_register_duplicate_email_rejected(client: TestClient) -> None:
    payload = {
        "name": "User One",
        "email": "dup@example.com",
        "password": "password123",
    }
    assert client.post("/api/auth/register", json=payload).status_code == 201
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 409


def test_login_logout_and_me_flow(client: TestClient, db_session: Session) -> None:
    user = User(
        name="Chidi",
        email="chidi@example.com",
        password_hash=hash_password("correct-horse-battery"),
        role=UserRole.user,
    )
    db_session.add(user)
    db_session.commit()

    # Unauthenticated /me fails
    assert client.get("/api/auth/me").status_code == 401

    # Wrong password fails
    bad = client.post(
        "/api/auth/login",
        json={"email": "chidi@example.com", "password": "wrongpassword"},
    )
    assert bad.status_code == 401

    # Valid login without remember_me sets a session cookie (no Max-Age)
    ok = client.post(
        "/api/auth/login",
        json={"email": "CHIDI@example.com", "password": "correct-horse-battery", "remember_me": False},
    )
    assert ok.status_code == 200
    assert ok.json()["email"] == "chidi@example.com"
    assert "Max-Age=" not in ok.headers.get("set-cookie", "")

    # Login with remember_me=True sets a 30-day persistent cookie
    remembered = client.post(
        "/api/auth/login",
        json={"email": "chidi@example.com", "password": "correct-horse-battery", "remember_me": True},
    )
    assert remembered.status_code == 200
    assert "Max-Age=2592000" in remembered.headers.get("set-cookie", "")

    # /me succeeds with cookie
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == user.id

    # Logout clears cookie
    out = client.post("/api/auth/logout")
    assert out.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_login_rate_limiting(client: TestClient) -> None:
    max_attempts = login_rate_limiter.max_requests
    for _ in range(max_attempts):
        res = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
        )
        assert res.status_code == 401

    blocked = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
    )
    assert blocked.status_code == 429


def test_all_tables_and_constraints_exist(db_session: Session) -> None:
    inspector = inspect(db_session.get_bind())
    tables = set(inspector.get_table_names())
    expected = {
        "users",
        "courses",
        "lessons",
        "enrollments",
        "quizzes",
        "questions",
        "quiz_attempts",
        "email_log",
    }
    assert expected.issubset(tables)

    user = User(
        name="Student",
        email="student@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    course = Course(
        title="Python Foundations",
        description="7-day daily course",
        price_kobo=1500000,
        is_active=True,
    )
    db_session.add_all([user, course])
    db_session.flush()

    lesson = Lesson(
        course_id=course.id,
        day_number=1,
        title="Day 1",
        content_markdown="# Hello",
        release_date=date(2026, 11, 25),
    )
    enrollment = Enrollment(
        user_id=user.id,
        course_id=course.id,
        status=EnrollmentStatus.paid,
        paystack_reference="ref_test_001",
    )
    db_session.add_all([lesson, enrollment])
    db_session.flush()

    quiz = Quiz(lesson_id=lesson.id, pass_mark_percent=70)
    db_session.add(quiz)
    db_session.flush()

    question = Question(
        quiz_id=quiz.id,
        text="2 + 2 = ?",
        options=["3", "4", "5"],
        correct_index=1,
        explanation="2 + 2 equals 4.",
        order=1,
    )
    attempt = QuizAttempt(
        user_id=user.id,
        quiz_id=quiz.id,
        score_percent=100.0,
        answers={"1": 1},
        passed=True,
    )
    log1 = EmailLog(
        user_id=user.id,
        lesson_id=lesson.id,
        type="daily_lesson",
        status=EmailStatus.sent,
    )
    db_session.add_all([question, attempt, log1])
    db_session.flush()

    # Verify unique(user_id, lesson_id, type) on email_log
    log_dup = EmailLog(
        user_id=user.id,
        lesson_id=lesson.id,
        type="daily_lesson",
        status=EmailStatus.sent,
    )
    db_session.add(log_dup)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_forgot_and_reset_password_single_use(
    client: TestClient,
    db_session: Session,
) -> None:
    import re
    from app.main import app
    from app.services.email import EmailSender, get_email_sender

    sent_emails: list[dict[str, str]] = []

    class CaptureEmailSender(EmailSender):
        def send_email(self, *, to_email: str, subject: str, html_body: str, text_body: str) -> None:
            sent_emails.append({"to": to_email, "text": text_body})

    app.dependency_overrides[get_email_sender] = lambda: CaptureEmailSender()
    try:
        user = User(
            name="Reset User",
            email="resetme@example.com",
            password_hash=hash_password("oldpassword123"),
            role=UserRole.user,
        )
        db_session.add(user)
        db_session.commit()

        # Unknown email still returns 200 without leaking existence
        unknown = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
        assert unknown.status_code == 200
        assert len(sent_emails) == 0

        # Known email triggers reset link
        res = client.post("/api/auth/forgot-password", json={"email": "resetme@example.com"})
        assert res.status_code == 200
        assert len(sent_emails) == 1

        match = re.search(r"token=([^\s]+)", sent_emails[0]["text"])
        assert match is not None
        token = match.group(1)

        # Reset password succeeds
        reset_res = client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "newstrongpassword"},
        )
        assert reset_res.status_code == 200

        # Old password fails, new password succeeds
        assert (
            client.post(
                "/api/auth/login",
                json={"email": "resetme@example.com", "password": "oldpassword123"},
            ).status_code
            == 401
        )
        assert (
            client.post(
                "/api/auth/login",
                json={"email": "resetme@example.com", "password": "newstrongpassword"},
            ).status_code
            == 200
        )

        # Reusing the same reset token is rejected (single-use)
        reuse = client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "anotherpassword"},
        )
        assert reuse.status_code == 400
    finally:
        app.dependency_overrides.pop(get_email_sender, None)


def test_update_profile_name_and_avatar(
    client: TestClient,
    db_session: Session,
) -> None:
    user = User(
        name="Old Name",
        email="profile@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    db_session.add(user)
    db_session.commit()

    assert (
        client.post(
            "/api/auth/login",
            json={"email": "profile@example.com", "password": "password123"},
        ).status_code
        == 200
    )

    res = client.patch(
        "/api/auth/profile",
        json={
            "name": "New Name",
            "avatar_url": "https://example.com/avatar.png",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "New Name"
    assert data["avatar_url"] == "https://example.com/avatar.png"
