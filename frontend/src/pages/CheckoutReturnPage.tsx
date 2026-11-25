import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiFetch } from "../lib/api";

interface VerifyResponse {
  reference: string;
  status: "pending" | "paid" | "expired";
  course_id: number;
  paid_at: string | null;
}

export function CheckoutReturnPage({ mode }: { mode: "callback" | "success" | "failure" }) {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref") || "";
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<VerifyResponse, ApiError>({
    queryKey: ["payment", "verify", reference],
    queryFn: () => apiFetch<VerifyResponse>(`/api/payments/verify/${reference}`),
    enabled: Boolean(reference) && mode !== "failure",
  });

  useEffect(() => {
    if (data?.status === "paid") {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    }
  }, [data?.status, queryClient]);

  if (mode === "failure") {
    return (
      <div className="max-w-lg mx-auto my-14 bg-white border border-rose-200 rounded-2xl p-8 text-center">
        <div className="text-4xl">❌</div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Payment Not Completed</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Your payment was cancelled or could not be verified. No access has been granted yet.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/checkout"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Try Again
          </Link>
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto my-14 bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Verifying your payment...</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Confirming transaction <code>{reference}</code> with Paystack.
        </p>
      </div>
    );
  }

  if (error || (reference && data?.status !== "paid")) {
    return (
      <div className="max-w-lg mx-auto my-14 bg-white border border-amber-200 rounded-2xl p-8 text-center">
        <div className="text-4xl">⏳</div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Payment Pending Verification</h1>
        <p className="mt-2 text-slate-600 text-sm">
          {error
            ? error.message
            : `Transaction ${reference} is currently '${data?.status}'. If you were charged, access will activate automatically once Paystack's webhook arrives.`}
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-14 bg-white border border-emerald-200 rounded-2xl p-8 text-center">
      <div className="text-4xl">🎉</div>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Enrollment Confirmed!</h1>
      <p className="mt-2 text-slate-600 text-sm">
        Your payment has been verified on the server. Today&apos;s lesson is unlocked and ready.
      </p>
      <Link
        to="/lessons/today"
        className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
      >
        Start Today&apos;s Lesson
      </Link>
    </div>
  );
}
