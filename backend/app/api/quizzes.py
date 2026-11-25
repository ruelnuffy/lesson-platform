from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import get_db
from app.models import Lesson, Quiz, QuizAttempt, User
from app.schemas.quizzes import (
    LessonScoreBreakdown,
    QuestionResultResponse,
    QuizPublicResponse,
    QuizQuestionPublic,
    QuizSubmitRequest,
    QuizSubmitResponse,
    ScoreAttemptItem,
    UserScoresResponse,
)
from app.security.deps import get_current_user
from app.security.rate_limit import SlidingWindowRateLimiter, make_rate_limit_dependency
from app.services.access import ensure_lesson_access

router = APIRouter(tags=["quizzes"])

_settings = get_settings()
quiz_rate_limiter = SlidingWindowRateLimiter(
    max_requests=_settings.quiz_rate_limit_max,
    window_seconds=_settings.quiz_rate_limit_window_seconds,
)
rate_limit_quiz_submit = make_rate_limit_dependency(quiz_rate_limiter, "quiz_submit")


def _serialize_quiz_for_user(
    db: Session,
    user: User,
    quiz: Quiz,
    lesson: Lesson,
) -> QuizPublicResponse:
    attempts = list(
        db.scalars(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == user.id, QuizAttempt.quiz_id == quiz.id)
            .order_by(QuizAttempt.created_at.asc(), QuizAttempt.id.asc())
        ).all()
    )

    best = max((a.score_percent for a in attempts), default=None)
    latest = attempts[-1].score_percent if attempts else None
    passed = any(a.passed for a in attempts)

    questions = [
        QuizQuestionPublic(
            id=q.id,
            text=q.text,
            options=q.options,
            order=q.order,
        )
        for q in sorted(quiz.questions, key=lambda q: (q.order, q.id))
    ]

    return QuizPublicResponse(
        id=quiz.id,
        lesson_id=lesson.id,
        lesson_title=lesson.title,
        day_number=lesson.day_number,
        pass_mark_percent=quiz.pass_mark_percent,
        questions=questions,
        attempts_count=len(attempts),
        best_score_percent=best,
        latest_score_percent=latest,
        passed=passed,
    )


@router.get("/api/lessons/{lesson_id}/quiz", response_model=QuizPublicResponse)
def get_quiz_by_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizPublicResponse:
    lesson = db.scalar(
        select(Lesson)
        .options(selectinload(Lesson.quiz).selectinload(Quiz.questions))
        .where(Lesson.id == lesson_id)
    )
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    ensure_lesson_access(db, current_user, lesson)

    if not lesson.quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quiz available for this lesson",
        )

    return _serialize_quiz_for_user(db, current_user, lesson.quiz, lesson)


@router.get("/api/quizzes/{quiz_id}", response_model=QuizPublicResponse)
def get_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizPublicResponse:
    quiz = db.scalar(
        select(Quiz)
        .options(selectinload(Quiz.lesson), selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    ensure_lesson_access(db, current_user, quiz.lesson)
    return _serialize_quiz_for_user(db, current_user, quiz, quiz.lesson)


@router.post(
    "/api/quizzes/{quiz_id}/submit",
    response_model=QuizSubmitResponse,
    dependencies=[Depends(rate_limit_quiz_submit)],
)
def submit_quiz(
    quiz_id: int,
    body: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizSubmitResponse:
    quiz = db.scalar(
        select(Quiz)
        .options(selectinload(Quiz.lesson), selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    ensure_lesson_access(db, current_user, quiz.lesson)

    questions = sorted(quiz.questions, key=lambda q: (q.order, q.id))
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz has no questions yet",
        )

    correct_count = 0
    results: list[QuestionResultResponse] = []
    normalized_answers: dict[str, int | None] = {}

    for question in questions:
        selected = body.answers.get(str(question.id))
        if selected is not None and (selected < 0 or selected >= len(question.options)):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid option index for question {question.id}",
            )

        is_correct = selected is not None and selected == question.correct_index
        if is_correct:
            correct_count += 1

        normalized_answers[str(question.id)] = selected
        results.append(
            QuestionResultResponse(
                question_id=question.id,
                selected_index=selected,
                is_correct=is_correct,
                explanation=question.explanation,
            )
        )

    score_percent = round((correct_count / len(questions)) * 100.0, 2)
    passed = score_percent >= quiz.pass_mark_percent

    attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz.id,
        score_percent=score_percent,
        answers=normalized_answers,
        passed=passed,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    all_attempts = list(
        db.scalars(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == current_user.id, QuizAttempt.quiz_id == quiz.id)
            .order_by(QuizAttempt.created_at.asc(), QuizAttempt.id.asc())
        ).all()
    )
    best_score = max(a.score_percent for a in all_attempts)
    latest_score = all_attempts[-1].score_percent

    return QuizSubmitResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        score_percent=score_percent,
        passed=passed,
        pass_mark_percent=quiz.pass_mark_percent,
        correct_count=correct_count,
        total_questions=len(questions),
        best_score_percent=best_score,
        latest_score_percent=latest_score,
        attempts_count=len(all_attempts),
        results=results,
    )


@router.get("/api/scores", response_model=UserScoresResponse)
def get_user_scores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserScoresResponse:
    attempts = list(
        db.scalars(
            select(QuizAttempt)
            .options(selectinload(QuizAttempt.quiz).selectinload(Quiz.lesson))
            .where(QuizAttempt.user_id == current_user.id)
            .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
        ).all()
    )

    attempt_items: list[ScoreAttemptItem] = []
    grouped: dict[int, list[QuizAttempt]] = defaultdict(list)

    for attempt in attempts:
        quiz = attempt.quiz
        lesson = quiz.lesson
        attempt_items.append(
            ScoreAttemptItem(
                attempt_id=attempt.id,
                quiz_id=quiz.id,
                lesson_id=lesson.id,
                lesson_title=lesson.title,
                day_number=lesson.day_number,
                score_percent=attempt.score_percent,
                passed=attempt.passed,
                created_at=attempt.created_at,
            )
        )
        grouped[quiz.id].append(attempt)

    by_lesson: list[LessonScoreBreakdown] = []
    for quiz_id, quiz_attempts in grouped.items():
        # quiz_attempts are sorted newest-first
        quiz = quiz_attempts[0].quiz
        lesson = quiz.lesson
        best = max(a.score_percent for a in quiz_attempts)
        latest = quiz_attempts[0].score_percent
        passed = any(a.passed for a in quiz_attempts)
        by_lesson.append(
            LessonScoreBreakdown(
                lesson_id=lesson.id,
                lesson_title=lesson.title,
                day_number=lesson.day_number,
                quiz_id=quiz_id,
                pass_mark_percent=quiz.pass_mark_percent,
                attempts_count=len(quiz_attempts),
                best_score_percent=best,
                latest_score_percent=latest,
                passed=passed,
            )
        )

    by_lesson.sort(key=lambda item: item.day_number)

    best_scores = [item.best_score_percent for item in by_lesson if item.best_score_percent is not None]
    avg_best = round(sum(best_scores) / len(best_scores), 2) if best_scores else None
    quizzes_passed = sum(1 for item in by_lesson if item.passed)

    return UserScoresResponse(
        average_best_score=avg_best,
        total_attempts=len(attempt_items),
        quizzes_passed=quizzes_passed,
        by_lesson=by_lesson,
        attempts=attempt_items,
    )
