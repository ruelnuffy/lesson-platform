from datetime import datetime

from pydantic import BaseModel, Field


class QuizQuestionPublic(BaseModel):
    id: int
    text: str
    options: list[str]
    order: int


class QuizPublicResponse(BaseModel):
    id: int
    lesson_id: int
    lesson_title: str
    day_number: int
    pass_mark_percent: int
    questions: list[QuizQuestionPublic]
    attempts_count: int
    best_score_percent: float | None = None
    latest_score_percent: float | None = None
    passed: bool = False


class QuizSubmitRequest(BaseModel):
    answers: dict[str, int] = Field(
        ...,
        description="Mapping of question_id (as string) to selected option index",
    )


class QuestionResultResponse(BaseModel):
    question_id: int
    selected_index: int | None
    is_correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    score_percent: float
    passed: bool
    pass_mark_percent: int
    correct_count: int
    total_questions: int
    best_score_percent: float
    latest_score_percent: float
    attempts_count: int
    results: list[QuestionResultResponse]


class ScoreAttemptItem(BaseModel):
    attempt_id: int
    quiz_id: int
    lesson_id: int
    lesson_title: str
    day_number: int
    score_percent: float
    passed: bool
    created_at: datetime


class LessonScoreBreakdown(BaseModel):
    lesson_id: int
    lesson_title: str
    day_number: int
    quiz_id: int
    pass_mark_percent: int
    attempts_count: int
    best_score_percent: float | None = None
    latest_score_percent: float | None = None
    passed: bool = False


class UserScoresResponse(BaseModel):
    average_best_score: float | None = None
    total_attempts: int
    quizzes_passed: int
    by_lesson: list[LessonScoreBreakdown]
    attempts: list[ScoreAttemptItem]
