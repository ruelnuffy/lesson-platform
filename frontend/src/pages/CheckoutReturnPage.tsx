import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
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
      <div className="max-w-lg mx-auto my-14 px-4">
        <div className="bg-white rounded-3xl shadow-elevated p-9 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 text-rose-600">
            <XCircle className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">
            Payment Not Completed
          </h1>
          <p className="mt-2 text-zinc-600 text-sm">
            Your payment was cancelled or could not be verified. No access has been granted.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/checkout"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Try Again
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-semibold hover:bg-zinc-200/80"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto my-14 px-4">
        <div className="bg-white rounded-3xl shadow-elevated p-9 text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <h1 className="mt-4 text-xl font-extrabold text-zinc-900">
            Verifying your payment...
          </h1>
          <p className="mt-2 text-zinc-600 text-sm">
            Confirming reference <code className="font-mono text-xs">{reference}</code> with
            Paystack.
          </p>
        </div>
      </div>
    );
  }

  if (error || (reference && data?.status !== "paid")) {
    return (
      <div className="max-w-lg mx-auto my-14 px-4">
        <div className="bg-white rounded-3xl shadow-elevated p-9 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">
            Payment Pending Verification
          </h1>
          <p className="mt-2 text-zinc-600 text-sm">
            {error
              ? error.message
              : `Transaction ${reference} is currently '${data?.status}'. Access activates automatically once Paystack confirms.`}
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-14 px-4">
      <div className="bg-white rounded-3xl shadow-elevated p-9 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Enrollment Confirmed!</h1>
        <p className="mt-2 text-zinc-600 text-sm">
          Your payment has been verified on the server. Today&apos;s lesson is unlocked and ready.
        </p>
        <Link
          to="/lessons/today"
          className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          Start Today&apos;s Lesson
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
