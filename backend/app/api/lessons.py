from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Lesson, Quiz, QuizAttempt, User
from app.schemas.lessons import (
    LessonDetailResponse,
    LessonSummaryResponse,
    QuizScoreSummary,
    TodayDashboardResponse,
)
from app.security.deps import get_current_user
from app.services.access import (
    ensure_lesson_access,
    get_active_paid_course_ids,
    today_in_app_tz,
)

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


def _build_quiz_summaries(
    db: Session,
    user_id: int,
    quizzes: list[Quiz],
) -> dict[int, QuizScoreSummary]:
    if not quizzes:
        return {}

    quiz_ids = [q.id for q in quizzes]
    attempts = db.scalars(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id.in_(quiz_ids))
        .order_by(QuizAttempt.created_at.asc(), QuizAttempt.id.asc())
    ).all()

    by_quiz: dict[int, list[QuizAttempt]] = defaultdict(list)
    for attempt in attempts:
        by_quiz[attempt.quiz_id].append(attempt)

    summaries: dict[int, QuizScoreSummary] = {}
    for quiz in quizzes:
        q_attempts = by_quiz.get(quiz.id, [])
        if q_attempts:
            best = max(a.score_percent for a in q_attempts)
            latest = q_attempts[-1].score_percent
            passed = any(a.passed for a in q_attempts)
        else:
            best = None
            latest = None
            passed = False

        summaries[quiz.lesson_id] = QuizScoreSummary(
            quiz_id=quiz.id,
            pass_mark_percent=quiz.pass_mark_percent,
            attempts_count=len(q_attempts),
            best_score_percent=best,
            latest_score_percent=latest,
            passed=passed,
        )
    return summaries


def _compute_streak(
    unlocked_lessons: list[Lesson],
    summaries: dict[int, QuizScoreSummary],
    today,
) -> int:
    ordered = sorted(unlocked_lessons, key=lambda l: (l.release_date, l.day_number), reverse=True)
    streak = 0
    for idx, lesson in enumerate(ordered):
        summary = summaries.get(lesson.id)
        if summary and summary.passed:
            streak += 1
        elif idx == 0 and lesson.release_date == today:
            # Today's lesson not completed yet doesn't break an active prior streak
            continue
        else:
            break
    return streak


@router.get("/today", response_model=TodayDashboardResponse)
def get_today_lesson(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TodayDashboardResponse:
    course_ids = get_active_paid_course_ids(db, current_user.id)
    if not course_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "reason": "not_paid",
                "message": "An active paid enrollment is required to access lessons.",
            },
        )

    today = today_in_app_tz()
    all_lessons = list(
        db.scalars(
            select(Lesson)
            .options(selectinload(Lesson.quiz))
            .where(Lesson.course_id.in_(course_ids))
            .order_by(Lesson.release_date.asc(), Lesson.day_number.asc())
        ).all()
    )

    unlocked = [l for l in all_lessons if l.release_date <= today]
    upcoming = [l for l in all_lessons if l.release_date > today]
    today_lesson = next((l for l in unlocked if l.release_date == today), None)

    quizzes = [l.quiz for l in unlocked if l.quiz is not None]
    summaries = _build_quiz_summaries(db, current_user.id, quizzes)

    lesson_detail = None
    if today_lesson is not None:
        lesson_detail = LessonDetailResponse(
            id=today_lesson.id,
            course_id=today_lesson.course_id,
            day_number=today_lesson.day_number,
            title=today_lesson.title,
            content_markdown=today_lesson.content_markdown,
            video_url=today_lesson.video_url,
            release_date=today_lesson.release_date,
            has_quiz=today_lesson.quiz is not None,
            quiz_summary=summaries.get(today_lesson.id),
        )

    past_lessons = [
        LessonSummaryResponse(
            id=l.id,
            course_id=l.course_id,
            day_number=l.day_number,
            title=l.title,
            release_date=l.release_date,
            has_quiz=l.quiz is not None,
            quiz_summary=summaries.get(l.id),
        )
        for l in unlocked
    ]

    completed_quizzes_count = sum(1 for s in summaries.values() if s.passed)
    streak = _compute_streak(unlocked, summaries, today)

    return TodayDashboardResponse(
        today=today,
        lesson=lesson_detail,
        past_lessons=past_lessons,
        total_lessons=len(all_lessons),
        unlocked_count=len(unlocked),
        completed_quizzes_count=completed_quizzes_count,
        streak=streak,
        next_release_date=upcoming[0].release_date if upcoming else None,
    )


@router.get("/unlocked", response_model=list[LessonSummaryResponse])
def list_unlocked_lessons(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LessonSummaryResponse]:
    course_ids = get_active_paid_course_ids(db, current_user.id)
    if not course_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "reason": "not_paid",
                "message": "An active paid enrollment is required to access lessons.",
            },
        )

    today = today_in_app_tz()
    unlocked = list(
        db.scalars(
            select(Lesson)
            .options(selectinload(Lesson.quiz))
            .where(Lesson.course_id.in_(course_ids), Lesson.release_date <= today)
            .order_by(Lesson.release_date.asc(), Lesson.day_number.asc())
        ).all()
    )

    quizzes = [l.quiz for l in unlocked if l.quiz is not None]
    summaries = _build_quiz_summaries(db, current_user.id, quizzes)

    return [
        LessonSummaryResponse(
            id=l.id,
            course_id=l.course_id,
            day_number=l.day_number,
            title=l.title,
            release_date=l.release_date,
            has_quiz=l.quiz is not None,
            quiz_summary=summaries.get(l.id),
        )
        for l in unlocked
    ]


@router.get("/{lesson_id}", response_model=LessonDetailResponse)
def get_lesson_detail(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LessonDetailResponse:
    lesson = db.scalar(
        select(Lesson)
        .options(selectinload(Lesson.quiz))
        .where(Lesson.id == lesson_id)
    )
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    ensure_lesson_access(db, current_user, lesson)

    summaries = (
        _build_quiz_summaries(db, current_user.id, [lesson.quiz])
        if lesson.quiz is not None
        else {}
    )

    return LessonDetailResponse(
        id=lesson.id,
        course_id=lesson.course_id,
        day_number=lesson.day_number,
        title=lesson.title,
        content_markdown=lesson.content_markdown,
        video_url=lesson.video_url,
        release_date=lesson.release_date,
        has_quiz=lesson.quiz is not None,
        quiz_summary=summaries.get(lesson.id),
    )
