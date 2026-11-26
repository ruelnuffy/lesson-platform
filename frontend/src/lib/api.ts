export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:8000" : "");

export class ApiError extends Error {
  status: number;
  detail: unknown;
  reason?: string;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
    if (detail && typeof detail === "object" && "reason" in detail) {
      this.reason = String((detail as { reason?: string }).reason);
    }
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail: unknown = undefined;
    let message = response.statusText;
    try {
      const data = await response.json();
      detail = data.detail ?? data;
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
        message = String(data.detail[0].msg);
      } else if (data.detail?.message) {
        message = data.detail.message;
      }
    } catch {
      // ignore non-JSON body
    }
    throw new ApiError(response.status, message, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function formatNaira(priceKobo: number): string {
  const naira = priceKobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(naira);
}

export function resolveMediaUrl(
  url: string | null | undefined,
  fallback = "/images/course-workspace.jpg"
): string {
  if (!url) return fallback;
  if (url.startsWith("/uploads/")) return `${API_BASE_URL}${url}`;
  return url;
}

export async function uploadMedia(
  file: File
): Promise<{ url: string; filename: string; content_type: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") message = data.detail;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message);
  }

  return response.json();
}

// Shared API Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  avatar_url: string | null;
  created_at: string;
}

export interface CoursePublic {
  id: number;
  title: string;
  description: string;
  price_kobo: number;
  image_url: string | null;
  is_active: boolean;
  total_lessons: number;
}

export interface QuizScoreSummary {
  quiz_id: number;
  pass_mark_percent: number;
  attempts_count: number;
  best_score_percent: number | null;
  latest_score_percent: number | null;
  passed: boolean;
}

export interface LessonSummary {
  id: number;
  course_id: number;
  day_number: number;
  title: string;
  release_date: string;
  has_quiz: boolean;
  quiz_summary: QuizScoreSummary | null;
}

export interface LessonDetail extends LessonSummary {
  content_markdown: string;
  video_url: string | null;
}

export interface TodayDashboard {
  today: string;
  lesson: LessonDetail | null;
  past_lessons: LessonSummary[];
  total_lessons: number;
  unlocked_count: number;
  completed_quizzes_count: number;
  streak: number;
  next_release_date: string | null;
}

export interface QuizQuestionPublic {
  id: number;
  text: string;
  options: string[];
  order: number;
}

export interface QuizPublic {
  id: number;
  lesson_id: number;
  lesson_title: string;
  day_number: number;
  pass_mark_percent: number;
  questions: QuizQuestionPublic[];
  attempts_count: number;
  best_score_percent: number | null;
  latest_score_percent: number | null;
  passed: boolean;
}

export interface QuestionResult {
  question_id: number;
  selected_index: number | null;
  is_correct: boolean;
  explanation: string;
}

export interface QuizSubmitResult {
  attempt_id: number;
  quiz_id: number;
  score_percent: number;
  passed: boolean;
  pass_mark_percent: number;
  correct_count: number;
  total_questions: number;
  best_score_percent: number;
  latest_score_percent: number;
  attempts_count: number;
  results: QuestionResult[];
}

export interface UserScores {
  average_best_score: number | null;
  total_attempts: number;
  quizzes_passed: number;
  by_lesson: Array<{
    lesson_id: number;
    lesson_title: string;
    day_number: number;
    quiz_id: number;
    pass_mark_percent: number;
    attempts_count: number;
    best_score_percent: number | null;
    latest_score_percent: number | null;
    passed: boolean;
  }>;
  attempts: Array<{
    attempt_id: number;
    quiz_id: number;
    lesson_id: number;
    lesson_title: string;
    day_number: number;
    score_percent: number;
    passed: boolean;
    created_at: string;
  }>;
}
