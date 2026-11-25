import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch, formatNaira, type CoursePublic } from "../lib/api";
import { useAuth } from "../lib/auth";

export function LandingPage() {
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CoursePublic[]>("/api/courses"),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <section className="text-center max-w-2xl mx-auto">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700">
          Learn Consistently, One Day at a Time
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Structured Daily Lessons Delivered Every Morning
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Unlock one focused lesson every morning at 06:30 WAT, test your mastery with
          server-graded quizzes, and track your streak as you grow.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-semibold hover:bg-slate-50"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Available Courses</h2>
        {isLoading ? (
          <p className="text-slate-500">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-slate-500">No active courses yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900">{course.title}</h3>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-sm whitespace-nowrap">
                      {formatNaira(course.price_kobo)}
                    </span>
                  </div>
                  <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                    {course.description}
                  </p>
                  <p className="mt-4 text-xs font-medium text-slate-500">
                    {course.total_lessons} daily lessons · Interactive quizzes · Morning email reminders
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={user ? `/checkout?courseId=${course.id}` : "/register"}
                    className="w-full text-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 text-sm"
                  >
                    {user ? "Enroll Now" : "Register to Enroll"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
