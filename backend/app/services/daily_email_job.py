from datetime import date
import logging
import time

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    EmailLog,
    EmailStatus,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    User,
)
from app.services.access import now_utc, today_in_app_tz
from app.services.email import EmailSender, get_email_sender, render_daily_lesson_email

logger = logging.getLogger("daily_lessons.daily_email_job")

DAILY_LESSON_EMAIL_TYPE = "daily_lesson"


def run_daily_lesson_emails(
    db: Session,
    *,
    email_sender: EmailSender | None = None,
    target_date: date | None = None,
    max_retries: int = 3,
    base_backoff_seconds: float = 1.0,
) -> dict[str, int | str]:
    """Send daily lesson emails idempotently to paid, unexpired users.

    Skips any (user, lesson, 'daily_lesson') pair that already has a 'sent' row
    in email_log. Retries failed sends up to max_retries times with exponential
    backoff and records failures in email_log.
    """
    settings = get_settings()
    sender = email_sender or get_email_sender()
    effective_date = target_date or today_in_app_tz()
    current_time = now_utc()
    lesson_url = f"{settings.frontend_origin.rstrip('/')}/lessons/today"

    lessons = list(
        db.scalars(
            select(Lesson)
            .where(Lesson.release_date == effective_date)
            .order_by(Lesson.course_id.asc(), Lesson.day_number.asc())
        ).all()
    )

    sent_count = 0
    skipped_count = 0
    failed_count = 0

    for lesson in lessons:
        users = list(
            db.scalars(
                select(User)
                .join(Enrollment, Enrollment.user_id == User.id)
                .where(
                    Enrollment.course_id == lesson.course_id,
                    Enrollment.status == EnrollmentStatus.paid,
                    or_(Enrollment.expires_at.is_(None), Enrollment.expires_at > current_time),
                )
                .distinct()
            ).all()
        )

        for user in users:
            log_row = db.scalar(
                select(EmailLog).where(
                    EmailLog.user_id == user.id,
                    EmailLog.lesson_id == lesson.id,
                    EmailLog.type == DAILY_LESSON_EMAIL_TYPE,
                )
            )
            if log_row and log_row.status == EmailStatus.sent:
                skipped_count += 1
                continue

            if not log_row:
                log_row = EmailLog(
                    user_id=user.id,
                    lesson_id=lesson.id,
                    type=DAILY_LESSON_EMAIL_TYPE,
                    status=EmailStatus.pending,
                )
                db.add(log_row)
                db.commit()
                db.refresh(log_row)

            subject, html_body, text_body = render_daily_lesson_email(
                user_name=user.name,
                lesson_title=lesson.title,
                day_number=lesson.day_number,
                lesson_url=lesson_url,
            )

            last_error: Exception | None = None
            delivered = False
            for attempt in range(max_retries):
                try:
                    sender.send_email(
                        to_email=user.email,
                        subject=subject,
                        html_body=html_body,
                        text_body=text_body,
                    )
                    delivered = True
                    break
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "Email send failed for user=%s lesson=%s (attempt %s/%s): %s",
                        user.id,
                        lesson.id,
                        attempt + 1,
                        max_retries,
                        exc,
                    )
                    if attempt < max_retries - 1 and base_backoff_seconds > 0:
                        time.sleep(base_backoff_seconds * (2**attempt))

            if delivered:
                log_row.status = EmailStatus.sent
                log_row.sent_at = now_utc()
                log_row.error = None
                sent_count += 1
            else:
                log_row.status = EmailStatus.failed
                log_row.sent_at = now_utc()
                log_row.error = str(last_error) if last_error else "Unknown email send error"
                failed_count += 1

            db.commit()

    return {
        "date": effective_date.isoformat(),
        "lessons_matched": len(lessons),
        "sent": sent_count,
        "skipped": skipped_count,
        "failed": failed_count,
    }
