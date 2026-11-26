import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  Mail,
  ShieldCheck,
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
        <div className="absolute inset-0 bg-dot-grid opacity-50 pointer-events-none" />
        <div className="absolute -top-24 right-0 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-zinc-900 tracking-tight leading-[1.08]">
              Build real engineering mastery,{" "}
              <span className="text-blue-600">
                one morning at a time.
              </span>
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
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-soft transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-soft transition-colors"
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
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                10-minute daily lessons
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Morning email reminders
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Secure Paystack checkout
              </span>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-elevated bg-white">
              <img
                src="/images/hero-learning.jpg"
                alt="Learner enjoying a bright morning lesson at a sunlit desk"
                className="w-full h-[320px] sm:h-[380px] object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-elevated flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Today&apos;s Lesson Ready
                    </p>
                    <p className="text-sm font-bold text-zinc-900">
                      Day 4: Access Gating &amp; Timezones
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold shrink-0">
                  <Flame className="w-3.5 h-3.5" />4 day streak
                </span>
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
              className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-shadow"
            >
              <span className="font-mono text-xs font-bold text-blue-600 bg-sky-50 px-2.5 py-1 rounded-md">
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
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Curriculum
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Available Courses
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-80 bg-white rounded-3xl shadow-soft animate-pulse" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-soft p-10 text-center text-zinc-500">
            No active courses published yet.
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-elevated transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-sky-50">
                    <img
                      src="/images/course-workspace.jpg"
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-zinc-800 text-xs font-bold shadow-sm">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      {course.total_lessons} Daily Lessons
                    </span>
                  </div>

                  <div className="p-7 pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                        {course.title}
                      </h3>
                      <span className="text-2xl font-extrabold text-blue-600 tracking-tight shrink-0">
                        {formatNaira(course.price_kobo)}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm text-zinc-600 leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="p-7 pt-6 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500 font-medium">
                    Quizzes + email reminders included
                  </span>
                  <Link
                    to={user ? `/checkout?courseId=${course.id}` : "/register"}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 text-sm shadow-sm transition-colors shrink-0"
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
          <p className="font-bold text-blue-600">Daily Lessons</p>
          <p>Scheduled in Africa/Lagos · Powered by FastAPI, React &amp; Paystack</p>
        </div>
      </footer>
    </div>
  );
}
