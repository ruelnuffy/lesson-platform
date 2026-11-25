from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.quizzes import quiz_rate_limiter
from app.models import (
    Course,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    Question,
    Quiz,
    User,
    UserRole,
)
from app.security.password import hash_password
from app.seed import seed_database
from app.services.access import today_in_app_tz


def _create_user_and_login(
    client: TestClient,
    db: Session,
    email: str,
    role: UserRole = UserRole.user,
) -> User:
    user = User(
        name="Test User",
        email=email,
        password_hash=hash_password("password123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    res = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert res.status_code == 200
    return user


def _create_course_with_lessons(db: Session) -> tuple[Course, Lesson, Lesson, Lesson, Quiz]:
    today = today_in_app_tz()
    course = Course(
        title="Test Daily Course",
        description="Course description",
        price_kobo=1000000,
        is_active=True,
    )
    db.add(course)
    db.flush()

    past_lesson = Lesson(
        course_id=course.id,
        day_number=1,
        title="Day 1 Past",
        content_markdown="# Past Content",
        release_date=today - timedelta(days=1),
    )
    today_lesson = Lesson(
        course_id=course.id,
        day_number=2,
        title="Day 2 Today",
        content_markdown="# Today Content",
        video_url="https://www.youtube.com/embed/example",
        release_date=today,
    )
    future_lesson = Lesson(
        course_id=course.id,
        day_number=3,
        title="Day 3 Future",
        content_markdown="# Secret Future Content",
        release_date=today + timedelta(days=2),
    )
    db.add_all([past_lesson, today_lesson, future_lesson])
    db.flush()

    quiz = Quiz(lesson_id=today_lesson.id, pass_mark_percent=70)
    db.add(quiz)
    db.flush()

    q1 = Question(
        quiz_id=quiz.id,
        text="What is 2 + 2?",
        options=["3", "4", "5"],
        correct_index=1,
        explanation="2 + 2 is 4.",
        order=1,
    )
    q2 = Question(
        quiz_id=quiz.id,
        text="What is the capital of Nigeria?",
        options=["Lagos", "Abuja", "Kano"],
        correct_index=1,
        explanation="Abuja became the capital in 1991.",
        order=2,
    )
    db.add_all([q1, q2])
    db.commit()
    db.refresh(quiz)
    return course, past_lesson, today_lesson, future_lesson, quiz


def test_public_courses_hide_lesson_markdown(client: TestClient, db_session: Session) -> None:
    course, _, _, _, _ = _create_course_with_lessons(db_session)

    list_res = client.get("/api/courses")
    assert list_res.status_code == 200
    assert any(c["id"] == course.id and c["total_lessons"] == 3 for c in list_res.json())

    detail_res = client.get(f"/api/courses/{course.id}")
    assert detail_res.status_code == 200
    payload = detail_res.json()
    assert len(payload["syllabus"]) == 3
    for item in payload["syllabus"]:
        assert "content_markdown" not in item


def test_access_gating_unpaid_and_expired_users_get_403_not_paid(
    client: TestClient,
    db_session: Session,
) -> None:
    course, past_lesson, today_lesson, _, quiz = _create_course_with_lessons(db_session)
    user = _create_user_and_login(client, db_session, "unpaid@example.com")

    # No enrollment -> 403 not_paid
    for path in (
        "/api/lessons/today",
        "/api/lessons/unlocked",
        f"/api/lessons/{today_lesson.id}",
        f"/api/lessons/{today_lesson.id}/quiz",
        f"/api/quizzes/{quiz.id}",
    ):
        res = client.get(path)
        assert res.status_code == 403, f"Expected 403 for {path}"
        assert res.json()["detail"]["reason"] == "not_paid"

    # Pending enrollment -> still 403 not_paid
    enrollment = Enrollment(
        user_id=user.id,
        course_id=course.id,
        status=EnrollmentStatus.pending,
        paystack_reference="ref_pending_1",
    )
    db_session.add(enrollment)
    db_session.commit()

    res = client.get(f"/api/lessons/{past_lesson.id}")
    assert res.status_code == 403
    assert res.json()["detail"]["reason"] == "not_paid"

    # Paid but expired -> still 403 not_paid
    enrollment.status = EnrollmentStatus.paid
    enrollment.paid_at = datetime.now(UTC) - timedelta(days=40)
    enrollment.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()

    res = client.get(f"/api/lessons/{today_lesson.id}")
    assert res.status_code == 403
    assert res.json()["detail"]["reason"] == "not_paid"


def test_access_gating_paid_user_released_vs_future_lesson(
    client: TestClient,
    db_session: Session,
) -> None:
    course, past_lesson, today_lesson, future_lesson, _ = _create_course_with_lessons(db_session)
    user = _create_user_and_login(client, db_session, "paid@example.com")

    db_session.add(
        Enrollment(
            user_id=user.id,
            course_id=course.id,
            status=EnrollmentStatus.paid,
            paid_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=30),
            paystack_reference="ref_paid_1",
        )
    )
    db_session.commit()

    # Past and today's lessons succeed
    past_res = client.get(f"/api/lessons/{past_lesson.id}")
    assert past_res.status_code == 200
    assert past_res.json()["content_markdown"] == "# Past Content"

    today_res = client.get("/api/lessons/today")
    assert today_res.status_code == 200
    today_data = today_res.json()
    assert today_data["lesson"]["id"] == today_lesson.id
    assert [l["id"] for l in today_data["past_lessons"]] == [past_lesson.id, today_lesson.id]
    assert today_data["total_lessons"] == 3
    assert today_data["unlocked_count"] == 2
    assert today_data["next_release_date"] == future_lesson.release_date.isoformat()

    # Future lesson returns 403 not_released_yet
    future_res = client.get(f"/api/lessons/{future_lesson.id}")
    assert future_res.status_code == 403
    assert future_res.json()["detail"]["reason"] == "not_released_yet"


def test_quiz_never_exposes_correct_index_and_grades_server_side_with_retakes(
    client: TestClient,
    db_session: Session,
) -> None:
    course, _, today_lesson, future_lesson, quiz = _create_course_with_lessons(db_session)
    user = _create_user_and_login(client, db_session, "quizzer@example.com")

    db_session.add(
        Enrollment(
            user_id=user.id,
            course_id=course.id,
            status=EnrollmentStatus.paid,
            paid_at=datetime.now(UTC),
            paystack_reference="ref_quiz_1",
        )
    )
    # Add a quiz on the future lesson to verify rule 4 (not released yet)
    future_quiz = Quiz(lesson_id=future_lesson.id, pass_mark_percent=70)
    db_session.add(future_quiz)
    db_session.commit()

    # Future quiz blocked with not_released_yet
    blocked = client.get(f"/api/quizzes/{future_quiz.id}")
    assert blocked.status_code == 403
    assert blocked.json()["detail"]["reason"] == "not_released_yet"

    # Fetch unlocked quiz: must NOT contain correct_index or explanation
    quiz_res = client.get(f"/api/lessons/{today_lesson.id}/quiz")
    assert quiz_res.status_code == 200
    quiz_data = quiz_res.json()
    assert len(quiz_data["questions"]) == 2
    for q in quiz_data["questions"]:
        assert "correct_index" not in q
        assert "explanation" not in q

    q1_id = str(quiz_data["questions"][0]["id"])
    q2_id = str(quiz_data["questions"][1]["id"])

    # Attempt 1: 1/2 correct (50% -> fail)
    attempt1 = client.post(
        f"/api/quizzes/{quiz.id}/submit",
        json={"answers": {q1_id: 1, q2_id: 0}},
    )
    assert attempt1.status_code == 200
    a1 = attempt1.json()
    assert a1["score_percent"] == 50.0
    assert a1["passed"] is False
    assert a1["best_score_percent"] == 50.0
    assert a1["latest_score_percent"] == 50.0
    assert a1["attempts_count"] == 1
    for r in a1["results"]:
        assert "correct_index" not in r
        assert r["explanation"]

    # Attempt 2 (retake): 2/2 correct (100% -> pass)
    attempt2 = client.post(
        f"/api/quizzes/{quiz.id}/submit",
        json={"answers": {q1_id: 1, q2_id: 1}},
    )
    assert attempt2.status_code == 200
    a2 = attempt2.json()
    assert a2["score_percent"] == 100.0
    assert a2["passed"] is True
    assert a2["best_score_percent"] == 100.0
    assert a2["latest_score_percent"] == 100.0
    assert a2["attempts_count"] == 2

    # Attempt 3 (retake with lower score): best stays 100%, latest becomes 0%
    attempt3 = client.post(
        f"/api/quizzes/{quiz.id}/submit",
        json={"answers": {q1_id: 0, q2_id: 0}},
    )
    assert attempt3.status_code == 200
    a3 = attempt3.json()
    assert a3["score_percent"] == 0.0
    assert a3["best_score_percent"] == 100.0
    assert a3["latest_score_percent"] == 0.0
    assert a3["attempts_count"] == 3

    # /api/scores reflects all 3 attempts and best/latest summary
    scores_res = client.get("/api/scores")
    assert scores_res.status_code == 200
    scores = scores_res.json()
    assert scores["total_attempts"] == 3
    assert scores["quizzes_passed"] == 1
    assert scores["average_best_score"] == 100.0
    assert scores["by_lesson"][0]["best_score_percent"] == 100.0
    assert scores["by_lesson"][0]["latest_score_percent"] == 0.0


def test_quiz_submit_rate_limiting(client: TestClient, db_session: Session) -> None:
    course, _, _, _, quiz = _create_course_with_lessons(db_session)
    user = _create_user_and_login(client, db_session, "ratelimit@example.com")
    db_session.add(
        Enrollment(
            user_id=user.id,
            course_id=course.id,
            status=EnrollmentStatus.paid,
            paid_at=datetime.now(UTC),
            paystack_reference="ref_rl_1",
        )
    )
    db_session.commit()

    max_attempts = quiz_rate_limiter.max_requests
    for _ in range(max_attempts):
        res = client.post(f"/api/quizzes/{quiz.id}/submit", json={"answers": {}})
        assert res.status_code == 200

    blocked = client.post(f"/api/quizzes/{quiz.id}/submit", json={"answers": {}})
    assert blocked.status_code == 429


def test_seed_script_is_idempotent(db_session: Session) -> None:
    first = seed_database(db_session)
    assert first["lessons_created"] == 7
    assert first["quizzes_created"] == 7

    second = seed_database(db_session)
    assert second["course_id"] == first["course_id"]
    assert second["lessons_created"] == 0
    assert second["quizzes_created"] == 0
