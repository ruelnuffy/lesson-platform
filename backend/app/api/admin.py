from collections import defaultdict
import csv
from datetime import timedelta
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
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
)
from app.schemas.admin import (
    AdminBulkLessonsRequest,
    AdminCourseCreate,
    AdminCourseResponse,
    AdminCourseUpdate,
    AdminEmailLogItem,
    AdminGrantAccessRequest,
    AdminLessonCreate,
    AdminLessonResponse,
    AdminLessonScoreSummary,
    AdminLessonUpdate,
    AdminOverviewResponse,
    AdminPaymentItem,
    AdminQuestionCreate,
    AdminQuestionResponse,
    AdminQuestionUpdate,
    AdminQuizResponse,
    AdminQuizUpsertRequest,
    AdminResendEmailsRequest,
    AdminRevokeAccessRequest,
    AdminScoreRow,
    AdminScoresResponse,
    AdminUserItem,
)
from app.schemas.quizzes import ScoreAttemptItem
from app.security.deps import require_admin
from app.services.access import now_utc, today_in_app_tz
from app.services.daily_email_job import run_daily_lesson_emails
from app.services.email import EmailSender, get_email_sender

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------


@router.get("/overview", response_model=AdminOverviewResponse)
def admin_overview(db: Session = Depends(get_db)) -> AdminOverviewResponse:
    current_time = now_utc()
    today = today_in_app_tz()

    total_users = db.scalar(select(func.count(User.id))) or 0

    paid_users = (
        db.scalar(
            select(func.count(func.distinct(Enrollment.user_id))).where(
                Enrollment.status == EnrollmentStatus.paid,
                or_(Enrollment.expires_at.is_(None), Enrollment.expires_at > current_time),
            )
        )
        or 0
    )

    revenue_kobo = (
        db.scalar(
            select(func.coalesce(func.sum(Course.price_kobo), 0))
            .select_from(Enrollment)
            .join(Course, Course.id == Enrollment.course_id)
            .where(Enrollment.status == EnrollmentStatus.paid)
        )
        or 0
    )

    lessons_sent_today = (
        db.scalar(
            select(func.count(EmailLog.id))
            .join(Lesson, Lesson.id == EmailLog.lesson_id)
            .where(
                EmailLog.status == EmailStatus.sent,
                Lesson.release_date == today,
            )
        )
        or 0
    )

    avg_score = db.scalar(select(func.avg(QuizAttempt.score_percent)))

    return AdminOverviewResponse(
        total_users=total_users,
        paid_users=paid_users,
        revenue_kobo=int(revenue_kobo),
        lessons_sent_today=lessons_sent_today,
        average_quiz_score=round(float(avg_score), 2) if avg_score is not None else None,
    )


# ---------------------------------------------------------------------------
# Users & Manual Access Control
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[AdminUserItem])
def admin_list_users(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[AdminUserItem]:
    current_time = now_utc()
    stmt = select(User).options(selectinload(User.enrollments)).order_by(User.created_at.desc())
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.name.ilike(pattern), User.email.ilike(pattern)))

    users = list(db.scalars(stmt).all())
    result: list[AdminUserItem] = []
    for user in users:
        active_courses = sorted(
            {
                e.course_id
                for e in user.enrollments
                if e.status == EnrollmentStatus.paid
                and (e.expires_at is None or e.expires_at > current_time)
            }
        )
        result.append(
            AdminUserItem(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role,
                created_at=user.created_at,
                is_paid=len(active_courses) > 0,
                active_course_ids=active_courses,
            )
        )
    return result


@router.post("/users/{user_id}/grant")
def admin_grant_access(
    user_id: int,
    body: AdminGrantAccessRequest,
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    course = db.get(Course, body.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    enrollment = Enrollment(
        user_id=user.id,
        course_id=course.id,
        status=EnrollmentStatus.paid,
        paid_at=now_utc(),
        expires_at=body.expires_at,
        paystack_reference=f"manual_{user.id}_{course.id}_{uuid.uuid4().hex[:10]}",
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return {"status": "granted", "enrollment_id": enrollment.id}


@router.post("/users/{user_id}/revoke")
def admin_revoke_access(
    user_id: int,
    body: AdminRevokeAccessRequest,
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    stmt = select(Enrollment).where(
        Enrollment.user_id == user.id,
        Enrollment.status == EnrollmentStatus.paid,
    )
    if body.course_id is not None:
        stmt = stmt.where(Enrollment.course_id == body.course_id)

    enrollments = list(db.scalars(stmt).all())
    for enrollment in enrollments:
        enrollment.status = EnrollmentStatus.expired
        enrollment.expires_at = now_utc()
    db.commit()
    return {"status": "revoked", "revoked_count": len(enrollments)}


@router.get("/users/{user_id}/scores", response_model=list[ScoreAttemptItem])
def admin_user_scores(
    user_id: int,
    db: Session = Depends(get_db),
) -> list[ScoreAttemptItem]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    attempts = list(
        db.scalars(
            select(QuizAttempt)
            .options(selectinload(QuizAttempt.quiz).selectinload(Quiz.lesson))
            .where(QuizAttempt.user_id == user.id)
            .order_by(QuizAttempt.created_at.desc())
        ).all()
    )
    return [
        ScoreAttemptItem(
            attempt_id=a.id,
            quiz_id=a.quiz_id,
            lesson_id=a.quiz.lesson.id,
            lesson_title=a.quiz.lesson.title,
            day_number=a.quiz.lesson.day_number,
            score_percent=a.score_percent,
            passed=a.passed,
            created_at=a.created_at,
        )
        for a in attempts
    ]


# ---------------------------------------------------------------------------
# Courses & Lessons CRUD + Bulk Create
# ---------------------------------------------------------------------------


@router.get("/courses", response_model=list[AdminCourseResponse])
def admin_list_courses(db: Session = Depends(get_db)) -> list[AdminCourseResponse]:
    rows = db.execute(
        select(Course, func.count(Lesson.id))
        .outerjoin(Lesson, Lesson.course_id == Course.id)
        .group_by(Course.id)
        .order_by(Course.id.asc())
    ).all()
    return [
        AdminCourseResponse(
            id=c.id,
            title=c.title,
            description=c.description,
            price_kobo=c.price_kobo,
            is_active=c.is_active,
            lesson_count=cnt,
        )
        for c, cnt in rows
    ]


@router.post("/courses", response_model=AdminCourseResponse, status_code=status.HTTP_201_CREATED)
def admin_create_course(
    body: AdminCourseCreate,
    db: Session = Depends(get_db),
) -> AdminCourseResponse:
    course = Course(**body.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return AdminCourseResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        price_kobo=course.price_kobo,
        is_active=course.is_active,
        lesson_count=0,
    )


@router.put("/courses/{course_id}", response_model=AdminCourseResponse)
def admin_update_course(
    course_id: int,
    body: AdminCourseUpdate,
    db: Session = Depends(get_db),
) -> AdminCourseResponse:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    lesson_count = (
        db.scalar(select(func.count(Lesson.id)).where(Lesson.course_id == course.id)) or 0
    )
    return AdminCourseResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        price_kobo=course.price_kobo,
        is_active=course.is_active,
        lesson_count=lesson_count,
    )


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_course(course_id: int, db: Session = Depends(get_db)) -> None:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    db.delete(course)
    db.commit()


@router.get("/lessons", response_model=list[AdminLessonResponse])
def admin_list_lessons(
    course_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Lesson]:
    stmt = select(Lesson).order_by(Lesson.course_id.asc(), Lesson.day_number.asc())
    if course_id is not None:
        stmt = stmt.where(Lesson.course_id == course_id)
    return list(db.scalars(stmt).all())


@router.post("/lessons", response_model=AdminLessonResponse, status_code=status.HTTP_201_CREATED)
def admin_create_lesson(
    body: AdminLessonCreate,
    db: Session = Depends(get_db),
) -> Lesson:
    if not db.get(Course, body.course_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    lesson = Lesson(**body.model_dump())
    db.add(lesson)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A lesson with this day_number already exists for this course",
        ) from exc
    db.refresh(lesson)
    return lesson


@router.put("/lessons/{lesson_id}", response_model=AdminLessonResponse)
def admin_update_lesson(
    lesson_id: int,
    body: AdminLessonUpdate,
    db: Session = Depends(get_db),
) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A lesson with this day_number already exists for this course",
        ) from exc
    db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_lesson(lesson_id: int, db: Session = Depends(get_db)) -> None:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    db.delete(lesson)
    db.commit()


@router.post(
    "/courses/{course_id}/lessons/bulk",
    response_model=list[AdminLessonResponse],
    status_code=status.HTTP_201_CREATED,
)
def admin_bulk_create_lessons(
    course_id: int,
    body: AdminBulkLessonsRequest,
    db: Session = Depends(get_db),
) -> list[Lesson]:
    if not db.get(Course, course_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    existing_days = set(
        db.scalars(select(Lesson.day_number).where(Lesson.course_id == course_id)).all()
    )
    created: list[Lesson] = []
    for offset in range(body.num_days):
        day_num = body.start_day_number + offset
        if day_num in existing_days:
            continue
        lesson = Lesson(
            course_id=course_id,
            day_number=day_num,
            title=f"{body.title_prefix} {day_num}",
            content_markdown=f"# {body.title_prefix} {day_num}\n\nWrite lesson content here.",
            release_date=body.start_date + timedelta(days=offset),
        )
        db.add(lesson)
        created.append(lesson)
    db.commit()
    for lesson in created:
        db.refresh(lesson)
    return created


# ---------------------------------------------------------------------------
# Quizzes & Questions CRUD (admin CAN view/edit correct_index)
# ---------------------------------------------------------------------------


@router.get("/lessons/{lesson_id}/quiz", response_model=AdminQuizResponse)
def admin_get_or_create_quiz(
    lesson_id: int,
    db: Session = Depends(get_db),
) -> AdminQuizResponse:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    quiz = db.scalar(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.lesson_id == lesson_id)
    )
    if not quiz:
        quiz = Quiz(lesson_id=lesson_id, pass_mark_percent=70)
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        questions: list[AdminQuestionResponse] = []
    else:
        questions = [
            AdminQuestionResponse.model_validate(q)
            for q in sorted(quiz.questions, key=lambda q: (q.order, q.id))
        ]

    return AdminQuizResponse(
        id=quiz.id,
        lesson_id=quiz.lesson_id,
        pass_mark_percent=quiz.pass_mark_percent,
        questions=questions,
    )


@router.put("/lessons/{lesson_id}/quiz", response_model=AdminQuizResponse)
def admin_upsert_quiz(
    lesson_id: int,
    body: AdminQuizUpsertRequest,
    db: Session = Depends(get_db),
) -> AdminQuizResponse:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    quiz = db.scalar(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.lesson_id == lesson_id)
    )
    if not quiz:
        quiz = Quiz(lesson_id=lesson_id, pass_mark_percent=body.pass_mark_percent)
        db.add(quiz)
    else:
        quiz.pass_mark_percent = body.pass_mark_percent
    db.commit()
    db.refresh(quiz)

    questions = [
        AdminQuestionResponse.model_validate(q)
        for q in sorted(quiz.questions, key=lambda q: (q.order, q.id))
    ]
    return AdminQuizResponse(
        id=quiz.id,
        lesson_id=quiz.lesson_id,
        pass_mark_percent=quiz.pass_mark_percent,
        questions=questions,
    )


@router.post(
    "/quizzes/{quiz_id}/questions",
    response_model=AdminQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_question(
    quiz_id: int,
    body: AdminQuestionCreate,
    db: Session = Depends(get_db),
) -> Question:
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if body.correct_index >= len(body.options):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="correct_index out of range for options",
        )
    question = Question(quiz_id=quiz_id, **body.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=AdminQuestionResponse)
def admin_update_question(
    question_id: int,
    body: AdminQuestionUpdate,
    db: Session = Depends(get_db),
) -> Question:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    updates = body.model_dump(exclude_unset=True)
    new_options = updates.get("options", question.options)
    new_correct = updates.get("correct_index", question.correct_index)
    if new_correct < 0 or new_correct >= len(new_options):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="correct_index out of range for options",
        )
    for field, value in updates.items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_question(question_id: int, db: Session = Depends(get_db)) -> None:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    db.delete(question)
    db.commit()


# ---------------------------------------------------------------------------
# Payments List
# ---------------------------------------------------------------------------


@router.get("/payments", response_model=list[AdminPaymentItem])
def admin_list_payments(db: Session = Depends(get_db)) -> list[AdminPaymentItem]:
    enrollments = list(
        db.scalars(
            select(Enrollment)
            .options(selectinload(Enrollment.user), selectinload(Enrollment.course))
            .order_by(Enrollment.created_at.desc(), Enrollment.id.desc())
        ).all()
    )
    return [
        AdminPaymentItem(
            id=e.id,
            user_id=e.user_id,
            user_name=e.user.name,
            user_email=e.user.email,
            course_id=e.course_id,
            course_title=e.course.title,
            amount_kobo=e.course.price_kobo,
            status=e.status,
            paystack_reference=e.paystack_reference,
            paid_at=e.paid_at,
            expires_at=e.expires_at,
            created_at=e.created_at,
        )
        for e in enrollments
    ]


# ---------------------------------------------------------------------------
# Emails Log & Resend
# ---------------------------------------------------------------------------


@router.get("/emails", response_model=list[AdminEmailLogItem])
def admin_list_emails(db: Session = Depends(get_db)) -> list[AdminEmailLogItem]:
    logs = list(
        db.scalars(
            select(EmailLog)
            .options(selectinload(EmailLog.user), selectinload(EmailLog.lesson))
            .order_by(EmailLog.id.desc())
            .limit(200)
        ).all()
    )
    return [
        AdminEmailLogItem(
            id=log.id,
            user_id=log.user_id,
            user_email=log.user.email,
            lesson_id=log.lesson_id,
            lesson_title=log.lesson.title,
            day_number=log.lesson.day_number,
            type=log.type,
            status=log.status,
            sent_at=log.sent_at,
            error=log.error,
        )
        for log in logs
    ]


@router.post("/emails/resend")
def admin_resend_day_emails(
    body: AdminResendEmailsRequest,
    db: Session = Depends(get_db),
    sender: EmailSender = Depends(get_email_sender),
) -> dict[str, int | str]:
    return run_daily_lesson_emails(
        db,
        email_sender=sender,
        target_date=body.target_date,
    )


# ---------------------------------------------------------------------------
# Scores & CSV Export
# ---------------------------------------------------------------------------


@router.get("/scores", response_model=AdminScoresResponse)
def admin_scores(
    lesson_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> AdminScoresResponse:
    stmt = (
        select(QuizAttempt)
        .options(
            selectinload(QuizAttempt.user),
            selectinload(QuizAttempt.quiz).selectinload(Quiz.lesson),
        )
        .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
    )
    if user_id is not None:
        stmt = stmt.where(QuizAttempt.user_id == user_id)
    if lesson_id is not None:
        stmt = stmt.join(Quiz, Quiz.id == QuizAttempt.quiz_id).where(Quiz.lesson_id == lesson_id)

    attempts = list(db.scalars(stmt).all())

    rows: list[AdminScoreRow] = []
    by_lesson_map: dict[int, list[QuizAttempt]] = defaultdict(list)

    for a in attempts:
        lesson = a.quiz.lesson
        rows.append(
            AdminScoreRow(
                attempt_id=a.id,
                user_id=a.user_id,
                user_name=a.user.name,
                user_email=a.user.email,
                lesson_id=lesson.id,
                lesson_title=lesson.title,
                day_number=lesson.day_number,
                quiz_id=a.quiz_id,
                score_percent=a.score_percent,
                passed=a.passed,
                created_at=a.created_at,
            )
        )
        by_lesson_map[lesson.id].append(a)

    by_lesson: list[AdminLessonScoreSummary] = []
    for l_id, l_attempts in by_lesson_map.items():
        lesson = l_attempts[0].quiz.lesson
        avg = sum(x.score_percent for x in l_attempts) / len(l_attempts)
        pass_rate = (sum(1 for x in l_attempts if x.passed) / len(l_attempts)) * 100.0
        by_lesson.append(
            AdminLessonScoreSummary(
                lesson_id=l_id,
                lesson_title=lesson.title,
                day_number=lesson.day_number,
                attempts_count=len(l_attempts),
                average_score=round(avg, 2),
                pass_rate=round(pass_rate, 2),
            )
        )
    by_lesson.sort(key=lambda x: x.day_number)

    return AdminScoresResponse(by_lesson=by_lesson, attempts=rows)


@router.get("/scores/export.csv")
def admin_export_scores_csv(db: Session = Depends(get_db)) -> StreamingResponse:
    attempts = list(
        db.scalars(
            select(QuizAttempt)
            .options(
                selectinload(QuizAttempt.user),
                selectinload(QuizAttempt.quiz).selectinload(Quiz.lesson),
            )
            .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
        ).all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "attempt_id",
            "user_id",
            "user_name",
            "user_email",
            "day_number",
            "lesson_title",
            "score_percent",
            "passed",
            "created_at",
        ]
    )
    for a in attempts:
        lesson = a.quiz.lesson
        writer.writerow(
            [
                a.id,
                a.user_id,
                a.user.name,
                a.user.email,
                lesson.day_number,
                lesson.title,
                a.score_percent,
                a.passed,
                a.created_at.isoformat(),
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="quiz_scores.csv"'},
    )
