import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { MarkdownView } from "../components/MarkdownView";
import { PaywallCard } from "../components/PaywallCard";
import {
  ApiError,
  apiFetch,
  type LessonDetail,
  type TodayDashboard,
} from "../lib/api";

export function LessonPage({ mode }: { mode: "today" | "byId" }) {
  const { lessonId } = useParams();

  const todayQuery = useQuery<TodayDashboard, ApiError>({
    queryKey: ["lessons", "today"],
    queryFn: () => apiFetch<TodayDashboard>("/api/lessons/today"),
    enabled: mode === "today",
  });

  const detailQuery = useQuery<LessonDetail, ApiError>({
    queryKey: ["lessons", "detail", lessonId],
    queryFn: () => apiFetch<LessonDetail>(`/api/lessons/${lessonId}`),
    enabled: mode === "byId" && Boolean(lessonId),
  });

  const isLoading = mode === "today" ? todayQuery.isLoading : detailQuery.isLoading;
  const error = mode === "today" ? todayQuery.error : detailQuery.error;
  const lesson = mode === "today" ? todayQuery.data?.lesson ?? null : detailQuery.data ?? null;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-slate-500">
        Loading lesson...
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403) {
    if (error.reason === "not_paid") {
      return <PaywallCard title="This Lesson Is Locked" />;
    }
    if (error.reason === "not_released_yet") {
      const releaseDate =
        error.detail && typeof error.detail === "object" && "release_date" in error.detail
          ? String((error.detail as { release_date?: string }).release_date)
          : "";
      return (
        <div className="max-w-lg mx-auto my-14 bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="text-3xl">🗓️</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Not Released Yet</h1>
          <p className="mt-2 text-slate-600 text-sm">
            This lesson is scheduled to unlock on{" "}
            <strong className="text-slate-900">{releaseDate || "a future date"}</strong>.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Back to Dashboard
          </Link>
        </div>
      );
    }
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-rose-600">
        {error.message}
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-lg mx-auto my-14 bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">No Lesson Scheduled Today</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Check your dashboard to review unlocked lessons or see when the next lesson drops.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline">
        ← Back to Dashboard
      </Link>

      <div className="mt-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50">
            Day {lesson.day_number}
          </span>
          <span className="text-slate-400 font-normal">Released {lesson.release_date}</span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">{lesson.title}</h1>

        {lesson.video_url && (
          <div className="mt-6 aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
            <iframe
              src={lesson.video_url}
              title={lesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="mt-8">
          <MarkdownView content={lesson.content_markdown} />
        </div>

        {lesson.has_quiz && (
          <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Ready to check your understanding?</h2>
              <p className="text-sm text-slate-600">
                {lesson.quiz_summary && lesson.quiz_summary.attempts_count > 0
                  ? `Best score: ${lesson.quiz_summary.best_score_percent}% · Latest: ${lesson.quiz_summary.latest_score_percent}%`
                  : `Pass mark: ${lesson.quiz_summary?.pass_mark_percent ?? 70}%`}
              </p>
            </div>
            <Link
              to={`/lessons/${lesson.id}/quiz`}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 text-center"
            >
              {lesson.quiz_summary?.attempts_count ? "Retake Quiz" : "Take Quiz"}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
