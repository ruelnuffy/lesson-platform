import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiFetch, formatNaira, type CoursePublic } from "../lib/api";
import { useAuth } from "../lib/auth";

export function LandingPage() {
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CoursePublic[]>("/api/courses"),
  });

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative bg-white shadow-soft">
        <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />
        <div className="absolute -top-24 right-0 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Structured Cohort Learning · 06:30 WAT Daily Drops
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-zinc-900 tracking-tight leading-[1.08]">
              Build real engineering mastery,{" "}
              <span className="text-indigo-600">one morning at a time.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl">
              Skip the 40-hour video backlog. Receive one focused lesson every morning at
              06:30 Africa/Lagos, lock it in with a server-graded quiz, and watch your streak
              compound.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-indigo-600 shadow-sm transition-all"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-indigo-600 shadow-sm transition-all"
                  >
                    Start Learning
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-zinc-800 font-semibold shadow-soft hover:shadow-elevated transition-all"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                10-minute daily lessons
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                Morning email reminders
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Secure Paystack checkout
              </span>
            </div>
          </div>

          {/* Right Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-elevated">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                  <BookOpen className="w-3.5 h-3.5" />
                  Day 4 Unlocked
                </span>
                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5" />4 day streak
                </span>
              </div>

              <h3 className="mt-4 text-lg font-bold tracking-tight">
                Server-Side Access Gating &amp; Timezones
              </h3>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                Enforce paid access and calendar-day releases on the server using Africa/Lagos
                timezone rules.
              </p>

              <div className="mt-5 p-4 rounded-2xl bg-white/5 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Quick Quiz Preview
                </p>
                <p className="text-sm font-medium text-zinc-100">
                  Where must paywall and release-date checks be enforced?
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="px-3 py-2 rounded-lg bg-white/5 text-xs text-zinc-400">
                    A. Only in React components
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/20 text-xs text-emerald-200 font-medium flex items-center justify-between">
                    <span>B. On the server for every lesson &amp; quiz</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              step: "01",
              title: "Enroll once via Paystack",
              desc: "Instant server-verified activation with a single transparent payment.",
            },
            {
              step: "02",
              title: "Unlock at 06:30 WAT",
              desc: "A fresh lesson drops each morning with a reminder email straight to your inbox.",
            },
            {
              step: "03",
              title: "Quiz, explain & streak",
              desc: "Take server-graded quizzes, read detailed explanations, and track your best score.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-2xl p-6 shadow-soft"
            >
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                {item.step}
              </span>
              <h3 className="mt-4 font-bold text-zinc-900">{item.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Available Courses */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Curriculum
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Available Courses
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-56 bg-white rounded-2xl shadow-soft animate-pulse" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-zinc-500">
            No active courses published yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-3xl p-7 shadow-soft hover:shadow-elevated transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      {course.total_lessons} Daily Lessons
                    </span>
                    <span className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                      {formatNaira(course.price_kobo)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-zinc-900 tracking-tight">
                    {course.title}
                  </h3>
                  <p className="mt-2.5 text-sm text-zinc-600 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 font-medium">
                    Quizzes + email reminders included
                  </span>
                  <Link
                    to={user ? `/checkout?courseId=${course.id}` : "/register"}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 text-sm transition-colors shrink-0"
                  >
                    {user ? "Enroll Now" : "Register"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="bg-white shadow-nav py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p className="font-semibold text-zinc-700">Daily Lessons</p>
          <p>Scheduled in Africa/Lagos · Powered by FastAPI, React &amp; Paystack</p>
        </div>
      </footer>
    </div>
  );
}
