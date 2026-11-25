"""Idempotent seed script for Daily Lessons.

Creates:
- Admin user: admin@dailylessons.local / AdminPass123!
- Sample paid student: student@dailylessons.local / StudentPass123!
- 1 active course with 7 daily lessons (Days 1-3 past, Day 4 today, Days 5-7 upcoming)
- 7 quizzes (3 questions each)
"""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
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
from app.services.access import now_utc, today_in_app_tz

SAMPLE_COURSE_TITLE = "7-Day Practical Python & Web Engineering"

SEED_LESSONS = [
    {
        "day_number": 1,
        "offset_days": -3,
        "title": "Thinking in Systems & HTTP Basics",
        "video_url": "https://www.youtube.com/embed/iYM2zFP3Zn0",
        "content_markdown": """# Day 1: Thinking in Systems & HTTP Basics

Welcome to **Day 1**! Every modern web application speaks HTTP.

## Key Concepts
- **Request / Response cycle**: Clients send a method, path, headers, and optional body; servers return a status code, headers, and payload.
- **Idempotency**: `GET`, `PUT`, and `DELETE` should be safe to retry without unintended duplicate side effects.
- **Status codes**: `2xx` success, `4xx` client error, `5xx` server error.

## Today's Exercise
Inspect a request in your browser DevTools Network tab and note the status code and `Content-Type` header.
""",
        "questions": [
            (
                "Which HTTP status code best indicates that a client is authenticated but lacks permission?",
                ["401 Unauthorized", "403 Forbidden", "404 Not Found", "500 Internal Server Error"],
                1,
                "403 Forbidden signals that the server understood the request and identity, but refuses to authorize it.",
            ),
            (
                "Which HTTP method is defined as safe and read-only?",
                ["POST", "PUT", "GET", "PATCH"],
                2,
                "GET requests should only retrieve data and have no side effects.",
            ),
            (
                "Why does idempotency matter for webhooks and payments?",
                [
                    "It speeds up CSS rendering",
                    "It ensures retried deliveries do not apply the same effect twice",
                    "It disables TLS encryption",
                    "It removes the need for a database",
                ],
                1,
                "Webhook providers retry on timeouts; idempotent handlers safely ignore duplicate deliveries.",
            ),
        ],
    },
    {
        "day_number": 2,
        "offset_days": -2,
        "title": "Relational Data Modeling & Constraints",
        "video_url": None,
        "content_markdown": """# Day 2: Relational Data Modeling & Constraints

Good schemas enforce invariants at the database layer so bugs in application code cannot corrupt your data.

## Core Principles
- Use **foreign keys** to guarantee referential integrity.
- Use **unique constraints** (e.g. `(user_id, lesson_id, type)`) to prevent duplicate records even under concurrency.
- Index columns you frequently filter or join on (`email`, `release_date`, `course_id`).
""",
        "questions": [
            (
                "What does a composite unique constraint on (user_id, lesson_id, type) guarantee?",
                [
                    "Only one row can exist in the entire table",
                    "A user can receive each email type for a given lesson at most once",
                    "Lessons are automatically sorted by date",
                    "Passwords are encrypted automatically",
                ],
                1,
                "A composite unique constraint prevents duplicate combinations of those three columns.",
            ),
            (
                "Why should you add an index on a frequently queried date column?",
                [
                    "To make range and equality lookups much faster",
                    "To prevent NULL values",
                    "To compress text columns",
                    "To allow duplicate primary keys",
                ],
                0,
                "Indexes allow PostgreSQL to locate matching rows without scanning the entire table.",
            ),
            (
                "What is the purpose of Alembic in a SQLAlchemy project?",
                [
                    "Sending SMTP emails",
                    "Managing versioned database schema migrations",
                    "Rendering React components",
                    "Hashing passwords",
                ],
                1,
                "Alembic tracks and applies incremental schema changes reproducibly across environments.",
            ),
        ],
    },
    {
        "day_number": 3,
        "offset_days": -1,
        "title": "Authentication, Cookies & Password Security",
        "video_url": None,
        "content_markdown": """# Day 3: Authentication, Cookies & Password Security

Never store plaintext passwords and never store sensitive session tokens where XSS can easily steal them.

## Checklist
- Hash passwords with **bcrypt** (unique salt per password, adaptive cost factor).
- Store JWTs in **`httpOnly` cookies** so JavaScript cannot read `document.cookie`.
- Rate-limit login endpoints to slow down credential-stuffing attacks.
""",
        "questions": [
            (
                "Why store a JWT in an httpOnly cookie instead of localStorage?",
                [
                    "Cookies have unlimited size",
                    "JavaScript running on the page cannot read httpOnly cookies",
                    "localStorage is not supported in Chrome",
                    "httpOnly cookies skip CORS checks",
                ],
                1,
                "httpOnly prevents client-side scripts from accessing the token via document.cookie, mitigating XSS token theft.",
            ),
            (
                "Why is bcrypt preferred over SHA-256 for password storage?",
                [
                    "bcrypt is intentionally slow and includes a per-password salt",
                    "SHA-256 cannot hash strings",
                    "bcrypt is reversible so admins can read passwords",
                    "bcrypt compresses passwords to 8 bytes",
                ],
                0,
                "Slow, salted hashing makes brute-force and rainbow-table attacks dramatically more expensive.",
            ),
            (
                "What HTTP status code should a rate-limited endpoint return?",
                ["200 OK", "302 Found", "429 Too Many Requests", "418 I'm a teapot"],
                2,
                "429 Too Many Requests communicates that the client exceeded its allowed request budget.",
            ),
        ],
    },
    {
        "day_number": 4,
        "offset_days": 0,
        "title": "Server-Side Access Gating & Timezones",
        "video_url": "https://www.youtube.com/embed/0sOvCWFmrtA",
        "content_markdown": """# Day 4: Server-Side Access Gating & Timezones

Welcome to **today's lesson**! Client-side checks are only for UX—real authorization must always happen on the server.

## Rules We Enforce
1. Verify the user has a **paid, unexpired** enrollment before returning lesson content.
2. Compare `lesson.release_date <= today` in the configured business timezone (`Africa/Lagos`).
3. Return clear `403` reason codes (`not_paid`, `not_released_yet`) so the frontend can show the right screen.
""",
        "questions": [
            (
                "Where must paywall and release-date checks be enforced?",
                [
                    "Only in React components",
                    "On the server for every lesson and quiz endpoint",
                    "In CSS visibility rules",
                    "In browser localStorage",
                ],
                1,
                "Any client-side check can be bypassed; server-side enforcement guarantees protected data never leaks.",
            ),
            (
                "Why use a specific timezone like Africa/Lagos when evaluating today's lesson?",
                [
                    "PostgreSQL only supports Africa/Lagos",
                    "UTC midnight does not match local midnight for learners",
                    "Python cannot compute UTC dates",
                    "HTTP headers require it",
                ],
                1,
                "Using the configured business timezone ensures daily lessons unlock at the expected local calendar day.",
            ),
            (
                "Should quiz endpoints return correct_index to regular students before grading?",
                [
                    "Yes, so the browser can grade faster",
                    "No, grading must happen on the server without exposing correct_index",
                    "Only on the second attempt",
                    "Only when CORS is enabled",
                ],
                1,
                "Exposing correct_index lets anyone inspect network traffic to get 100% without learning.",
            ),
        ],
    },
    {
        "day_number": 5,
        "offset_days": 1,
        "title": "Payment Integrations & Webhook Verification",
        "video_url": None,
        "content_markdown": """# Day 5: Payment Integrations & Webhook Verification

Never trust a browser redirect (`?status=success`) to grant paid access.

## Safe Payment Flow
1. Backend initializes a Paystack transaction and records a `pending` enrollment with a unique reference.
2. Paystack calls your webhook signed with `x-paystack-signature` (HMAC-SHA512).
3. Your server verifies the HMAC signature **and** calls Paystack's verify API before marking the enrollment `paid`.
""",
        "questions": [
            (
                "How should your server authenticate incoming Paystack webhooks?",
                [
                    "Trust any POST to /webhook",
                    "Verify the HMAC-SHA512 x-paystack-signature header using your secret key",
                    "Check the User-Agent header",
                    "Read a query parameter from the frontend",
                ],
                1,
                "Validating the HMAC-SHA512 signature proves the webhook came from Paystack and was not tampered with.",
            ),
            (
                "Why keep the payment gateway behind an abstract interface?",
                [
                    "To make it easy to swap providers or mock payments in tests",
                    "Because FastAPI requires it",
                    "To avoid using environment variables",
                    "To skip signature checks",
                ],
                0,
                "A clean interface decouples domain logic from Paystack specifics and enables deterministic unit tests.",
            ),
            (
                "What should happen if Paystack delivers the same charge.success webhook twice?",
                [
                    "Throw a 500 error",
                    "Create a duplicate enrollment",
                    "Handle it idempotently and return 200 without duplicating state",
                    "Revoke the user's access",
                ],
                2,
                "Idempotent webhook processing safely handles duplicate deliveries.",
            ),
        ],
    },
    {
        "day_number": 6,
        "offset_days": 2,
        "title": "Background Workers & Idempotent Email Jobs",
        "video_url": None,
        "content_markdown": """# Day 6: Background Workers & Idempotent Email Jobs

Scheduled jobs belong in a dedicated worker container—not inside your web server workers.

## Why Separate the Worker?
- Running multiple Uvicorn/Gunicorn web replicas would otherwise trigger the same cron job multiple times.
- Recording every send in `email_log` with a unique `(user_id, lesson_id, type)` constraint guarantees learners never get spammed on retries.
""",
        "questions": [
            (
                "Why run APScheduler in a separate worker container instead of the API process?",
                [
                    "FastAPI cannot import APScheduler",
                    "Scaling web processes would cause duplicate scheduled job runs",
                    "Workers do not need database access",
                    "Docker requires at least 4 containers",
                ],
                1,
                "Keeping scheduling in a dedicated worker avoids duplicate cron execution when web workers scale.",
            ),
            (
                "How does email_log help make the morning email job idempotent?",
                [
                    "It skips sending if a 'sent' record already exists for (user, lesson, type)",
                    "It deletes old users automatically",
                    "It disables SMTP TLS",
                    "It caches HTML in localStorage",
                ],
                0,
                "Checking and recording sent rows prevents duplicate emails when the job is re-run.",
            ),
            (
                "What should happen when an SMTP send fails transiently?",
                [
                    "Ignore silently without logging",
                    "Retry with backoff up to a limit and log the failure if it persists",
                    "Crash the database container",
                    "Mark the email as sent",
                ],
                1,
                "Bounded retries with backoff recover from transient network glitches while recording persistent errors.",
            ),
        ],
    },
    {
        "day_number": 7,
        "offset_days": 3,
        "title": "Shipping, Observability & Admin Operations",
        "video_url": None,
        "content_markdown": """# Day 7: Shipping, Observability & Admin Operations

Congratulations on reaching Day 7! Running a real learning platform means supporting learners smoothly.

## Operational Essentials
- Role-guarded `/admin` dashboard to monitor revenue, email delivery logs, and quiz performance.
- Manual grant/revoke controls for handling edge cases and scholarships.
- Automated tests covering your highest-risk invariants: access gating, grading, webhooks, and email idempotency.
""",
        "questions": [
            (
                "Who should be allowed to access /admin API endpoints?",
                [
                    "Any authenticated user",
                    "Only users with role == 'admin' verified on the server",
                    "Anyone who navigates to /admin in the browser",
                    "Any user with a paid enrollment",
                ],
                1,
                "Admin endpoints must enforce role == 'admin' server-side via a dependency guard.",
            ),
            (
                "Why export quiz scores to CSV from the admin panel?",
                [
                    "For offline reporting, cohort analysis, and certificate tracking",
                    "Because PostgreSQL cannot store numbers",
                    "To replace database backups",
                    "To disable authentication",
                ],
                0,
                "CSV export lets instructors analyze learner performance in spreadsheets or BI tools.",
            ),
            (
                "Which invariant is MOST critical to test automatically before every deploy?",
                [
                    "Button hover colors",
                    "Access gating, server-side grading, webhook idempotency, and email idempotency",
                    "Font family names",
                    "README line count",
                ],
                1,
                "Testing security, billing, and data-integrity invariants prevents the most costly regressions.",
            ),
        ],
    },
]


def seed_database(db: Session) -> dict[str, int]:
    today = today_in_app_tz()

    # 1. Admin user
    admin = db.scalar(select(User).where(User.email == "admin@dailylessons.local"))
    if not admin:
        admin = User(
            name="Admin Instructor",
            email="admin@dailylessons.local",
            password_hash=hash_password("AdminPass123!"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.flush()

    # 2. Sample student user
    student = db.scalar(select(User).where(User.email == "student@dailylessons.local"))
    if not student:
        student = User(
            name="Demo Learner",
            email="student@dailylessons.local",
            password_hash=hash_password("StudentPass123!"),
            role=UserRole.user,
        )
        db.add(student)
        db.flush()

    # 3. Sample course
    course = db.scalar(select(Course).where(Course.title == SAMPLE_COURSE_TITLE))
    if not course:
        course = Course(
            title=SAMPLE_COURSE_TITLE,
            description=(
                "Master practical full-stack engineering in 7 focused daily lessons. "
                "Each morning unlocks a concise guide and an interactive quiz to lock in what you learned."
            ),
            price_kobo=1500000,  # NGN 15,000.00
            is_active=True,
        )
        db.add(course)
        db.flush()

    # 4. Paid enrollment for demo student
    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.user_id == student.id,
            Enrollment.course_id == course.id,
        )
    )
    if not enrollment:
        enrollment = Enrollment(
            user_id=student.id,
            course_id=course.id,
            status=EnrollmentStatus.paid,
            paid_at=now_utc(),
            expires_at=None,
            paystack_reference="seed_demo_enrollment_001",
        )
        db.add(enrollment)

    # 5. 7 Lessons + Quizzes + Questions
    lessons_created = 0
    quizzes_created = 0
    for item in SEED_LESSONS:
        lesson = db.scalar(
            select(Lesson).where(
                Lesson.course_id == course.id,
                Lesson.day_number == item["day_number"],
            )
        )
        if not lesson:
            lesson = Lesson(
                course_id=course.id,
                day_number=item["day_number"],
                title=item["title"],
                content_markdown=item["content_markdown"].strip(),
                video_url=item["video_url"],
                release_date=today + timedelta(days=item["offset_days"]),
            )
            db.add(lesson)
            db.flush()
            lessons_created += 1

        quiz = db.scalar(select(Quiz).where(Quiz.lesson_id == lesson.id))
        if not quiz:
            quiz = Quiz(lesson_id=lesson.id, pass_mark_percent=70)
            db.add(quiz)
            db.flush()
            quizzes_created += 1

            for order_idx, (q_text, options, correct_idx, explanation) in enumerate(
                item["questions"], start=1
            ):
                db.add(
                    Question(
                        quiz_id=quiz.id,
                        text=q_text,
                        options=options,
                        correct_index=correct_idx,
                        explanation=explanation,
                        order=order_idx,
                    )
                )

    db.commit()
    return {
        "course_id": course.id,
        "lessons_created": lessons_created,
        "quizzes_created": quizzes_created,
    }


def main() -> None:
    with SessionLocal() as db:
        result = seed_database(db)
        print(
            f"Seed complete: course_id={result['course_id']}, "
            f"lessons_created={result['lessons_created']}, "
            f"quizzes_created={result['quizzes_created']}"
        )


if __name__ == "__main__":
    main()
