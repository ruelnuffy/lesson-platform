import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-slate-500">Select Lesson</label>
          <select
            value={activeLessonId ?? ""}
            onChange={(e) => setSelectedLessonId(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                Day {l.day_number}: {l.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500">Pass Mark (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={passMark}
            onChange={(e) => setPassMark(e.target.value)}
            className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => updatePassMark.mutate()}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold"
        >
          Save Pass Mark
        </button>
      </div>

      {quiz && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-bold text-slate-900">
              Questions ({quiz.questions.length})
            </h2>
            {quiz.questions.length === 0 ? (
              <p className="text-sm text-slate-500">No questions yet.</p>
            ) : (
              quiz.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between gap-4">
                    <p className="font-semibold text-slate-900 text-sm">
                      {idx + 1}. {q.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteQuestion.mutate(q.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((opt, optIdx) => (
                      <li
                        key={optIdx}
                        className={
                          optIdx === q.correct_index
                            ? "font-semibold text-emerald-700"
                            : "text-slate-600"
                        }
                      >
                        {String.fromCharCode(65 + optIdx)}. {opt}{" "}
                        {optIdx === q.correct_index && "✓ (Correct)"}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && (
                    <p className="mt-2 text-xs text-slate-500">
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleAddQuestion}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h2 className="font-bold text-slate-900">Add Question</h2>
            <input
              required
              placeholder="Question text"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div>
              <label className="block text-xs font-semibold text-slate-500">
                Options (one per line)
              </label>
              <textarea
                rows={4}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500">
                Correct Answer
              </label>
              <select
                value={correctIndex}
                onChange={(e) => setCorrectIndex(Number(e.target.value))}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Add Question
            </button>
          </form>
        </>
      )}
    </div>
  );
}
