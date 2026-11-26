from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.security.password import hash_password


def test_reviews_create_and_list(client: TestClient, db_session: Session) -> None:
    # Unauthenticated post is rejected
    unauth = client.post(
        "/api/reviews",
        json={"rating": 5, "comment": "Great daily lessons!"},
    )
    assert unauth.status_code == 401

    # Public GET works
    initial = client.get("/api/reviews")
    assert initial.status_code == 200
    assert isinstance(initial.json(), list)

    # Create user and login
    user = User(
        name="Review Learner",
        email="reviewer@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    db_session.add(user)
    db_session.commit()

    assert (
        client.post(
            "/api/auth/login",
            json={"email": "reviewer@example.com", "password": "password123"},
        ).status_code
        == 200
    )

    # Authenticated user creates a review
    created = client.post(
        "/api/reviews",
        json={
            "rating": 5,
            "role_label": "Developer, Lagos",
            "comment": "Really enjoying the morning lessons and quizzes!",
        },
    )
    assert created.status_code == 201
    data = created.json()
    assert data["user_name"] == "Review Learner"
    assert data["rating"] == 5
    assert data["role_label"] == "Developer, Lagos"

    # Appears in public GET /api/reviews
    listed = client.get("/api/reviews")
    assert listed.status_code == 200
    assert any(r["id"] == data["id"] for r in listed.json())
