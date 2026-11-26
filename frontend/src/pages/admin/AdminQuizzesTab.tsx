import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface AdminLesson {
  id: number;
  day_number: number;
  title: string;
}

interface AdminQuestion {
  id: number;
  quiz_id: number;
  text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  order: number;
}

interface AdminQuiz {
  id: number;
  lesson_id: number;
  pass_mark_percent: number;
  questions: AdminQuestion[];
}

export function AdminQuizzesTab() {
  const qc = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [passMark, setPassMark] = useState("70");
  const [qText, setQText] = useState("");
  const [optionsText, setOptionsText] = useState("Option A\nOption B\nOption C\nOption D");
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");

  const { data: lessons = [] } = useQuery<AdminLesson[]>({
    queryKey: ["admin", "lessons", "all"],
    queryFn: () => apiFetch<AdminLesson[]>("/api/admin/lessons"),
  });

  const activeLessonId = selectedLessonId ?? lessons[0]?.id ?? null;

  const { data: quiz } = useQuery<AdminQuiz>({
    queryKey: ["admin", "quiz", activeLessonId],
    queryFn: async () => {
      const data = await apiFetch<AdminQuiz>(`/api/admin/lessons/${activeLessonId}/quiz`);
      setPassMark(String(data.pass_mark_percent));
      return data;
    },
    enabled: Boolean(activeLessonId),
  });

  const updatePassMark = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/lessons/${activeLessonId}/quiz`, {
        method: "PUT",
        body: JSON.stringify({ pass_mark_percent: Number(passMark) }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "quiz", activeLessonId] }),
  });

  const addQuestion = useMutation({
    mutationFn: () => {
      const options = optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return apiFetch(`/api/admin/quizzes/${quiz!.id}/questions`, {
        method: "POST",
        body: JSON.stringify({
          text: qText,
          options,
          correct_index: correctIndex,
          explanation,
          order: (quiz?.questions.length ?? 0) + 1,
        }),
      });
    },
    onSuccess: () => {
      setQText("");
      setExplanation("");
      setCorrectIndex(0);
      qc.invalidateQueries({ queryKey: ["admin", "quiz", activeLessonId] });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "quiz", activeLessonId] }),
  });

  const parsedOptions = optionsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleAddQuestion = (e: FormEvent) => {
    e.preventDefault();
    if (quiz) addQuestion.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-soft p-5 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Select Lesson
          </label>
          <select
            value={activeLessonId ?? ""}
            onChange={(e) => setSelectedLessonId(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                Day {l.day_number}: {l.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Pass Mark (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={passMark}
            onChange={(e) => setPassMark(e.target.value)}
            className="mt-1.5 w-24 rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <button
          type="button"
          onClick={() => updatePassMark.mutate()}
          className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          Save Pass Mark
        </button>
      </div>

      {quiz && (
        <>
          <div className="bg-white rounded-2xl shadow-soft p-5 space-y-3">
            <h2 className="font-bold text-zinc-900">
              Questions ({quiz.questions.length})
            </h2>
            {quiz.questions.length === 0 ? (
              <p className="text-sm text-zinc-500">No questions yet.</p>
            ) : (
              quiz.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-zinc-50/80 shadow-sm">
                  <div className="flex justify-between gap-4">
                    <p className="font-bold text-zinc-900 text-sm">
                      {idx + 1}. {q.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteQuestion.mutate(q.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <ul className="mt-2.5 space-y-1 text-sm">
                    {q.options.map((opt, optIdx) => (
                      <li
                        key={optIdx}
                        className={`flex items-center gap-1.5 ${
                          optIdx === q.correct_index
                            ? "font-semibold text-emerald-700"
                            : "text-zinc-600"
                        }`}
                      >
                        <span className="text-xs">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span>{opt}</span>
                        {optIdx === q.correct_index && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && (
                    <p className="mt-2.5 text-xs text-zinc-500 bg-white shadow-sm p-2.5 rounded-lg">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleAddQuestion}
            className="bg-white rounded-2xl shadow-soft p-5 space-y-4"
          >
            <h2 className="font-bold text-zinc-900">Add Question</h2>
            <input
              required
              placeholder="Question text"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="w-full rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Options (one per line)
              </label>
              <textarea
                rows={4}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Correct Answer
              </label>
              <select
                value={correctIndex}
                onChange={(e) => setCorrectIndex(Number(e.target.value))}
                className="mt-1.5 rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {parsedOptions.map((opt, idx) => (
                  <option key={idx} value={idx}>
                    {String.fromCharCode(65 + idx)}: {opt}
                  </option>
                ))}
              </select>
            </div>
            <input
              placeholder="Explanation shown after grading"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full rounded-xl bg-zinc-100/80 px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </form>
        </>
      )}
    </div>
  );
}
