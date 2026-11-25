import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch, formatNaira, type CoursePublic } from "../lib/api";

export function PaywallCard({ title = "Unlock Daily Lessons" }: { title?: string }) {
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CoursePublic[]>("/api/courses"),
  });

  const primary = courses[0];

  return (
    <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 text-xl font-bold">
        🔒
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">
        An active paid enrollment is required to view lesson content and take daily quizzes.
      </p>

      {primary && (
        <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">{primary.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{primary.description}</p>
              <p className="text-xs text-slate-500 mt-2">
                {primary.total_lessons} scheduled daily lessons + quizzes
              </p>
            </div>
            <span className="text-lg font-bold text-indigo-700 whitespace-nowrap">
              {formatNaira(primary.price_kobo)}
            </span>
          </div>
          <Link
            to={`/checkout?courseId=${primary.id}`}
            className="mt-5 block w-full text-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            Enroll &amp; Pay with Paystack
          </Link>
        </div>
      )}
    </div>
  );
}
