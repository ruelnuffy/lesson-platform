import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
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
      <div className="w-full px-4 sm:px-8 py-8 space-y-6">
        <div className="h-8 w-56 bg-zinc-200/70 rounded-lg animate-pulse" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl shadow-soft animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-3xl shadow-soft animate-pulse" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 403 && error.reason === "not_paid") {
    return <PaywallCard title="Enroll to unlock your daily lessons and mastery quizzes." />;
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

  // SVG progress ring geometry
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progressPct / 100) * circumference;

  const quizScores = data.past_lessons
    .map((l) => l.quiz_summary?.best_score_percent)
    .filter((s): s is number => s !== null && s !== undefined);
  const avgBest =
    quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : null;

  return (
    <div className="w-full px-4 sm:px-8 py-8 space-y-7">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Overview
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Welcome back, {firstName}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white text-xs font-semibold text-zinc-600 shadow-soft">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          {data.today} (WAT)
        </span>
      </div>

      {/* 4-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Current Streak
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-zinc-900">
              {data.streak}{" "}
              <span className="text-sm font-semibold text-zinc-500">
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
              Unlocked
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-zinc-900">
              {data.unlocked_count}
              <span className="text-sm font-semibold text-zinc-400">
                {" "}
                / {data.total_lessons}
              </span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Quizzes Passed
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-zinc-900">
              {data.completed_quizzes_count}
              <span className="text-sm font-semibold text-zinc-400">
                {" "}
                / {data.total_lessons}
              </span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Avg Best Score
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-blue-600">
              {avgBest !== null ? `${avgBest}%` : "—"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-blue-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main 12-Column Dashboard Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Today's Lesson + Unlocked Curriculum */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Lesson Spotlight */}
          <section className="bg-white rounded-3xl shadow-elevated overflow-hidden grid sm:grid-cols-12">
            <div className="sm:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
              <span className="inline-flex items-center self-start px-3 py-1 rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                Today&apos;s Drop · {data.today}
              </span>

              {data.lesson ? (
                <>
                  <h2 className="mt-3.5 text-2xl font-extrabold text-zinc-900 tracking-tight">
                    Day {data.lesson.day_number}: {data.lesson.title}
                  </h2>
                  <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
                    {data.lesson.quiz_summary?.passed
                      ? `Quiz passed with a best score of ${data.lesson.quiz_summary.best_score_percent}%. Review or retake anytime.`
                      : "Read today's lesson and pass the quick quiz to extend your streak."}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to={`/lessons/${data.lesson.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 text-sm shadow-soft transition-colors"
                    >
                      Open Lesson
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    {data.lesson.has_quiz && (
                      <Link
                        to={`/lessons/${data.lesson.id}/quiz`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F7F7F5] text-zinc-800 font-semibold hover:bg-zinc-200/70 text-sm transition-colors"
                      >
                        <ClipboardCheck className="w-4 h-4 text-blue-600" />
                        {data.lesson.quiz_summary?.attempts_count ? "Retake Quiz" : "Take Quiz"}
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-3.5 text-xl font-extrabold text-zinc-900">
                    No new lesson scheduled today
                  </h2>
                  <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
                    {data.next_release_date
                      ? `Your next lesson unlocks on ${data.next_release_date}. Review past lessons below.`
                      : "You've unlocked all scheduled lessons so far!"}
                  </p>
                </>
              )}
            </div>

            <div className="hidden sm:block sm:col-span-5 bg-sky-50">
              <img
                src="/images/hero-learning.jpg"
                alt="Morning learning desk"
                className="w-full h-full object-cover"
              />
            </div>
          </section>

          {/* Unlocked Curriculum List */}
          <section className="bg-white rounded-3xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">
                  Unlocked Curriculum
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {data.unlocked_count} of {data.total_lessons} lessons available
                </p>
              </div>
              <Link
                to="/scores"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                All scores
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.past_lessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                No lessons unlocked yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.past_lessons.map((lesson) => {
                  const isToday = lesson.release_date === data.today;
                  return (
                    <div
                      key={lesson.id}
                      className="group rounded-2xl bg-[#F7F7F5] hover:bg-white hover:shadow-soft p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            lesson.quiz_summary?.passed
                              ? "bg-emerald-100 text-emerald-700"
                              : isToday
                              ? "bg-blue-600 text-white"
                              : "bg-white text-zinc-700 shadow-sm"
                          }`}
                        >
                          {lesson.quiz_summary?.passed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            `D${lesson.day_number}`
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-500">
                              Day {lesson.day_number} · {lesson.release_date}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Today
                              </span>
                            )}
                            {lesson.quiz_summary?.passed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                Best {lesson.quiz_summary.best_score_percent}%
                              </span>
                            )}
                          </div>
                          <h3 className="mt-0.5 font-bold text-sm text-zinc-900 truncate group-hover:text-blue-600 transition-colors">
                            {lesson.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/lessons/${lesson.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-white text-zinc-700 text-xs font-semibold shadow-sm hover:bg-zinc-100 transition-colors"
                        >
                          Read
                        </Link>
                        {lesson.has_quiz && (
                          <Link
                            to={`/lessons/${lesson.id}/quiz`}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-sm transition-colors"
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

        {/* Right 4 Columns: Completion Ring + Next Drop */}
        <div className="lg:col-span-4 space-y-6">
          {/* Course Completion Ring */}
          <div className="bg-white rounded-3xl shadow-soft p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">Course Completion</h3>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>

            <div className="mt-5 flex items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-extrabold text-zinc-900">
                    {progressPct}%
                  </span>
                  <span className="block text-[11px] font-medium text-zinc-500">
                    Complete
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
                <span className="text-zinc-600 font-medium">Quizzes Passed</span>
                <span className="font-bold text-emerald-700">
                  {data.completed_quizzes_count}
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#F7F7F5] rounded-xl px-3.5 py-2.5">
                <span className="text-zinc-600 font-medium">Remaining</span>
                <span className="font-bold text-zinc-900">
                  {Math.max(0, data.total_lessons - data.completed_quizzes_count)}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule Card */}
          <div className="bg-white rounded-3xl shadow-soft p-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">Release Schedule</h3>
                <p className="text-xs text-zinc-500">06:30 AM Africa/Lagos</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-600 leading-relaxed">
              {data.next_release_date ? (
                <>
                  Next lesson unlocks on{" "}
                  <strong className="text-zinc-900">{data.next_release_date}</strong>. We&apos;ll
                  email you at 06:30 WAT as soon as it&apos;s ready.
                </>
              ) : (
                "All lessons in this course have been released. Review any lesson or retake quizzes anytime."
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
