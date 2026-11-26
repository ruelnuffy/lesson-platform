import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
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
      <div className="w-full px-4 sm:px-8 py-8 text-zinc-500">Loading quiz...</div>
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
      <div className="w-full px-4 sm:px-8 py-8 space-y-6">
        <div className="bg-white rounded-3xl p-8 sm:p-10 text-center shadow-elevated">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${
              result.passed
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            <Trophy className="w-8 h-8" />
          </div>

          <div className="mt-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                result.passed
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {result.passed ? "Quiz Passed" : "Keep Practicing"}
            </span>
          </div>

          <h1 className="mt-3 text-5xl font-extrabold text-zinc-900 tracking-tight">
            {result.score_percent}%
          </h1>
          <p className="mt-2 text-zinc-600 text-sm">
            {result.correct_count} of {result.total_questions} correct · Pass mark{" "}
            {result.pass_mark_percent}%
          </p>

          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-xl bg-zinc-50 text-xs text-zinc-600 shadow-sm">
            <span>
              Best: <strong className="text-zinc-900">{result.best_score_percent}%</strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span>
              Latest: <strong className="text-zinc-900">{result.latest_score_percent}%</strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span>
              Attempts: <strong className="text-zinc-900">{result.attempts_count}</strong>
            </span>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={resetForRetake}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-semibold hover:bg-zinc-200/80 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">
            Detailed Explanations
          </h2>
          {quiz.questions.map((q, idx) => {
            const r = result.results.find((item) => item.question_id === q.id);
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-zinc-900 text-sm sm:text-base">
                    {idx + 1}. {q.text}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      r?.is_correct
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {r?.is_correct ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {r?.is_correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                {r?.selected_index !== null && r?.selected_index !== undefined && (
                  <p className="mt-2.5 text-sm text-zinc-600">
                    Your answer:{" "}
                    <strong className="text-zinc-900">{q.options[r.selected_index]}</strong>
                  </p>
                )}
                {r?.explanation && (
                  <p className="mt-3 text-sm text-zinc-700 bg-zinc-50 p-3.5 rounded-xl leading-relaxed">
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
    <div className="w-full px-4 sm:px-8 py-8">
      <Link
        to={`/lessons/${quiz.lesson_id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Day {quiz.day_number}: {quiz.lesson_title}
      </Link>

      <div className="mt-4 bg-white rounded-3xl shadow-elevated p-6 sm:p-9">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
          <span>
            Question {currentIndex + 1} of {total}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
            Pass mark: {quiz.pass_mark_percent}%
          </span>
        </div>

        {/* Step progress bar */}
        <div className="mt-3 flex gap-1.5">
          {quiz.questions.map((q, idx) => {
            const answered = answers[String(q.id)] !== undefined;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={q.id}
                className={`h-2 flex-1 rounded-full transition-all ${
                  isCurrent
                    ? "bg-blue-600"
                    : answered
                    ? "bg-emerald-500"
                    : "bg-zinc-200"
                }`}
              />
            );
          })}
        </div>

        {question && (
          <div className="mt-7">
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight leading-snug">
              {question.text}
            </h1>
            <div className="mt-6 space-y-3">
              {question.options.map((option, idx) => {
                const isSelected = selected === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [String(question.id)]: idx }))
                    }
                    className={`w-full text-left p-4 rounded-2xl text-sm font-medium transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? "bg-blue-50 text-blue-950 ring-2 ring-blue-600 shadow-soft"
                        : "bg-zinc-50/90 hover:bg-white hover:shadow-soft text-zinc-700"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {submitMutation.error && (
          <div className="mt-5 p-3.5 rounded-xl bg-rose-50 shadow-sm text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{submitMutation.error.message}</span>
          </div>
        )}

        <div className="mt-8 pt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-semibold hover:bg-zinc-200/80 disabled:opacity-40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {currentIndex < total - 1 ? (
            <button
              type="button"
              disabled={selected === undefined}
              onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!allAnswered || submitMutation.isPending}
              onClick={() => submitMutation.mutate(answers)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 shadow-sm transition-colors"
            >
              {submitMutation.isPending ? "Grading..." : "Submit Quiz"}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
