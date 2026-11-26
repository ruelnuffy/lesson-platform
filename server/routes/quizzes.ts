import { Hono } from "hono";
import { requireUser, type AuthUser } from "../auth.js";
import { execute, queryAll, queryOne } from "../db.js";
import { checkLessonAccess, type LessonRow } from "../helpers.js";

const router = new Hono();

interface QuestionRow {
  id: number;
  quiz_id: number;
  text: string;
  options_json: string;
  correct_index: number;
  explanation: string;
  order: number;
}

router.get("/lessons/:lessonId/quiz", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const lessonId = Number(c.req.param("lessonId"));

  const lesson = await queryOne<LessonRow>(
    "SELECT id, course_id, day_number, title, content_markdown, video_url, release_date FROM lessons WHERE id = ?",
    [lessonId]
  );
  if (!lesson) return c.json({ detail: "Lesson not found" }, 404);

  const accessError = await checkLessonAccess(user.id, lesson);
  if (accessError) return c.json({ detail: accessError.detail }, accessError.status);

  const quiz = await queryOne<{ id: number; pass_mark_percent: number }>(
    "SELECT id, pass_mark_percent FROM quizzes WHERE lesson_id = ?",
    [lessonId]
  );
  if (!quiz) return c.json({ detail: "No quiz available for this lesson" }, 404);

  const questions = await queryAll<QuestionRow>(
    'SELECT id, text, options_json, "order" FROM questions WHERE quiz_id = ? ORDER BY "order" ASC, id ASC',
    [quiz.id]
  );

  const attempts = await queryAll<{ score_percent: number; passed: number }>(
    "SELECT score_percent, passed FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? ORDER BY created_at ASC, id ASC",
    [user.id, quiz.id]
  );

  return c.json({
    id: Number(quiz.id),
    lesson_id: Number(lesson.id),
    lesson_title: lesson.title,
    day_number: Number(lesson.day_number),
    pass_mark_percent: Number(quiz.pass_mark_percent),
    questions: questions.map((q) => ({
      id: Number(q.id),
      text: q.text,
      options: JSON.parse(q.options_json) as string[],
      order: Number(q.order),
    })),
    attempts_count: attempts.length,
    best_score_percent: attempts.length ? Math.max(...attempts.map((a) => Number(a.score_percent))) : null,
    latest_score_percent: attempts.length ? Number(attempts[attempts.length - 1].score_percent) : null,
    passed: attempts.some((a) => Boolean(a.passed)),
  });
});

router.post("/quizzes/:quizId/submit", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const quizId = Number(c.req.param("quizId"));
  const body = await c.req.json().catch(() => ({}));
  const answers: Record<string, number | null> = body.answers ?? {};

  const quiz = await queryOne<{ id: number; lesson_id: number; pass_mark_percent: number }>(
    "SELECT id, lesson_id, pass_mark_percent FROM quizzes WHERE id = ?",
    [quizId]
  );
  if (!quiz) return c.json({ detail: "Quiz not found" }, 404);

  const lesson = await queryOne<LessonRow>(
    "SELECT id, course_id, day_number, title, content_markdown, video_url, release_date FROM lessons WHERE id = ?",
    [quiz.lesson_id]
  );
  if (!lesson) return c.json({ detail: "Lesson not found" }, 404);

  const accessError = await checkLessonAccess(user.id, lesson);
  if (accessError) return c.json({ detail: accessError.detail }, accessError.status);

  const questions = await queryAll<QuestionRow>(
    'SELECT id, text, options_json, correct_index, explanation, "order" FROM questions WHERE quiz_id = ? ORDER BY "order" ASC, id ASC',
    [quizId]
  );
  if (questions.length === 0) {
    return c.json({ detail: "This quiz has no questions yet" }, 400);
  }

  let correctCount = 0;
  const normalizedAnswers: Record<string, number | null> = {};
  const results = [];

  for (const q of questions) {
    const options = JSON.parse(q.options_json) as string[];
    const selected = answers[String(q.id)] ?? null;
    if (selected !== null && (selected < 0 || selected >= options.length)) {
      return c.json({ detail: `Invalid option index for question ${q.id}` }, 422);
    }
    const isCorrect = selected !== null && selected === Number(q.correct_index);
    if (isCorrect) correctCount += 1;
    normalizedAnswers[String(q.id)] = selected;
    results.push({
      question_id: Number(q.id),
      selected_index: selected,
      is_correct: isCorrect,
      explanation: q.explanation,
    });
  }

  const scorePercent = Math.round((correctCount / questions.length) * 10000) / 100;
  const passed = scorePercent >= Number(quiz.pass_mark_percent);

  const { lastInsertRowid } = await execute(
    "INSERT INTO quiz_attempts (user_id, quiz_id, score_percent, answers_json, passed) VALUES (?, ?, ?, ?, ?)",
    [user.id, quiz.id, scorePercent, JSON.stringify(normalizedAnswers), passed ? 1 : 0]
  );

  const allAttempts = await queryAll<{ score_percent: number }>(
    "SELECT score_percent FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? ORDER BY created_at ASC, id ASC",
    [user.id, quiz.id]
  );

  return c.json({
    attempt_id: lastInsertRowid,
    quiz_id: Number(quiz.id),
    score_percent: scorePercent,
    passed,
    pass_mark_percent: Number(quiz.pass_mark_percent),
    correct_count: correctCount,
    total_questions: questions.length,
    best_score_percent: Math.max(...allAttempts.map((a) => Number(a.score_percent))),
    latest_score_percent: Number(allAttempts[allAttempts.length - 1].score_percent),
    attempts_count: allAttempts.length,
    results,
  });
});

router.get("/scores", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const rows = await queryAll<{
    attempt_id: number;
    quiz_id: number;
    score_percent: number;
    passed: number;
    created_at: string;
    pass_mark_percent: number;
    lesson_id: number;
    lesson_title: string;
    day_number: number;
  }>(
    `SELECT qa.id AS attempt_id, qa.quiz_id, qa.score_percent, qa.passed, qa.created_at,
            q.pass_mark_percent, l.id AS lesson_id, l.title AS lesson_title, l.day_number
     FROM quiz_attempts qa
     JOIN quizzes q ON q.id = qa.quiz_id
     JOIN lessons l ON l.id = q.lesson_id
     WHERE qa.user_id = ?
     ORDER BY qa.created_at DESC, qa.id DESC`,
    [user.id]
  );

  const attempts = rows.map((r) => ({
    attempt_id: Number(r.attempt_id),
    quiz_id: Number(r.quiz_id),
    lesson_id: Number(r.lesson_id),
    lesson_title: r.lesson_title,
    day_number: Number(r.day_number),
    score_percent: Number(r.score_percent),
    passed: Boolean(r.passed),
    created_at: r.created_at,
  }));

  const grouped = new Map<number, typeof rows>();
  for (const r of rows) {
    const qid = Number(r.quiz_id);
    const arr = grouped.get(qid) ?? [];
    arr.push(r);
    grouped.set(qid, arr);
  }

  const byLesson = Array.from(grouped.entries()).map(([quizId, list]) => {
    const first = list[0];
    return {
      lesson_id: Number(first.lesson_id),
      lesson_title: first.lesson_title,
      day_number: Number(first.day_number),
      quiz_id: quizId,
      pass_mark_percent: Number(first.pass_mark_percent),
      attempts_count: list.length,
      best_score_percent: Math.max(...list.map((x) => Number(x.score_percent))),
      latest_score_percent: Number(first.score_percent),
      passed: list.some((x) => Boolean(x.passed)),
    };
  });
  byLesson.sort((a, b) => a.day_number - b.day_number);

  const avgBest = byLesson.length
    ? Math.round((byLesson.reduce((acc, x) => acc + x.best_score_percent, 0) / byLesson.length) * 100) / 100
    : null;

  return c.json({
    average_best_score: avgBest,
    total_attempts: attempts.length,
    quizzes_passed: byLesson.filter((x) => x.passed).length,
    by_lesson: byLesson,
    attempts,
  });
});

export default router;
