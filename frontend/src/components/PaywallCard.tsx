import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { apiFetch, formatNaira, type CoursePublic } from "../lib/api";

export function PaywallCard({ title = "Unlock Daily Lessons" }: { title?: string }) {
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CoursePublic[]>("/api/courses"),
  });

  const primary = courses[0];

  return (
    <div className="max-w-xl mx-auto my-12 px-4">
      <div className="bg-white rounded-3xl shadow-elevated overflow-hidden">
        <div className="bg-blue-600 px-8 py-8 text-center text-white relative overflow-hidden">
          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm shadow-sm">
              <Lock className="w-6 h-6 text-blue-300" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-zinc-300 max-w-md mx-auto">
              An active paid enrollment is required to read lesson content, watch embedded
              videos, and take daily mastery quizzes.
            </p>
          </div>
        </div>

        <div className="p-8">
          {primary ? (
            <>
              <div className="p-5 rounded-2xl bg-zinc-50/90 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Full Cohort Access
                    </span>
                    <h2 className="mt-1 font-bold text-zinc-900 text-lg">{primary.title}</h2>
                    <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                      {primary.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-extrabold text-zinc-900">
                      {formatNaira(primary.price_kobo)}
                    </span>
                    <span className="block text-[11px] text-zinc-500">One-time payment</span>
                  </div>
                </div>

                <ul className="mt-5 pt-4 space-y-2 text-sm text-zinc-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {primary.total_lessons} structured daily lessons unlocked on schedule
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Server-graded quizzes with instant explanations &amp; unlimited retakes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Daily 06:30 WAT morning email reminders
                  </li>
                </ul>
              </div>

              <Link
                to={`/checkout?courseId=${primary.id}`}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm transition-all"
              >
                Enroll &amp; Pay with Paystack
                <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified server-side via Paystack · Instant unlock
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-zinc-500">
              No active courses are available for enrollment yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
