import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { PaywallCard } from "../components/PaywallCard";
import {
  ApiError,
  apiFetch,
  type QuizPublic,
  type QuizSubmitResult,
} from "../lib/api";

export function QuizPage() {
  const { lessonId } = useParams();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const { data: quiz, isLoading, error } = useQuery<QuizPublic, ApiError>({
    queryKey: ["quiz", "lesson", lessonId],
    queryFn: () => apiFetch<QuizPublic>(`/api/lessons/${lessonId}/quiz`),
    enabled: Boolean(lessonId),
  });

  const submitMutation = useMutation<QuizSubmitResult, ApiError, Record<string, number>>({
    mutationFn: (payload) =>
      apiFetch<QuizSubmitResult>(`/api/quizzes/${quiz!.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["quiz", "lesson", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-slate-500">Loading quiz...</div>
    );
  }

  if (error instanceof ApiError && error.status === 403 && error.reason === "not_paid") {
    return <PaywallCard title="Enroll to Take This Quiz" />;
  }

  if (error || !quiz) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-rose-600">
        {error?.message || "Quiz not available"}
      </div>
    );
  }

  const resetForRetake = () => {
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
              result.passed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {result.passed ? "Passed!" : "Keep Practicing"}
          </span>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900">
            {result.score_percent}%
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            {result.correct_count} of {result.total_questions} correct · Pass mark{" "}
            {result.pass_mark_percent}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Best score: <strong>{result.best_score_percent}%</strong> · Latest:{" "}
            <strong>{result.latest_score_percent}%</strong> · Attempts: {result.attempts_count}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={resetForRetake}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Retake Quiz
            </button>
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Explanations</h2>
          {quiz.questions.map((q, idx) => {
            const r = result.results.find((item) => item.question_id === q.id);
            return (
              <div
                key={q.id}
                className={`bg-white border rounded-xl p-5 ${
                  r?.is_correct ? "border-emerald-200" : "border-rose-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {idx + 1}. {q.text}
                  </p>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      r?.is_correct
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {r?.is_correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                {r?.selected_index !== null && r?.selected_index !== undefined && (
                  <p className="mt-2 text-sm text-slate-600">
                    Your answer: <strong>{q.options[r.selected_index]}</strong>
                  </p>
                )}
                {r?.explanation && (
                  <p className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {r.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const total = quiz.questions.length;
  const selected = question ? answers[String(question.id)] : undefined;
  const allAnswered = quiz.questions.every((q) => answers[String(q.id)] !== undefined);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to={`/lessons/${quiz.lesson_id}`} className="text-sm text-indigo-600 hover:underline">
        ← Back to Day {quiz.day_number}: {quiz.lesson_title}
      </Link>

      <div className="mt-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Question {currentIndex + 1} of {total}
          </span>
          <span>Pass mark: {quiz.pass_mark_percent}%</span>
        </div>

        <div className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>

        {question && (
          <div className="mt-6">
            <h1 className="text-xl font-bold text-slate-900">{question.text}</h1>
            <div className="mt-5 space-y-3">
              {question.options.map((option, idx) => {
                const isSelected = selected === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [String(question.id)]: idx }))
                    }
                    className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <span className="inline-block w-6 font-bold text-slate-400">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {submitMutation.error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {submitMutation.error.message}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium disabled:opacity-40"
          >
            Previous
          </button>

          {currentIndex < total - 1 ? (
            <button
              type="button"
              disabled={selected === undefined}
              onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!allAnswered || submitMutation.isPending}
              onClick={() => submitMutation.mutate(answers)}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40"
            >
              {submitMutation.isPending ? "Grading..." : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
