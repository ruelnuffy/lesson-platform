import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, apiFetch, formatNaira } from "../../lib/api";
import { AdminCoursesTab } from "./AdminCoursesTab";
import { AdminQuizzesTab } from "./AdminQuizzesTab";

type Tab = "overview" | "users" | "courses" | "quizzes" | "payments" | "emails" | "scores";

interface OverviewData {
  total_users: number;
  paid_users: number;
  revenue_kobo: number;
  lessons_sent_today: number;
  average_quiz_score: number | null;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  is_paid: boolean;
  active_course_ids: number[];
}

interface AdminPayment {
  id: number;
  user_name: string;
  user_email: string;
  course_title: string;
  amount_kobo: number;
  status: string;
  paystack_reference: string | null;
  paid_at: string | null;
}

interface AdminEmailLog {
  id: number;
  user_email: string;
  lesson_title: string;
  day_number: number;
  type: string;
  status: string;
  sent_at: string | null;
  error: string | null;
}

interface AdminScores {
  by_lesson: Array<{
    lesson_id: number;
    lesson_title: string;
    day_number: number;
    attempts_count: number;
    average_score: number;
    pass_rate: number;
  }>;
  attempts: Array<{
    attempt_id: number;
    user_name: string;
    user_email: string;
    lesson_title: string;
    day_number: number;
    score_percent: number;
    passed: boolean;
    created_at: string;
  }>;
}

export function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [resendDate, setResendDate] = useState(new Date().toISOString().slice(0, 10));
  const [resendResult, setResendResult] = useState<string>("");
  const qc = useQueryClient();

  const overview = useQuery<OverviewData>({
    queryKey: ["admin", "overview"],
    queryFn: () => apiFetch<OverviewData>("/api/admin/overview"),
    enabled: tab === "overview",
  });

  const courses = useQuery<Array<{ id: number; title: string }>>({
    queryKey: ["admin", "courses"],
    queryFn: () => apiFetch("/api/admin/courses"),
    enabled: tab === "users",
  });

  const users = useQuery<AdminUser[]>({
    queryKey: ["admin", "users", userSearch],
    queryFn: () =>
      apiFetch<AdminUser[]>(
        `/api/admin/users${userSearch ? `?q=${encodeURIComponent(userSearch)}` : ""}`
      ),
    enabled: tab === "users",
  });

  const selectedUserScores = useQuery<
    Array<{ attempt_id: number; day_number: number; lesson_title: string; score_percent: number; passed: boolean }>
  >({
    queryKey: ["admin", "user-scores", selectedUserId],
    queryFn: () => apiFetch(`/api/admin/users/${selectedUserId}/scores`),
    enabled: Boolean(selectedUserId),
  });

  const grantMutation = useMutation({
    mutationFn: ({ userId, courseId }: { userId: number; courseId: number }) =>
      apiFetch(`/api/admin/users/${userId}/grant`, {
        method: "POST",
        body: JSON.stringify({ course_id: courseId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) =>
      apiFetch(`/api/admin/users/${userId}/revoke`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  const payments = useQuery<AdminPayment[]>({
    queryKey: ["admin", "payments"],
    queryFn: () => apiFetch<AdminPayment[]>("/api/admin/payments"),
    enabled: tab === "payments",
  });

  const emails = useQuery<AdminEmailLog[]>({
    queryKey: ["admin", "emails"],
    queryFn: () => apiFetch<AdminEmailLog[]>("/api/admin/emails"),
    enabled: tab === "emails",
  });

  const resendMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ sent: number; skipped: number; failed: number }>("/api/admin/emails/resend", {
        method: "POST",
        body: JSON.stringify({ target_date: resendDate }),
      }),
    onSuccess: (res) => {
      setResendResult(`Sent: ${res.sent}, Skipped: ${res.skipped}, Failed: ${res.failed}`);
      qc.invalidateQueries({ queryKey: ["admin", "emails"] });
    },
  });

  const scores = useQuery<AdminScores>({
    queryKey: ["admin", "scores"],
    queryFn: () => apiFetch<AdminScores>("/api/admin/scores"),
    enabled: tab === "scores",
  });

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "courses", label: "Courses & Lessons" },
    { id: "quizzes", label: "Quizzes" },
    { id: "payments", label: "Payments" },
    { id: "emails", label: "Emails" },
    { id: "scores", label: "Scores" },
  ];

  const defaultCourseId = courses.data?.[0]?.id;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium ${
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && overview.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={String(overview.data.total_users)} />
          <StatCard label="Paid Users" value={String(overview.data.paid_users)} />
          <StatCard label="Revenue" value={formatNaira(overview.data.revenue_kobo)} />
          <StatCard label="Emails Sent Today" value={String(overview.data.lessons_sent_today)} />
          <StatCard
            label="Avg Quiz Score"
            value={
              overview.data.average_quiz_score !== null
                ? `${overview.data.average_quiz_score}%`
                : "—"
            }
          />
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <input
            placeholder="Search users by name or email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full sm:w-80 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(users.data || []).map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 uppercase text-xs font-semibold">{u.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          u.is_paid
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.is_paid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {!u.is_paid && defaultCourseId && (
                        <button
                          onClick={() =>
                            grantMutation.mutate({ userId: u.id, courseId: defaultCourseId })
                          }
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          Grant Access
                        </button>
                      )}
                      {u.is_paid && (
                        <button
                          onClick={() => revokeMutation.mutate(u.id)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        View Scores
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedUserId && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-900">User #{selectedUserId} Quiz Scores</h3>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Close
                </button>
              </div>
              {selectedUserScores.data?.length ? (
                <ul className="space-y-1 text-sm">
                  {selectedUserScores.data.map((s) => (
                    <li key={s.attempt_id}>
                      Day {s.day_number} ({s.lesson_title}): <strong>{s.score_percent}%</strong>{" "}
                      ({s.passed ? "Passed" : "Failed"})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No quiz attempts for this user.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "courses" && <AdminCoursesTab />}
      {tab === "quizzes" && <AdminQuizzesTab />}

      {tab === "payments" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(payments.data || []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.user_name}</div>
                    <div className="text-xs text-slate-500">{p.user_email}</div>
                  </td>
                  <td className="px-4 py-3">{p.course_title}</td>
                  <td className="px-4 py-3 font-medium">{formatNaira(p.amount_kobo)}</td>
                  <td className="px-4 py-3 uppercase text-xs font-semibold">{p.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.paystack_reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "emails" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={resendDate}
              onChange={(e) => setResendDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              {resendMutation.isPending ? "Sending..." : "Send / Resend Day's Emails"}
            </button>
            {resendResult && <span className="text-sm text-slate-600">{resendResult}</span>}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Lesson</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(emails.data || []).map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">{e.user_email}</td>
                    <td className="px-4 py-3">
                      Day {e.day_number}: {e.lesson_title}
                    </td>
                    <td className="px-4 py-3 uppercase text-xs font-semibold">{e.status}</td>
                    <td className="px-4 py-3 text-xs text-rose-600">{e.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "scores" && scores.data && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <a
              href={`${API_BASE_URL}/api/admin/scores/export.csv`}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
            >
              Export CSV
            </a>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-200 font-bold text-slate-900">
              Per-Lesson Summary
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Lesson</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Avg Score</th>
                  <th className="px-4 py-3">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scores.data.by_lesson.map((row) => (
                  <tr key={row.lesson_id}>
                    <td className="px-4 py-3 font-medium">
                      Day {row.day_number}: {row.lesson_title}
                    </td>
                    <td className="px-4 py-3">{row.attempts_count}</td>
                    <td className="px-4 py-3">{row.average_score}%</td>
                    <td className="px-4 py-3">{row.pass_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-200 font-bold text-slate-900">
              All Attempts
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Lesson</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Passed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scores.data.attempts.map((a) => (
                  <tr key={a.attempt_id}>
                    <td className="px-4 py-3">
                      {a.user_name} <span className="text-xs text-slate-500">({a.user_email})</span>
                    </td>
                    <td className="px-4 py-3">
                      Day {a.day_number}: {a.lesson_title}
                    </td>
                    <td className="px-4 py-3 font-semibold">{a.score_percent}%</td>
                    <td className="px-4 py-3">{a.passed ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
