import { Hono } from "hono";
import { requireUser, type AuthUser } from "../auth.js";
import { queryAll, queryOne } from "../db.js";
import { checkLessonAccess, getActivePaidCourseIds, todayInAppTz, type LessonRow } from "../helpers.js";

const router = new Hono();

interface QuizSummary {
  quiz_id: number;
  pass_mark_percent: number;
  attempts_count: number;
  best_score_percent: number | null;
  latest_score_percent: number | null;
  passed: boolean;
}

async function buildQuizSummaries(userId: number, lessonIds: number[]): Promise<Map<number, QuizSummary>> {
  const map = new Map<number, QuizSummary>();
  if (lessonIds.length === 0) return map;

  const placeholders = lessonIds.map(() => "?").join(",");
  const quizzes = await queryAll<{ id: number; lesson_id: number; pass_mark_percent: number }>(
    `SELECT id, lesson_id, pass_mark_percent FROM quizzes WHERE lesson_id IN (${placeholders})`,
    lessonIds
  );
  if (quizzes.length === 0) return map;

  const quizIds = quizzes.map((q) => Number(q.id));
  const qPlaceholders = quizIds.map(() => "?").join(",");
  const attempts = await queryAll<{
    quiz_id: number;
    score_percent: number;
    passed: number;
  }>(
    `SELECT quiz_id, score_percent, passed
     FROM quiz_attempts
     WHERE user_id = ? AND quiz_id IN (${qPlaceholders})
     ORDER BY created_at ASC, id ASC`,
    [userId, ...quizIds]
  );

  const byQuiz = new Map<number, Array<{ score_percent: number; passed: boolean }>>();
  for (const a of attempts) {
    const qid = Number(a.quiz_id);
    const list = byQuiz.get(qid) ?? [];
    list.push({ score_percent: Number(a.score_percent), passed: Boolean(a.passed) });
    byQuiz.set(qid, list);
  }

  for (const q of quizzes) {
    const qAttempts = byQuiz.get(Number(q.id)) ?? [];
    map.set(Number(q.lesson_id), {
      quiz_id: Number(q.id),
      pass_mark_percent: Number(q.pass_mark_percent),
      attempts_count: qAttempts.length,
      best_score_percent: qAttempts.length ? Math.max(...qAttempts.map((a) => a.score_percent)) : null,
      latest_score_percent: qAttempts.length ? qAttempts[qAttempts.length - 1].score_percent : null,
      passed: qAttempts.some((a) => a.passed),
    });
  }

  return map;
}

router.get("/today", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const courseIds = await getActivePaidCourseIds(user.id);
  if (courseIds.length === 0) {
    return c.json(
      {
        detail: {
          reason: "not_paid",
          message: "An active paid enrollment is required to access lessons.",
        },
      },
      403
    );
  }

  const today = todayInAppTz();
  const placeholders = courseIds.map(() => "?").join(",");
  const allLessons = await queryAll<LessonRow>(
    `SELECT id, course_id, day_number, title, content_markdown, video_url, release_date
     FROM lessons
     WHERE course_id IN (${placeholders})
     ORDER BY release_date ASC, day_number ASC`,
    courseIds
  );

  const unlocked = allLessons.filter((l) => l.release_date <= today);
  const upcoming = allLessons.filter((l) => l.release_date > today);
  const todayLesson = unlocked.find((l) => l.release_date === today) ?? null;

  const summaries = await buildQuizSummaries(
    user.id,
    unlocked.map((l) => Number(l.id))
  );

  const orderedDesc = [...unlocked].sort((a, b) =>
    a.release_date !== b.release_date
      ? b.release_date.localeCompare(a.release_date)
      : Number(b.day_number) - Number(a.day_number)
  );
  let streak = 0;
  for (let i = 0; i < orderedDesc.length; i++) {
    const s = summaries.get(Number(orderedDesc[i].id));
    if (s?.passed) {
      streak += 1;
    } else if (i === 0 && orderedDesc[i].release_date === today) {
      continue;
    } else {
      break;
    }
  }

  const completedQuizzesCount = Array.from(summaries.values()).filter((s) => s.passed).length;

  return c.json({
    today,
    lesson: todayLesson
      ? {
          id: Number(todayLesson.id),
          course_id: Number(todayLesson.course_id),
          day_number: Number(todayLesson.day_number),
          title: todayLesson.title,
          content_markdown: todayLesson.content_markdown,
          video_url: todayLesson.video_url,
          release_date: todayLesson.release_date,
          has_quiz: summaries.has(Number(todayLesson.id)),
          quiz_summary: summaries.get(Number(todayLesson.id)) ?? null,
        }
      : null,
    past_lessons: unlocked.map((l) => ({
      id: Number(l.id),
      course_id: Number(l.course_id),
      day_number: Number(l.day_number),
      title: l.title,
      release_date: l.release_date,
      has_quiz: summaries.has(Number(l.id)),
      quiz_summary: summaries.get(Number(l.id)) ?? null,
    })),
    total_lessons: allLessons.length,
    unlocked_count: unlocked.length,
    completed_quizzes_count: completedQuizzesCount,
    streak,
    next_release_date: upcoming[0]?.release_date ?? null,
  });
});

router.get("/:id", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const lessonId = Number(c.req.param("id"));
  const lesson = await queryOne<LessonRow>(
    "SELECT id, course_id, day_number, title, content_markdown, video_url, release_date FROM lessons WHERE id = ?",
    [lessonId]
  );
  if (!lesson) {
    return c.json({ detail: "Lesson not found" }, 404);
  }

  const accessError = await checkLessonAccess(user.id, lesson);
  if (accessError) {
    return c.json({ detail: accessError.detail }, accessError.status);
  }

  const summaries = await buildQuizSummaries(user.id, [Number(lesson.id)]);
  return c.json({
    id: Number(lesson.id),
    course_id: Number(lesson.course_id),
    day_number: Number(lesson.day_number),
    title: lesson.title,
    content_markdown: lesson.content_markdown,
    video_url: lesson.video_url,
    release_date: lesson.release_date,
    has_quiz: summaries.has(Number(lesson.id)),
    quiz_summary: summaries.get(Number(lesson.id)) ?? null,
  });
});

export default router;
