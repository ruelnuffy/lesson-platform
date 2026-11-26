import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Award, CheckCircle2, History, RotateCcw, Target } from "lucide-react";
import { apiFetch, type UserScores } from "../lib/api";

export function ScoresPage() {
  const { data, isLoading } = useQuery<UserScores>({
    queryKey: ["scores"],
    queryFn: () => apiFetch<UserScores>("/api/scores"),
  });

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-8 py-8 text-zinc-500">Loading scores...</div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 py-8 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Performance
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Quiz Scores &amp; History
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Every attempt is recorded. Retake any unlocked quiz to raise your best score.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Average Best Score
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-blue-600">
              {data?.average_best_score !== null && data?.average_best_score !== undefined
                ? `${data.average_best_score}%`
                : "—"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Quizzes Passed
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-emerald-600">
              {data?.quizzes_passed ?? 0}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Total Attempts
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-zinc-900">
              {data?.total_attempts ?? 0}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 font-bold text-zinc-900">
          Best vs Latest by Lesson
        </div>
        {!data || data.by_lesson.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No quiz attempts yet. Open an unlocked lesson to take your first quiz.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3.5">Lesson</th>
                  <th className="px-6 py-3.5">Attempts</th>
                  <th className="px-6 py-3.5">Best</th>
                  <th className="px-6 py-3.5">Latest</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.by_lesson.map((row) => (
                  <tr key={row.quiz_id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-6 py-4 font-semibold text-zinc-900">
                      Day {row.day_number}: {row.lesson_title}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">{row.attempts_count}</td>
                    <td className="px-6 py-4 font-bold text-zinc-900">
                      {row.best_score_percent}%
                    </td>
                    <td className="px-6 py-4 text-zinc-600">{row.latest_score_percent}%</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          row.passed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.passed && <CheckCircle2 className="w-3 h-3" />}
                        {row.passed ? "Passed" : "In progress"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/lessons/${row.lesson_id}/quiz`}
                        className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:text-blue-800"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
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

      <section className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 font-bold text-zinc-900">
          Attempt History
        </div>
        {!data || data.attempts.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No attempts recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Lesson</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.attempts.map((a) => (
                  <tr key={a.attempt_id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-6 py-3.5 text-zinc-500 text-xs">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-zinc-900">
                      Day {a.day_number}: {a.lesson_title}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-zinc-900">
                      {a.score_percent}%
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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
