import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  PlayCircle,
} from "lucide-react";
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
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <div className="h-5 w-32 bg-zinc-200 rounded animate-pulse" />
        <div className="h-96 bg-white rounded-3xl border border-zinc-200 animate-pulse" />
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
        <div className="max-w-lg mx-auto my-14 px-4">
          <div className="bg-white border border-zinc-200 rounded-3xl shadow-soft p-9 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600">
              <CalendarClock className="w-7 h-7" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Not Released Yet</h1>
            <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
              This lesson is scheduled to unlock on{" "}
              <strong className="text-zinc-900">{releaseDate || "a future date"}</strong>{" "}
              (Africa/Lagos time).
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
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
      <div className="max-w-lg mx-auto my-14 px-4">
        <div className="bg-white border border-zinc-200 rounded-3xl shadow-soft p-9 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600">
            <CalendarClock className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-zinc-900">
            No Lesson Scheduled Today
          </h1>
          <p className="mt-2 text-zinc-600 text-sm">
            Head to your dashboard to review unlocked lessons or check the next drop date.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-indigo-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="mt-4 bg-white border border-zinc-200/90 rounded-3xl shadow-soft p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">
            Day {lesson.day_number}
          </span>
          <span className="text-zinc-500 font-medium">Released {lesson.release_date}</span>
          {lesson.quiz_summary?.passed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Quiz Passed ({lesson.quiz_summary.best_score_percent}%)
            </span>
          )}
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
          {lesson.title}
        </h1>

        {lesson.video_url && (
          <div className="mt-7">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-2">
              <PlayCircle className="w-4 h-4 text-indigo-600" />
              Lesson Video
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200 shadow-sm">
              <iframe
                src={lesson.video_url}
                title={lesson.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <div className="mt-8">
          <MarkdownView content={lesson.content_markdown} />
        </div>

        {lesson.has_quiz && (
          <div className="mt-10 p-6 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-zinc-900">Knowledge Check</h2>
                <p className="text-sm text-zinc-600 mt-0.5">
                  {lesson.quiz_summary && lesson.quiz_summary.attempts_count > 0
                    ? `Best: ${lesson.quiz_summary.best_score_percent}% · Latest: ${lesson.quiz_summary.latest_score_percent}% (${lesson.quiz_summary.attempts_count} attempts)`
                    : `Score ${lesson.quiz_summary?.pass_mark_percent ?? 70}% or higher to pass this lesson.`}
                </p>
              </div>
            </div>
            <Link
              to={`/lessons/${lesson.id}/quiz`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 text-sm transition-colors shrink-0"
            >
              {lesson.quiz_summary?.attempts_count ? "Retake Quiz" : "Take Quiz"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
