from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Course, Enrollment, EnrollmentStatus, Lesson, User, UserRole


def today_in_app_tz() -> date:
    settings = get_settings()
    tz = ZoneInfo(settings.timezone)
    return datetime.now(tz).date()


def now_utc() -> datetime:
    return datetime.now(UTC)


def get_active_paid_course_ids(db: Session, user_id: int) -> list[int]:
    user = db.get(User, user_id)
    if user and user.role == UserRole.admin:
        return list(db.scalars(select(Course.id).where(Course.is_active.is_(True))).all())

    current_time = now_utc()
    stmt = (
        select(Enrollment.course_id)
        .where(
            Enrollment.user_id == user_id,
            Enrollment.status == EnrollmentStatus.paid,
            or_(Enrollment.expires_at.is_(None), Enrollment.expires_at > current_time),
        )
        .distinct()
    )
    return list(db.scalars(stmt).all())


def has_active_paid_enrollment(db: Session, user_id: int, course_id: int) -> bool:
    current_time = now_utc()
    stmt = select(Enrollment.id).where(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id,
        Enrollment.status == EnrollmentStatus.paid,
        or_(Enrollment.expires_at.is_(None), Enrollment.expires_at > current_time),
    )
    return db.scalar(stmt) is not None


def ensure_lesson_access(
    db: Session,
    user: User,
    lesson: Lesson,
    *,
    today: date | None = None,
) -> None:
    if user.role == UserRole.admin:
        return

    if not has_active_paid_enrollment(db, user.id, lesson.course_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "reason": "not_paid",
                "message": "An active paid enrollment is required to access this lesson.",
            },
        )

    effective_today = today or today_in_app_tz()
    if lesson.release_date > effective_today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "reason": "not_released_yet",
                "message": "This lesson has not been released yet.",
                "release_date": lesson.release_date.isoformat(),
            },
        )
