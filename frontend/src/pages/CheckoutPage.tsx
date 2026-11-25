import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { ApiError, apiFetch, formatNaira, type CoursePublic } from "../lib/api";

interface InitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const initialCourseId = Number(searchParams.get("courseId") || 0);
  const [selectedCourseId, setSelectedCourseId] = useState<number>(initialCourseId);

  const { data: courses = [], isLoading } = useQuery<CoursePublic[]>({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CoursePublic[]>("/api/courses"),
  });

  const activeCourse =
    courses.find((c) => c.id === selectedCourseId) || courses[0] || null;

  const initMutation = useMutation<InitResponse, ApiError, number>({
    mutationFn: (courseId) =>
      apiFetch<InitResponse>("/api/payments/initialize", {
        method: "POST",
        body: JSON.stringify({
          course_id: courseId,
          callback_url: `${window.location.origin}/checkout/callback`,
        }),
      }),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-zinc-500">Loading checkout...</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white border border-zinc-200/90 rounded-3xl shadow-elevated p-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600">
          <CreditCard className="w-6 h-6" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-zinc-900 tracking-tight">
          Complete Your Enrollment
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pay once via Paystack. Access unlocks automatically once verified server-side.
        </p>

        {courses.length > 1 && (
          <div className="mt-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Select Course
            </label>
            <select
              value={activeCourse?.id ?? ""}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({formatNaira(c.price_kobo)})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeCourse && (
          <div className="mt-6 p-5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="font-bold text-zinc-900">{activeCourse.title}</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {activeCourse.total_lessons} scheduled daily lessons + quizzes
                </p>
              </div>
              <span className="text-2xl font-extrabold text-zinc-900">
                {formatNaira(activeCourse.price_kobo)}
              </span>
            </div>
            <ul className="pt-3 border-t border-zinc-200/70 space-y-2 text-xs text-zinc-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Instant access to all unlocked lessons
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Daily 06:30 WAT reminder emails
              </li>
            </ul>
          </div>
        )}

        {initMutation.error && (
          <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{initMutation.error.message}</span>
          </div>
        )}

        <button
          type="button"
          disabled={!activeCourse || initMutation.isPending}
          onClick={() => activeCourse && initMutation.mutate(activeCourse.id)}
          className="mt-6 w-full py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors"
        >
          {initMutation.isPending ? "Redirecting to Paystack..." : "Pay with Paystack"}
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Secured by Paystack · Server-verified transactions
        </p>
      </div>
    </div>
  );
}
