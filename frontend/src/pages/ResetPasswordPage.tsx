import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Missing password reset token. Please request a new reset link.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-elevated overflow-hidden grid md:grid-cols-12">
        <div className="hidden md:block md:col-span-5 bg-sky-50">
          <img
            src="/images/course-workspace.jpg"
            alt="Clean coding workspace"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Daily Lessons
          </p>

          {success ? (
            <div className="mt-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="mt-4 text-3xl font-extrabold text-zinc-900 tracking-tight">
                Password updated
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-soft transition-colors"
              >
                Sign in now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-extrabold text-zinc-900 tracking-tight">
                Set a new password
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Choose a strong password of at least 8 characters.
              </p>

              {error && (
                <div className="mt-6 p-3.5 rounded-xl bg-rose-50 shadow-sm text-rose-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    New Password
                  </label>
                  <div className="mt-1.5 relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl bg-[#F7F7F5] pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Confirm New Password
                  </label>
                  <div className="mt-1.5 relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl bg-[#F7F7F5] pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:shadow-soft transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-soft transition-colors"
                >
                  {submitting ? "Updating password..." : "Update Password"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              <p className="mt-7 text-sm text-zinc-600">
                Need a new link?{" "}
                <Link
                  to="/forgot-password"
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Request again
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
