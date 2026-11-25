import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
      <div className="max-w-xl mx-auto px-4 py-12 text-slate-500">Loading courses...</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900">Complete Your Enrollment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Secure checkout powered by Paystack. Access unlocks immediately after server-side
          payment verification.
        </p>

        {courses.length > 1 && (
          <div className="mt-5">
            <label className="block text-sm font-medium text-slate-700">Select Course</label>
            <select
              value={activeCourse?.id ?? ""}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
          <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">{activeCourse.title}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {activeCourse.total_lessons} daily lessons + quizzes
                </p>
              </div>
              <span className="text-xl font-bold text-indigo-700">
                {formatNaira(activeCourse.price_kobo)}
              </span>
            </div>
          </div>
        )}

        {initMutation.error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {initMutation.error.message}
          </div>
        )}

        <button
          type="button"
          disabled={!activeCourse || initMutation.isPending}
          onClick={() => activeCourse && initMutation.mutate(activeCourse.id)}
          className="mt-6 w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {initMutation.isPending ? "Redirecting to Paystack..." : "Pay with Paystack"}
        </button>
      </div>
    </div>
  );
}
