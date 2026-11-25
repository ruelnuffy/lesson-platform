from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.security.password import hash_password


def _login_as(client: TestClient, db: Session, email: str, role: UserRole) -> User:
    user = User(
        name=f"{role.value.title()} User",
        email=email,
        password_hash=hash_password("password123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    assert (
        client.post(
            "/api/auth/login",
            json={"email": email, "password": "password123"},
        ).status_code
        == 200
    )
    return user


def test_admin_routes_reject_non_admins(client: TestClient, db_session: Session) -> None:
    _login_as(client, db_session, "regular@example.com", UserRole.user)
    assert client.get("/api/admin/overview").status_code == 403
    assert client.get("/api/admin/users").status_code == 403
    assert client.get("/api/admin/scores/export.csv").status_code == 403


def test_admin_crud_bulk_lessons_quiz_grant_revoke_and_csv(
    client: TestClient,
    db_session: Session,
) -> None:
    _login_as(client, db_session, "boss@example.com", UserRole.admin)

    # 1. Overview
    ov = client.get("/api/admin/overview")
    assert ov.status_code == 200
    assert "total_users" in ov.json()

    # 2. Create course
    course_res = client.post(
        "/api/admin/courses",
        json={
            "title": "Admin Created Course",
            "description": "Course body",
            "price_kobo": 2000000,
            "is_active": True,
        },
    )
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    # 3. Bulk create 3 days of lessons
    bulk_res = client.post(
        f"/api/admin/courses/{course_id}/lessons/bulk",
        json={
            "start_date": date(2026, 12, 1).isoformat(),
            "num_days": 3,
            "start_day_number": 1,
            "title_prefix": "Module",
        },
    )
    assert bulk_res.status_code == 201
    lessons = bulk_res.json()
    assert len(lessons) == 3
    lesson_id = lessons[0]["id"]

    # 4. Quiz + Question CRUD (admin sees correct_index)
    quiz_res = client.get(f"/api/admin/lessons/{lesson_id}/quiz")
    assert quiz_res.status_code == 200
    quiz_id = quiz_res.json()["id"]

    q_res = client.post(
        f"/api/admin/quizzes/{quiz_id}/questions",
        json={
            "text": "Admin Q1?",
            "options": ["A", "B", "C"],
            "correct_index": 2,
            "explanation": "C is right",
            "order": 1,
        },
    )
    assert q_res.status_code == 201
    assert q_res.json()["correct_index"] == 2

    # 5. Grant & Revoke manual access for a student
    student = User(
        name="Manual Student",
        email="manual@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    grant_res = client.post(
        f"/api/admin/users/{student.id}/grant",
        json={"course_id": course_id},
    )
    assert grant_res.status_code == 200

    users_res = client.get("/api/admin/users?q=manual@example.com")
    assert users_res.status_code == 200
    assert users_res.json()[0]["is_paid"] is True

    revoke_res = client.post(
        f"/api/admin/users/{student.id}/revoke",
        json={"course_id": course_id},
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["revoked_count"] == 1

    users_after = client.get("/api/admin/users?q=manual@example.com")
    assert users_after.json()[0]["is_paid"] is False

    # 6. CSV export returns text/csv
    csv_res = client.get("/api/admin/scores/export.csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "attempt_id,user_id,user_name" in csv_res.text
