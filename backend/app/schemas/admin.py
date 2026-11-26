from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.email_log import EmailStatus
from app.models.enrollment import EnrollmentStatus
from app.models.user import UserRole


class AdminOverviewResponse(BaseModel):
    total_users: int
    paid_users: int
    revenue_kobo: int
    lessons_sent_today: int
    average_quiz_score: float | None = None


class AdminUserItem(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime
    is_paid: bool
    active_course_ids: list[int] = []


class AdminGrantAccessRequest(BaseModel):
    course_id: int
    expires_at: datetime | None = None


class AdminRevokeAccessRequest(BaseModel):
    course_id: int | None = None


class AdminCourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    price_kobo: int = Field(ge=0)
    image_url: str | None = None
    is_active: bool = True


class AdminCourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price_kobo: int | None = Field(default=None, ge=0)
    image_url: str | None = None
    is_active: bool | None = None


class AdminCourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price_kobo: int
    image_url: str | None = None
    is_active: bool
    lesson_count: int = 0


class AdminLessonCreate(BaseModel):
    course_id: int
    day_number: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=255)
    content_markdown: str = ""
    video_url: str | None = None
    release_date: date


class AdminLessonUpdate(BaseModel):
    day_number: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content_markdown: str | None = None
    video_url: str | None = None
    release_date: date | None = None


class AdminLessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    day_number: int
    title: str
    content_markdown: str
    video_url: str | None = None
    release_date: date


class AdminBulkLessonsRequest(BaseModel):
    start_date: date
    num_days: int = Field(ge=1, le=90)
    start_day_number: int = Field(default=1, ge=1)
    title_prefix: str = "Day"


class AdminQuestionCreate(BaseModel):
    text: str = Field(min_length=1)
    options: list[str] = Field(min_length=2)
    correct_index: int = Field(ge=0)
    explanation: str = ""
    order: int = 0


class AdminQuestionUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    options: list[str] | None = Field(default=None, min_length=2)
    correct_index: int | None = Field(default=None, ge=0)
    explanation: str | None = None
    order: int | None = None


class AdminQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    text: str
    options: list[str]
    correct_index: int
    explanation: str
    order: int


class AdminQuizUpsertRequest(BaseModel):
    pass_mark_percent: int = Field(default=70, ge=0, le=100)


class AdminQuizResponse(BaseModel):
    id: int
    lesson_id: int
    pass_mark_percent: int
    questions: list[AdminQuestionResponse] = []


class AdminPaymentItem(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    course_id: int
    course_title: str
    amount_kobo: int
    status: EnrollmentStatus
    paystack_reference: str | None = None
    paid_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime


class AdminEmailLogItem(BaseModel):
    id: int
    user_id: int
    user_email: str
    lesson_id: int
    lesson_title: str
    day_number: int
    type: str
    status: EmailStatus
    sent_at: datetime | None = None
    error: str | None = None


class AdminResendEmailsRequest(BaseModel):
    target_date: date | None = None


class AdminScoreRow(BaseModel):
    attempt_id: int
    user_id: int
    user_name: str
    user_email: str
    lesson_id: int
    lesson_title: str
    day_number: int
    quiz_id: int
    score_percent: float
    passed: bool
    created_at: datetime


class AdminLessonScoreSummary(BaseModel):
    lesson_id: int
    lesson_title: str
    day_number: int
    attempts_count: int
    average_score: float
    pass_rate: float


class AdminScoresResponse(BaseModel):
    by_lesson: list[AdminLessonScoreSummary]
    attempts: list[AdminScoreRow]
