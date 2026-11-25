import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PaywallCard } from "../components/PaywallCard";
import { ApiError, apiFetch, type TodayDashboard } from "../lib/api";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<TodayDashboard, ApiError>({
    queryKey: ["lessons", "today"],
    queryFn: () => apiFetch<TodayDashboard>("/api/lessons/today"),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-slate-500">
        Loading your dashboard...
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403 && error.reason === "not_paid") {
    return <PaywallCard title="Enroll to Start Your Daily Lessons" />;
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-rose-600">
        Failed to load dashboard: {error?.message || "Unknown error"}
      </div>
    );
  }

  const progressPct =
    data.total_lessons > 0
      ? Math.round((data.completed_quizzes_count / data.total_lessons) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current Streak
          </p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {data.streak} {data.streak === 1 ? "day" : "days"}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Lessons Unlocked
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {data.unlocked_count} / {data.total_lessons}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Course Progress
            </p>
            <span className="text-sm font-bold text-emerald-700">{progressPct}%</span>
          </div>
          <div className="mt-3 w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {data.completed_quizzes_count} of {data.total_lessons} quizzes passed
          </p>
        </div>
      </div>

      {/* Today's Lesson Card */}
      <section className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-8 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
          Today · {data.today}
        </p>
        {data.lesson ? (
          <>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold">
              Day {data.lesson.day_number}: {data.lesson.title}
            </h1>
            <p className="mt-2 text-indigo-100 text-sm">
              {data.lesson.quiz_summary?.passed
                ? `Quiz passed (Best: ${data.lesson.quiz_summary.best_score_percent}%)`
                : "Read today's lesson and take the quiz to keep your streak alive."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/lessons/${data.lesson.id}`}
                className="px-5 py-2.5 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-indigo-50 text-sm"
              >
                Open Today&apos;s Lesson
              </Link>
              {data.lesson.has_quiz && (
                <Link
                  to={`/lessons/${data.lesson.id}/quiz`}
                  className="px-5 py-2.5 rounded-lg bg-indigo-500/40 border border-indigo-300/40 text-white font-semibold hover:bg-indigo-500/60 text-sm"
                >
                  {data.lesson.quiz_summary?.attempts_count ? "Retake Quiz" : "Take Quiz"}
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">No new lesson scheduled for today</h1>
            <p className="mt-2 text-indigo-100 text-sm">
              {data.next_release_date
                ? `Your next lesson unlocks on ${data.next_release_date}.`
                : "You've unlocked all scheduled lessons so far! Review past lessons below."}
            </p>
          </>
        )}
      </section>

      {/* Past Unlocked Lessons */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Unlocked Lessons</h2>
          <Link to="/scores" className="text-sm font-medium text-indigo-600 hover:underline">
            View all scores →
          </Link>
        </div>

        {data.past_lessons.length === 0 ? (
          <p className="text-slate-500 text-sm">No lessons unlocked yet.</p>
        ) : (
          <div className="space-y-3">
            {data.past_lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Day {lesson.day_number}
                    </span>
                    <span className="text-xs text-slate-400">{lesson.release_date}</span>
                    {lesson.quiz_summary?.passed && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        Passed · Best {lesson.quiz_summary.best_score_percent}%
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-semibold text-slate-900">{lesson.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/lessons/${lesson.id}`}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    Read
                  </Link>
                  {lesson.has_quiz && (
                    <Link
                      to={`/lessons/${lesson.id}/quiz`}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                    >
                      Quiz
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
