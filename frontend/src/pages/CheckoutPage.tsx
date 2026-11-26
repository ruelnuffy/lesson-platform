import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ApiError, apiFetch, formatNaira, resolveMediaUrl, type CoursePublic } from "../lib/api";

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
      <div className="w-full px-4 sm:px-8 py-8 text-zinc-500">Loading checkout...</div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 py-8 space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Billing &amp; Enrollment
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Complete Your Enrollment
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pay once via Paystack. Access unlocks automatically once verified server-side.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Course Details */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="h-56 bg-sky-50">
            <img
              src={resolveMediaUrl(activeCourse?.image_url)}
              alt={activeCourse?.title || "Course preview"}
              className="w-full h-full object-cover"
            />
          </div>

          {activeCourse ? (
            <div className="p-7 sm:p-8 space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Selected Course
                </span>
                <h2 className="mt-1.5 text-2xl font-extrabold text-zinc-900 tracking-tight">
                  {activeCourse.title}
                </h2>
                <p className="mt-2.5 text-sm text-zinc-600 leading-relaxed">
                  {activeCourse.description}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm text-zinc-700 pt-2">
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-4 py-3">
                  <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{activeCourse.total_lessons} daily video lessons</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Server-graded quizzes</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Daily 06:30 WAT emails</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#F7F7F5] rounded-xl px-4 py-3">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Unlimited quiz retakes</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-sm text-zinc-500">
              No active courses available for enrollment.
            </div>
          )}
        </div>

        {/* Right: Order Summary & Paystack CTA */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-elevated p-7 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900">Order Summary</h2>
              <p className="text-xs text-zinc-500">One-time cohort payment</p>
            </div>
          </div>

          {courses.length > 1 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Select Course
              </label>
              <select
                value={activeCourse?.id ?? ""}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl bg-[#F7F7F5] px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft"
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
            <div className="p-5 bg-[#F7F7F5] rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Course access</span>
                <span className="font-semibold text-zinc-900">
                  {formatNaira(activeCourse.price_kobo)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Lessons included</span>
                <span className="font-semibold text-zinc-900">
                  {activeCourse.total_lessons} days
                </span>
              </div>
              <div className="pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-900">Total due today</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  {formatNaira(activeCourse.price_kobo)}
                </span>
              </div>
            </div>
          )}

          {initMutation.error && (
            <div className="p-3.5 rounded-xl bg-rose-50 shadow-sm text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{initMutation.error.message}</span>
            </div>
          )}

          <button
            type="button"
            disabled={!activeCourse || initMutation.isPending}
            onClick={() => activeCourse && initMutation.mutate(activeCourse.id)}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-soft transition-colors"
          >
            {initMutation.isPending ? "Redirecting to Paystack..." : "Pay with Paystack"}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            Secured by Paystack · Server-verified transactions
          </p>
        </div>
      </div>
    </div>
  );
}
