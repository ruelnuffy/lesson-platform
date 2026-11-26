import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
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

  const todayQuiz = data.lesson?.quiz_summary ?? null;
  const todayScore =
    todayQuiz?.latest_score_percent !== null && todayQuiz?.latest_score_percent !== undefined
      ? `${todayQuiz.latest_score_percent}%`
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
              Today&apos;s Score
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-blue-600">
              {todayScore ?? "—"}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {todayQuiz && todayQuiz.attempts_count > 0
                ? `Best: ${todayQuiz.best_score_percent}% · ${todayQuiz.passed ? "Passed" : "Not passed"}`
                : data.lesson?.has_quiz
                ? "Not taken yet"
                : "No quiz today"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-blue-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Progress
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {progressPct}%
            </span>
          </div>
          <div className="mt-3.5 w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {data.completed_quizzes_count} of {data.total_lessons} lessons completed
          </p>
        </div>
      </div>

      {/* Main 12-Column Dashboard Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Today's Lesson Only */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Lesson Spotlight */}
          <section className="bg-white rounded-3xl shadow-elevated overflow-hidden grid sm:grid-cols-12">
            <div className="sm:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
              <span className="inline-flex items-center self-start px-3 py-1 rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                Today&apos;s Lesson · {data.today}
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
                      Open Today&apos;s Lesson
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
                    No lesson scheduled for today
                  </h2>
                  <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
                    {data.next_release_date
                      ? `Your next lesson unlocks on ${data.next_release_date} at 06:30 WAT.`
                      : "All scheduled lessons have been completed!"}
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
