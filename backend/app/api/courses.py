from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Course, Lesson
from app.schemas.lessons import (
    CourseDetailPublicResponse,
    CoursePublicResponse,
    SyllabusItemResponse,
)
from app.services.access import today_in_app_tz

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=list[CoursePublicResponse])
def list_active_courses(db: Session = Depends(get_db)) -> list[CoursePublicResponse]:
    rows = db.execute(
        select(Course, func.count(Lesson.id))
        .outerjoin(Lesson, Lesson.course_id == Course.id)
        .where(Course.is_active.is_(True))
        .group_by(Course.id)
        .order_by(Course.id.asc())
    ).all()

    return [
        CoursePublicResponse(
            id=course.id,
            title=course.title,
            description=course.description,
            price_kobo=course.price_kobo,
            is_active=course.is_active,
            total_lessons=lesson_count,
        )
        for course, lesson_count in rows
    ]


@router.get("/{course_id}", response_model=CourseDetailPublicResponse)
def get_course_public(
    course_id: int,
    db: Session = Depends(get_db),
) -> CourseDetailPublicResponse:
    course = db.scalar(
        select(Course)
        .options(selectinload(Course.lessons))
        .where(Course.id == course_id, Course.is_active.is_(True))
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    today = today_in_app_tz()
    syllabus = [
        SyllabusItemResponse(
            id=lesson.id,
            day_number=lesson.day_number,
            title=lesson.title,
            release_date=lesson.release_date,
            is_released=lesson.release_date <= today,
        )
        for lesson in sorted(course.lessons, key=lambda l: l.day_number)
    ]

    return CourseDetailPublicResponse(
        id=course.id,
        title=course.title,
        description=course.description,
        price_kobo=course.price_kobo,
        is_active=course.is_active,
        total_lessons=len(syllabus),
        syllabus=syllabus,
    )
