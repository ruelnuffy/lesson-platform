from datetime import UTC, date, datetime, timedelta
import hashlib
import hmac
import json

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.models import (
    Course,
    EmailLog,
    EmailStatus,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    User,
    UserRole,
)
from app.security.password import hash_password
from app.services.access import today_in_app_tz
from app.services.daily_email_job import DAILY_LESSON_EMAIL_TYPE, run_daily_lesson_emails
from app.services.email import EmailSendError, EmailSender
from app.services.payments import (
    PaymentInitResult,
    PaymentProvider,
    PaymentVerifyResult,
    get_payment_provider,
)


class FakePaymentProvider(PaymentProvider):
    def __init__(self, secret: str = "test_webhook_secret", verify_amount: int = 1500000, is_paid: bool = True) -> None:
        self.secret = secret
        self.verify_amount = verify_amount
        self.is_paid = is_paid
        self.verify_calls: list[str] = []

    def initialize_transaction(self, *, email, amount_kobo, reference, callback_url, metadata=None) -> PaymentInitResult:
        return PaymentInitResult(
            authorization_url=f"https://checkout.paystack.test/{reference}",
            access_code="acc_test_123",
            reference=reference,
        )

    def verify_transaction(self, reference: str) -> PaymentVerifyResult:
        self.verify_calls.append(reference)
        return PaymentVerifyResult(
            is_paid=self.is_paid,
            amount_kobo=self.verify_amount,
            reference=reference,
            raw={"status": "success" if self.is_paid else "failed"},
        )

    def verify_webhook_signature(self, raw_body: bytes, signature: str | None) -> bool:
        if not signature:
            return False
        expected = hmac.new(self.secret.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
        return hmac.compare_digest(expected, signature)

    def sign(self, raw_body: bytes) -> str:
        return hmac.new(self.secret.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()


class FakeEmailSender(EmailSender):
    def __init__(self, fail_times_per_email: dict[str, int] | None = None) -> None:
        self.sent: list[dict[str, str]] = []
        self.attempts: dict[str, int] = {}
        self.fail_times = dict(fail_times_per_email or {})

    def send_email(self, *, to_email: str, subject: str, html_body: str, text_body: str) -> None:
        self.attempts[to_email] = self.attempts.get(to_email, 0) + 1
        remaining_failures = self.fail_times.get(to_email, 0)
        if remaining_failures > 0:
            self.fail_times[to_email] = remaining_failures - 1
            raise EmailSendError("Simulated transient SMTP error")
        self.sent.append(
            {
                "to": to_email,
                "subject": subject,
                "html": html_body,
                "text": text_body,
            }
        )


def test_webhook_signature_validation_and_idempotency(
    client: TestClient,
    db_session: Session,
) -> None:
    provider = FakePaymentProvider(verify_amount=1500000, is_paid=True)
    app.dependency_overrides[get_payment_provider] = lambda: provider
    try:
        user = User(
            name="Buyer",
            email="buyer@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.user,
        )
        course = Course(
            title="Paid Course",
            description="Desc",
            price_kobo=1500000,
            is_active=True,
        )
        db_session.add_all([user, course])
        db_session.commit()

        # Login and initialize payment
        assert (
            client.post(
                "/api/auth/login",
                json={"email": "buyer@example.com", "password": "password123"},
            ).status_code
            == 200
        )
        init_res = client.post("/api/payments/initialize", json={"course_id": course.id})
        assert init_res.status_code == 200
        reference = init_res.json()["reference"]

        webhook_body = json.dumps(
            {
                "event": "charge.success",
                "data": {"reference": reference, "amount": 1500000},
            }
        ).encode("utf-8")

        # 1. Invalid signature -> 400
        bad_sig = client.post(
            "/api/payments/webhook",
            content=webhook_body,
            headers={"x-paystack-signature": "invalid", "content-type": "application/json"},
        )
        assert bad_sig.status_code == 400

        # 2. Valid signature -> verifies server-side and marks paid
        sig = provider.sign(webhook_body)
        ok_res = client.post(
            "/api/payments/webhook",
            content=webhook_body,
            headers={"x-paystack-signature": sig, "content-type": "application/json"},
        )
        assert ok_res.status_code == 200
        assert ok_res.json()["status"] == "processed"
        assert len(provider.verify_calls) == 1

        enrollment = db_session.scalar(
            select(Enrollment).where(Enrollment.paystack_reference == reference)
        )
        assert enrollment is not None
        assert enrollment.status == EnrollmentStatus.paid
        first_paid_at = enrollment.paid_at
        assert first_paid_at is not None

        # 3. Duplicate webhook delivery -> idempotent, does NOT call verify again or mutate paid_at
        dup_res = client.post(
            "/api/payments/webhook",
            content=webhook_body,
            headers={"x-paystack-signature": sig, "content-type": "application/json"},
        )
        assert dup_res.status_code == 200
        assert dup_res.json()["status"] == "already_processed"
        assert len(provider.verify_calls) == 1
        db_session.refresh(enrollment)
        assert enrollment.paid_at == first_paid_at
    finally:
        app.dependency_overrides.pop(get_payment_provider, None)


def test_webhook_does_not_mark_paid_when_underpaid(
    client: TestClient,
    db_session: Session,
) -> None:
    provider = FakePaymentProvider(verify_amount=500, is_paid=True)
    app.dependency_overrides[get_payment_provider] = lambda: provider
    try:
        user = User(
            name="Underpayer",
            email="under@example.com",
            password_hash=hash_password("password123"),
            role=UserRole.user,
        )
        course = Course(
            title="Expensive Course",
            description="Desc",
            price_kobo=1500000,
            is_active=True,
        )
        db_session.add_all([user, course])
        db_session.flush()

        enrollment = Enrollment(
            user_id=user.id,
            course_id=course.id,
            status=EnrollmentStatus.pending,
            paystack_reference="ref_underpaid_1",
        )
        db_session.add(enrollment)
        db_session.commit()

        body = json.dumps(
            {"event": "charge.success", "data": {"reference": "ref_underpaid_1"}}
        ).encode("utf-8")
        res = client.post(
            "/api/payments/webhook",
            content=body,
            headers={"x-paystack-signature": provider.sign(body), "content-type": "application/json"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "not_verified"
        db_session.refresh(enrollment)
        assert enrollment.status == EnrollmentStatus.pending
    finally:
        app.dependency_overrides.pop(get_payment_provider, None)


def test_daily_email_job_idempotency_and_retries(db_session: Session) -> None:
    today = date(2099, 1, 15)
    course = Course(
        title="Email Test Course",
        description="Desc",
        price_kobo=1000000,
        is_active=True,
    )
    db_session.add(course)
    db_session.flush()

    today_lesson = Lesson(
        course_id=course.id,
        day_number=1,
        title="Morning Lesson",
        content_markdown="# Good morning",
        release_date=today,
    )
    db_session.add(today_lesson)

    paid_user = User(
        name="Paid Learner",
        email="paid_mail@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    flaky_user = User(
        name="Flaky Learner",
        email="flaky_mail@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    failing_user = User(
        name="Broken Mail",
        email="broken_mail@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    unpaid_user = User(
        name="Unpaid Learner",
        email="unpaid_mail@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    expired_user = User(
        name="Expired Learner",
        email="expired_mail@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    db_session.add_all([paid_user, flaky_user, failing_user, unpaid_user, expired_user])
    db_session.flush()

    db_session.add_all(
        [
            Enrollment(
                user_id=paid_user.id,
                course_id=course.id,
                status=EnrollmentStatus.paid,
                paid_at=datetime.now(UTC),
                paystack_reference="mail_ref_1",
            ),
            Enrollment(
                user_id=flaky_user.id,
                course_id=course.id,
                status=EnrollmentStatus.paid,
                paid_at=datetime.now(UTC),
                paystack_reference="mail_ref_2",
            ),
            Enrollment(
                user_id=failing_user.id,
                course_id=course.id,
                status=EnrollmentStatus.paid,
                paid_at=datetime.now(UTC),
                paystack_reference="mail_ref_3",
            ),
            Enrollment(
                user_id=unpaid_user.id,
                course_id=course.id,
                status=EnrollmentStatus.pending,
                paystack_reference="mail_ref_4",
            ),
            Enrollment(
                user_id=expired_user.id,
                course_id=course.id,
                status=EnrollmentStatus.paid,
                paid_at=datetime.now(UTC) - timedelta(days=30),
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                paystack_reference="mail_ref_5",
            ),
        ]
    )
    db_session.commit()

    # flaky_user fails twice then succeeds on 3rd try; failing_user fails all 3 tries
    sender = FakeEmailSender(
        fail_times_per_email={
            "flaky_mail@example.com": 2,
            "broken_mail@example.com": 5,
        }
    )

    first_run = run_daily_lesson_emails(
        db_session,
        email_sender=sender,
        target_date=today,
        max_retries=3,
        base_backoff_seconds=0.0,
    )
    assert first_run["sent"] == 2  # paid_user + flaky_user
    assert first_run["failed"] == 1  # failing_user
    assert first_run["skipped"] == 0
    assert sender.attempts["flaky_mail@example.com"] == 3
    assert sender.attempts["broken_mail@example.com"] == 3
    assert "unpaid_mail@example.com" not in sender.attempts
    assert "expired_mail@example.com" not in sender.attempts
    assert all("/lessons/today" in m["html"] and "/lessons/today" in m["text"] for m in sender.sent)

    # Second run: paid_user and flaky_user must be SKIPPED (idempotent!); failing_user retried
    sender.fail_times["broken_mail@example.com"] = 0
    second_run = run_daily_lesson_emails(
        db_session,
        email_sender=sender,
        target_date=today,
        max_retries=3,
        base_backoff_seconds=0.0,
    )
    assert second_run["skipped"] == 2
    assert second_run["sent"] == 1  # broken_mail recovered
    assert second_run["failed"] == 0

    # Verify email_log has exactly 3 sent rows
    logs = list(
        db_session.scalars(
            select(EmailLog).where(
                EmailLog.lesson_id == today_lesson.id,
                EmailLog.type == DAILY_LESSON_EMAIL_TYPE,
            )
        ).all()
    )
    assert len(logs) == 3
    assert all(l.status == EmailStatus.sent for l in logs)
