import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  TrendingUp,
} from "lucide-react";
import { PaywallCard } from "../components/PaywallCard";
import { ApiError, apiFetch, type TodayDashboard } from "../lib/api";
import { useAuth } from "../lib/auth";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery<TodayDashboard, ApiError>({
    queryKey: ["lessons", "today"],
    queryFn: () => apiFetch<TodayDashboard>("/api/lessons/today"),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-8 w-56 bg-zinc-200/70 rounded-lg animate-pulse" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl shadow-soft animate-pulse" />
          ))}
        </div>
        <div className="h-52 bg-zinc-900/10 rounded-3xl animate-pulse" />
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

  const firstName = user?.name.split(" ")[0] || "Learner";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Learning Dashboard
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Welcome back, {firstName}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white text-xs font-medium text-zinc-600 shadow-soft">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          {data.today} (WAT)
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Current Streak
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-zinc-900">
              {data.streak}{" "}
              <span className="text-base font-semibold text-zinc-500">
                {data.streak === 1 ? "day" : "days"}
              </span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Lessons Unlocked
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-zinc-900">
              {data.unlocked_count}
              <span className="text-base font-semibold text-zinc-400">
                {" "}
                / {data.total_lessons}
              </span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Course Progress
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              {progressPct}%
            </span>
          </div>
          <div className="mt-3.5 w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {data.completed_quizzes_count} of {data.total_lessons} quizzes passed
          </p>
        </div>
      </div>

      {/* Today's Lesson Hero */}
      <section className="relative overflow-hidden bg-zinc-900 rounded-3xl p-7 sm:p-9 text-white shadow-elevated">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-600/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200">
            Today&apos;s Drop · {data.today}
          </span>

          {data.lesson ? (
            <>
              <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">
                Day {data.lesson.day_number}: {data.lesson.title}
              </h2>
              <p className="mt-2 text-zinc-300 text-sm max-w-2xl">
                {data.lesson.quiz_summary?.passed
                  ? `You've passed today's quiz with a best score of ${data.lesson.quiz_summary.best_score_percent}%. Feel free to review or retake anytime.`
                  : "Read today's lesson and pass the quick quiz to extend your streak."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/lessons/${data.lesson.id}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-zinc-900 font-semibold hover:bg-blue-50 text-sm shadow-sm transition-colors"
                >
                  Open Today&apos;s Lesson
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {data.lesson.has_quiz && (
                  <Link
                    to={`/lessons/${data.lesson.id}/quiz`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 text-sm transition-colors"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    {data.lesson.quiz_summary?.attempts_count ? "Retake Quiz" : "Take Quiz"}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-2xl font-extrabold">
                No new lesson scheduled for today
              </h2>
              <p className="mt-2 text-zinc-300 text-sm">
                {data.next_release_date
                  ? `Your next lesson unlocks on ${data.next_release_date}. Review past lessons below in the meantime.`
                  : "You've unlocked all scheduled lessons so far! Review past lessons below."}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Past Unlocked Lessons */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            Unlocked Curriculum
          </h2>
          <Link
            to="/scores"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            View all scores
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data.past_lessons.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center text-sm text-zinc-500">
            No lessons unlocked yet.
          </div>
        ) : (
          <div className="space-y-3">
            {data.past_lessons.map((lesson) => {
              const isToday = lesson.release_date === data.today;
              return (
                <div
                  key={lesson.id}
                  className="group bg-white rounded-2xl p-4 sm:p-5 shadow-soft hover:shadow-elevated transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        lesson.quiz_summary?.passed
                          ? "bg-emerald-50 text-emerald-700"
                          : isToday
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {lesson.quiz_summary?.passed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        `D${lesson.day_number}`
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-500">
                          Day {lesson.day_number} · {lesson.release_date}
                        </span>
                        {isToday && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            Today
                          </span>
                        )}
                        {lesson.quiz_summary?.passed && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Passed · Best {lesson.quiz_summary.best_score_percent}%
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-bold text-zinc-900 group-hover:text-blue-700 transition-colors">
                        {lesson.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Link
                      to={`/lessons/${lesson.id}`}
                      className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-semibold hover:bg-zinc-200/80 transition-colors"
                    >
                      Read
                    </Link>
                    {lesson.has_quiz && (
                      <Link
                        to={`/lessons/${lesson.id}/quiz`}
                        className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                      >
                        Quiz
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
