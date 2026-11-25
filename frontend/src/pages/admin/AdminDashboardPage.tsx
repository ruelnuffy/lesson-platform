import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  Download,
  Mail,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
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

const statusPill = (status: string) => {
  switch (status) {
    case "paid":
    case "sent":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "failed":
    case "expired":
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
};

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
    Array<{
      attempt_id: number;
      day_number: number;
      lesson_title: string;
      score_percent: number;
      passed: boolean;
    }>
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
      setResendResult(`Sent: ${res.sent} · Skipped: ${res.skipped} · Failed: ${res.failed}`);
      qc.invalidateQueries({ queryKey: ["admin", "emails"] });
    },
  });

  const scores = useQuery<AdminScores>({
    queryKey: ["admin", "scores"],
    queryFn: () => apiFetch<AdminScores>("/api/admin/scores"),
    enabled: tab === "scores",
  });

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { id: "courses", label: "Courses & Lessons", icon: <BookOpen className="w-4 h-4" /> },
    { id: "quizzes", label: "Quizzes", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "payments", label: "Payments", icon: <CreditCard className="w-4 h-4" /> },
    { id: "emails", label: "Emails", icon: <Mail className="w-4 h-4" /> },
    { id: "scores", label: "Scores", icon: <Award className="w-4 h-4" /> },
  ];

  const defaultCourseId = courses.data?.[0]?.id;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24">
          <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-soft p-3">
            <div className="px-3 py-2.5 mb-1 flex items-center gap-2 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Admin Console</p>
                <p className="text-[11px] text-zinc-500">Operations &amp; Content</p>
              </div>
            </div>

            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? "bg-zinc-900 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <section className="lg:col-span-9 min-w-0 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight capitalize">
              {tabs.find((t) => t.id === tab)?.label}
            </h1>
          </div>

          {tab === "overview" && overview.data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Total Users"
                value={String(overview.data.total_users)}
                accent="text-zinc-900"
              />
              <StatCard
                label="Paid Users"
                value={String(overview.data.paid_users)}
                accent="text-emerald-600"
              />
              <StatCard
                label="Total Revenue"
                value={formatNaira(overview.data.revenue_kobo)}
                accent="text-indigo-600"
              />
              <StatCard
                label="Emails Sent Today"
                value={String(overview.data.lessons_sent_today)}
                accent="text-zinc-900"
              />
              <StatCard
                label="Average Quiz Score"
                value={
                  overview.data.average_quiz_score !== null
                    ? `${overview.data.average_quiz_score}%`
                    : "—"
                }
                accent="text-amber-600"
              />
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 pl-10 pr-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-soft overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {(users.data || []).map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50/70">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-zinc-900">{u.name}</div>
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              u.is_paid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            {u.is_paid ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-3 whitespace-nowrap">
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
                            Scores
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedUserId && (
                <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-soft">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-zinc-900">
                      User #{selectedUserId} Quiz Scores
                    </h3>
                    <button
                      onClick={() => setSelectedUserId(null)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedUserScores.data?.length ? (
                    <ul className="space-y-2 text-sm">
                      {selectedUserScores.data.map((s) => (
                        <li
                          key={s.attempt_id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50"
                        >
                          <span>
                            Day {s.day_number}: <strong>{s.lesson_title}</strong>
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              s.passed
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {s.score_percent}% ({s.passed ? "Passed" : "Failed"})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500">No quiz attempts for this user.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "courses" && <AdminCoursesTab />}
          {tab === "quizzes" && <AdminQuizzesTab />}

          {tab === "payments" && (
            <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-soft overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Course</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(payments.data || []).map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/70">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-zinc-900">{p.user_name}</div>
                        <div className="text-xs text-zinc-500">{p.user_email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700">{p.course_title}</td>
                      <td className="px-5 py-3.5 font-bold text-zinc-900">
                        {formatNaira(p.amount_kobo)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${statusPill(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">
                        {p.paystack_reference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "emails" && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-soft p-4 flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={resendDate}
                  onChange={(e) => setResendDate(e.target.value)}
                  className="rounded-xl border border-zinc-300 px-3.5 py-2 text-sm"
                />
                <button
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {resendMutation.isPending ? "Sending..." : "Send / Resend Day's Emails"}
                </button>
                {resendResult && (
                  <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-lg">
                    {resendResult}
                  </span>
                )}
              </div>

              <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-soft overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-5 py-3.5">Recipient</th>
                      <th className="px-5 py-3.5">Lesson</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {(emails.data || []).map((e) => (
                      <tr key={e.id} className="hover:bg-zinc-50/70">
                        <td className="px-5 py-3.5 font-medium text-zinc-900">{e.user_email}</td>
                        <td className="px-5 py-3.5 text-zinc-700">
                          Day {e.day_number}: {e.lesson_title}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${statusPill(
                              e.status
                            )}`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-rose-600">{e.error || "—"}</td>
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </a>
              </div>

              <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-soft overflow-x-auto">
                <div className="px-5 py-3.5 border-b border-zinc-100 font-bold text-zinc-900">
                  Per-Lesson Summary
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-5 py-3.5">Lesson</th>
                      <th className="px-5 py-3.5">Attempts</th>
                      <th className="px-5 py-3.5">Avg Score</th>
                      <th className="px-5 py-3.5">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {scores.data.by_lesson.map((row) => (
                      <tr key={row.lesson_id} className="hover:bg-zinc-50/70">
                        <td className="px-5 py-3.5 font-semibold text-zinc-900">
                          Day {row.day_number}: {row.lesson_title}
                        </td>
                        <td className="px-5 py-3.5">{row.attempts_count}</td>
                        <td className="px-5 py-3.5 font-bold">{row.average_score}%</td>
                        <td className="px-5 py-3.5 text-emerald-700 font-semibold">
                          {row.pass_rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-soft overflow-x-auto">
                <div className="px-5 py-3.5 border-b border-zinc-100 font-bold text-zinc-900">
                  All Attempts
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Lesson</th>
                      <th className="px-5 py-3.5">Score</th>
                      <th className="px-5 py-3.5">Passed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {scores.data.attempts.map((a) => (
                      <tr key={a.attempt_id} className="hover:bg-zinc-50/70">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-zinc-900">{a.user_name}</span>{" "}
                          <span className="text-xs text-zinc-500">({a.user_email})</span>
                        </td>
                        <td className="px-5 py-3.5">
                          Day {a.day_number}: {a.lesson_title}
                        </td>
                        <td className="px-5 py-3.5 font-bold">{a.score_percent}%</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              a.passed
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {a.passed ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}
