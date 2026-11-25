import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch, type UserScores } from "../lib/api";

export function ScoresPage() {
  const { data, isLoading } = useQuery<UserScores>({
    queryKey: ["scores"],
    queryFn: () => apiFetch<UserScores>("/api/scores"),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-slate-500">Loading scores...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your Quiz Scores &amp; History</h1>
        <p className="text-sm text-slate-600 mt-1">
          Every attempt is saved. You can retake any unlocked quiz to improve your best score.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Average Best Score</p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {data?.average_best_score !== null && data?.average_best_score !== undefined
              ? `${data.average_best_score}%`
              : "—"}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Quizzes Passed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {data?.quizzes_passed ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Attempts</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data?.total_attempts ?? 0}</p>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 font-semibold text-slate-900">
          Best vs Latest by Lesson
        </div>
        {!data || data.by_lesson.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No quiz attempts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3">Lesson</th>
                  <th className="px-5 py-3">Attempts</th>
                  <th className="px-5 py-3">Best</th>
                  <th className="px-5 py-3">Latest</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.by_lesson.map((row) => (
                  <tr key={row.quiz_id}>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      Day {row.day_number}: {row.lesson_title}
                    </td>
                    <td className="px-5 py-3">{row.attempts_count}</td>
                    <td className="px-5 py-3 font-semibold">{row.best_score_percent}%</td>
                    <td className="px-5 py-3">{row.latest_score_percent}%</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          row.passed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.passed ? "Passed" : "Not yet"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/lessons/${row.lesson_id}/quiz`}
                        className="text-indigo-600 font-medium hover:underline"
                      >
                        Retake
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 font-semibold text-slate-900">
          Attempt History
        </div>
        {!data || data.attempts.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No attempts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Lesson</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.attempts.map((a) => (
                  <tr key={a.attempt_id}>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      Day {a.day_number}: {a.lesson_title}
                    </td>
                    <td className="px-5 py-3 font-semibold">{a.score_percent}%</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          a.passed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {a.passed ? "Passed" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
