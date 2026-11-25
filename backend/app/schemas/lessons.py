from datetime import date

from pydantic import BaseModel, ConfigDict


class CoursePublicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price_kobo: int
    is_active: bool
    total_lessons: int = 0


class SyllabusItemResponse(BaseModel):
    id: int
    day_number: int
    title: str
    release_date: date
    is_released: bool


class CourseDetailPublicResponse(CoursePublicResponse):
    syllabus: list[SyllabusItemResponse] = []


class QuizScoreSummary(BaseModel):
    quiz_id: int
    pass_mark_percent: int
    attempts_count: int
    best_score_percent: float | None = None
    latest_score_percent: float | None = None
    passed: bool = False


class LessonSummaryResponse(BaseModel):
    id: int
    course_id: int
    day_number: int
    title: str
    release_date: date
    has_quiz: bool
    quiz_summary: QuizScoreSummary | None = None


class LessonDetailResponse(BaseModel):
    id: int
    course_id: int
    day_number: int
    title: str
    content_markdown: str
    video_url: str | None = None
    release_date: date
    has_quiz: bool
    quiz_summary: QuizScoreSummary | None = None


class TodayDashboardResponse(BaseModel):
    today: date
    lesson: LessonDetailResponse | None = None
    past_lessons: list[LessonSummaryResponse] = []
    total_lessons: int
    unlocked_count: int
    completed_quizzes_count: int
    streak: int
    next_release_date: date | None = None
