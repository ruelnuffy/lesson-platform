import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { requireAdmin } from "../auth.js";
import { execute, queryAll, queryOne } from "../db.js";
import { nowUtcIso, todayInAppTz } from "../helpers.js";
import { dispatchDailyEmails } from "./cron.js";

const router = new Hono();

export function getUploadsDir(): string {
  if (process.env.VERCEL) {
    return "/tmp/uploads";
  }
  const cwd = process.cwd();
  const base = path.basename(cwd) === "frontend" ? path.resolve(cwd, "..") : cwd;
  return path.join(base, "data", "uploads");
}

router.use("*", requireAdmin);

router.post("/upload", async (c) => {
  const formData = await c.req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ detail: "No file uploaded" }, 400);
  }

  const ext = path.extname(file.name) || ".bin";
  const filename = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;
  const uploadsDir = getUploadsDir();
  fs.mkdirSync(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  return c.json({
    url: `/uploads/${filename}`,
    filename,
    content_type: file.type || "application/octet-stream",
  });
});

router.get("/overview", async (c) => {
  const now = nowUtcIso();
  const today = todayInAppTz();

  const totalUsersRow = await queryOne<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM users");
  const paidUsersRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(DISTINCT user_id) AS cnt
     FROM enrollments
     WHERE status = 'paid' AND (expires_at IS NULL OR expires_at > ?)`,
    [now]
  );
  const revenueRow = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(c.price_kobo), 0) AS total
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.status = 'paid'`
  );
  const sentTodayRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(el.id) AS cnt
     FROM email_log el
     JOIN lessons l ON l.id = el.lesson_id
     WHERE el.status = 'sent' AND l.release_date = ?`,
    [today]
  );
  const avgScoreRow = await queryOne<{ avg_score: number | null }>(
    "SELECT AVG(score_percent) AS avg_score FROM quiz_attempts"
  );

  return c.json({
    total_users: Number(totalUsersRow?.cnt ?? 0),
    paid_users: Number(paidUsersRow?.cnt ?? 0),
    revenue_kobo: Number(revenueRow?.total ?? 0),
    lessons_sent_today: Number(sentTodayRow?.cnt ?? 0),
    average_quiz_score:
      avgScoreRow?.avg_score !== null && avgScoreRow?.avg_score !== undefined
        ? Math.round(Number(avgScoreRow.avg_score) * 100) / 100
        : null,
  });
});

router.get("/users", async (c) => {
  const q = c.req.query("q")?.trim();
  const now = nowUtcIso();
  const users = q
    ? await queryAll<{
        id: number;
        name: string;
        email: string;
        role: string;
        created_at: string;
      }>(
        "SELECT id, name, email, role, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC",
        [`%${q}%`, `%${q}%`]
      )
    : await queryAll<{
        id: number;
        name: string;
        email: string;
        role: string;
        created_at: string;
      }>("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");

  const enrollments = await queryAll<{
    user_id: number;
    course_id: number;
    status: string;
    expires_at: string | null;
  }>("SELECT user_id, course_id, status, expires_at FROM enrollments WHERE status = 'paid'");

  const activeByUser = new Map<number, Set<number>>();
  for (const e of enrollments) {
    if (!e.expires_at || e.expires_at > now) {
      const uid = Number(e.user_id);
      const set = activeByUser.get(uid) ?? new Set<number>();
      set.add(Number(e.course_id));
      activeByUser.set(uid, set);
    }
  }

  return c.json(
    users.map((u) => {
      const activeCourses = Array.from(activeByUser.get(Number(u.id)) ?? []).sort((a, b) => a - b);
      return {
        id: Number(u.id),
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        is_paid: activeCourses.length > 0,
        active_course_ids: activeCourses,
      };
    })
  );
});

router.post("/users/:userId/grant", async (c) => {
  const userId = Number(c.req.param("userId"));
  const body = await c.req.json().catch(() => ({}));
  const courseId = Number(body.course_id);
  const expiresAt = body.expires_at ? String(body.expires_at) : null;

  const user = await queryOne("SELECT id FROM users WHERE id = ?", [userId]);
  if (!user) return c.json({ detail: "User not found" }, 404);
  const course = await queryOne("SELECT id FROM courses WHERE id = ?", [courseId]);
  if (!course) return c.json({ detail: "Course not found" }, 404);

  const ref = `manual_${userId}_${courseId}_${crypto.randomBytes(5).toString("hex")}`;
  const { lastInsertRowid } = await execute(
    "INSERT INTO enrollments (user_id, course_id, status, paid_at, expires_at, paystack_reference) VALUES (?, ?, 'paid', ?, ?, ?)",
    [userId, courseId, nowUtcIso(), expiresAt, ref]
  );

  return c.json({ status: "granted", enrollment_id: lastInsertRowid });
});

router.post("/users/:userId/revoke", async (c) => {
  const userId = Number(c.req.param("userId"));
  const body = await c.req.json().catch(() => ({}));
  const courseId = body.course_id ? Number(body.course_id) : null;

  if (courseId) {
    await execute(
      "UPDATE enrollments SET status = 'expired' WHERE user_id = ? AND course_id = ? AND status = 'paid'",
      [userId, courseId]
    );
  } else {
    await execute("UPDATE enrollments SET status = 'expired' WHERE user_id = ? AND status = 'paid'", [
      userId,
    ]);
  }
  return c.json({ status: "revoked" });
});

router.get("/users/:userId/scores", async (c) => {
  const userId = Number(c.req.param("userId"));
  const rows = await queryAll<{
    attempt_id: number;
    quiz_id: number;
    lesson_id: number;
    lesson_title: string;
    day_number: number;
    score_percent: number;
    passed: number;
    created_at: string;
  }>(
    `SELECT qa.id AS attempt_id, qa.quiz_id, l.id AS lesson_id, l.title AS lesson_title,
            l.day_number, qa.score_percent, qa.passed, qa.created_at
     FROM quiz_attempts qa
     JOIN quizzes q ON q.id = qa.quiz_id
     JOIN lessons l ON l.id = q.lesson_id
     WHERE qa.user_id = ?
     ORDER BY qa.created_at DESC, qa.id DESC`,
    [userId]
  );

  return c.json(
    rows.map((r) => ({
      attempt_id: Number(r.attempt_id),
      quiz_id: Number(r.quiz_id),
      lesson_id: Number(r.lesson_id),
      lesson_title: r.lesson_title,
      day_number: Number(r.day_number),
      score_percent: Number(r.score_percent),
      passed: Boolean(r.passed),
      created_at: r.created_at,
    }))
  );
});

router.get("/courses", async (c) => {
  const rows = await queryAll<{
    id: number;
    title: string;
    description: string;
    price_kobo: number;
    image_url: string | null;
    is_active: number;
    lesson_count: number;
  }>(
    `SELECT c.id, c.title, c.description, c.price_kobo, c.image_url, c.is_active,
            COUNT(l.id) AS lesson_count
     FROM courses c
     LEFT JOIN lessons l ON l.course_id = c.id
     GROUP BY c.id
     ORDER BY c.id ASC`
  );
  return c.json(
    rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      description: r.description,
      price_kobo: Number(r.price_kobo),
      image_url: r.image_url,
      is_active: Boolean(r.is_active),
      lesson_count: Number(r.lesson_count),
    }))
  );
});

router.post("/courses", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) return c.json({ detail: "Course title is required" }, 422);
  const description = String(body.description ?? "");
  const priceKobo = Number(body.price_kobo ?? 0);
  const imageUrl = body.image_url ? String(body.image_url) : null;
  const isActive = body.is_active === false ? 0 : 1;

  const { lastInsertRowid } = await execute(
    "INSERT INTO courses (title, description, price_kobo, image_url, is_active) VALUES (?, ?, ?, ?, ?)",
    [title, description, priceKobo, imageUrl, isActive]
  );

  return c.json(
    {
      id: lastInsertRowid,
      title,
      description,
      price_kobo: priceKobo,
      image_url: imageUrl,
      is_active: Boolean(isActive),
      lesson_count: 0,
    },
    201
  );
});

router.put("/courses/:courseId", async (c) => {
  const courseId = Number(c.req.param("courseId"));
  const existing = await queryOne<{
    id: number;
    title: string;
    description: string;
    price_kobo: number;
    image_url: string | null;
    is_active: number;
  }>("SELECT * FROM courses WHERE id = ?", [courseId]);
  if (!existing) return c.json({ detail: "Course not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const title = body.title !== undefined ? String(body.title) : existing.title;
  const description = body.description !== undefined ? String(body.description) : existing.description;
  const priceKobo = body.price_kobo !== undefined ? Number(body.price_kobo) : Number(existing.price_kobo);
  const imageUrl = body.image_url !== undefined ? (body.image_url ? String(body.image_url) : null) : existing.image_url;
  const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : Number(existing.is_active);

  await execute(
    "UPDATE courses SET title = ?, description = ?, price_kobo = ?, image_url = ?, is_active = ? WHERE id = ?",
    [title, description, priceKobo, imageUrl, isActive, courseId]
  );

  const cntRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM lessons WHERE course_id = ?",
    [courseId]
  );
  return c.json({
    id: courseId,
    title,
    description,
    price_kobo: priceKobo,
    image_url: imageUrl,
    is_active: Boolean(isActive),
    lesson_count: Number(cntRow?.cnt ?? 0),
  });
});

router.delete("/courses/:courseId", async (c) => {
  const courseId = Number(c.req.param("courseId"));
  const existing = await queryOne("SELECT id FROM courses WHERE id = ?", [courseId]);
  if (!existing) return c.json({ detail: "Course not found" }, 404);
  await execute("DELETE FROM courses WHERE id = ?", [courseId]);
  return c.body(null, 204);
});

router.get("/lessons", async (c) => {
  const courseIdParam = c.req.query("course_id");
  const rows = courseIdParam
    ? await queryAll(
        "SELECT id, course_id, day_number, title, content_markdown, video_url, release_date FROM lessons WHERE course_id = ? ORDER BY course_id ASC, day_number ASC",
        [Number(courseIdParam)]
      )
    : await queryAll(
        "SELECT id, course_id, day_number, title, content_markdown, video_url, release_date FROM lessons ORDER BY course_id ASC, day_number ASC"
      );
  return c.json(rows);
});

router.post("/lessons", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const courseId = Number(body.course_id);
  const dayNumber = Number(body.day_number);
  const title = String(body.title ?? "").trim();
  const contentMarkdown = String(body.content_markdown ?? "");
  const videoUrl = body.video_url ? String(body.video_url) : null;
  const releaseDate = String(body.release_date ?? todayInAppTz());

  const course = await queryOne("SELECT id FROM courses WHERE id = ?", [courseId]);
  if (!course) return c.json({ detail: "Course not found" }, 404);

  try {
    const { lastInsertRowid } = await execute(
      "INSERT INTO lessons (course_id, day_number, title, content_markdown, video_url, release_date) VALUES (?, ?, ?, ?, ?, ?)",
      [courseId, dayNumber, title, contentMarkdown, videoUrl, releaseDate]
    );
    const created = await queryOne("SELECT * FROM lessons WHERE id = ?", [lastInsertRowid]);
    return c.json(created, 201);
  } catch {
    return c.json({ detail: "A lesson with this day_number already exists for this course" }, 409);
  }
});

router.put("/lessons/:lessonId", async (c) => {
  const lessonId = Number(c.req.param("lessonId"));
  const existing = await queryOne<{
    id: number;
    course_id: number;
    day_number: number;
    title: string;
    content_markdown: string;
    video_url: string | null;
    release_date: string;
  }>("SELECT * FROM lessons WHERE id = ?", [lessonId]);
  if (!existing) return c.json({ detail: "Lesson not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const dayNumber = body.day_number !== undefined ? Number(body.day_number) : Number(existing.day_number);
  const title = body.title !== undefined ? String(body.title) : existing.title;
  const contentMarkdown =
    body.content_markdown !== undefined ? String(body.content_markdown) : existing.content_markdown;
  const videoUrl =
    body.video_url !== undefined ? (body.video_url ? String(body.video_url) : null) : existing.video_url;
  const releaseDate = body.release_date !== undefined ? String(body.release_date) : existing.release_date;

  try {
    await execute(
      "UPDATE lessons SET day_number = ?, title = ?, content_markdown = ?, video_url = ?, release_date = ? WHERE id = ?",
      [dayNumber, title, contentMarkdown, videoUrl, releaseDate, lessonId]
    );
    const updated = await queryOne("SELECT * FROM lessons WHERE id = ?", [lessonId]);
    return c.json(updated);
  } catch {
    return c.json({ detail: "A lesson with this day_number already exists for this course" }, 409);
  }
});

router.delete("/lessons/:lessonId", async (c) => {
  const lessonId = Number(c.req.param("lessonId"));
  const existing = await queryOne("SELECT id FROM lessons WHERE id = ?", [lessonId]);
  if (!existing) return c.json({ detail: "Lesson not found" }, 404);
  await execute("DELETE FROM lessons WHERE id = ?", [lessonId]);
  return c.body(null, 204);
});

router.post("/courses/:courseId/lessons/bulk", async (c) => {
  const courseId = Number(c.req.param("courseId"));
  const course = await queryOne("SELECT id FROM courses WHERE id = ?", [courseId]);
  if (!course) return c.json({ detail: "Course not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const items = Array.isArray(body.lessons) ? body.lessons : [];
  const created = [];

  for (const item of items) {
    const dayNumber = Number(item.day_number);
    const title = String(item.title ?? "").trim();
    const contentMarkdown = String(item.content_markdown ?? "");
    const videoUrl = item.video_url ? String(item.video_url) : null;
    const releaseDate = String(item.release_date ?? todayInAppTz());
    const { lastInsertRowid } = await execute(
      "INSERT INTO lessons (course_id, day_number, title, content_markdown, video_url, release_date) VALUES (?, ?, ?, ?, ?, ?)",
      [courseId, dayNumber, title, contentMarkdown, videoUrl, releaseDate]
    );
    const row = await queryOne("SELECT * FROM lessons WHERE id = ?", [lastInsertRowid]);
    if (row) created.push(row);
  }

  return c.json(created, 201);
});

router.get("/lessons/:lessonId/quiz", async (c) => {
  const lessonId = Number(c.req.param("lessonId"));
  const lesson = await queryOne("SELECT id FROM lessons WHERE id = ?", [lessonId]);
  if (!lesson) return c.json({ detail: "Lesson not found" }, 404);

  let quiz = await queryOne<{ id: number; lesson_id: number; pass_mark_percent: number }>(
    "SELECT id, lesson_id, pass_mark_percent FROM quizzes WHERE lesson_id = ?",
    [lessonId]
  );
  if (!quiz) {
    const { lastInsertRowid } = await execute(
      "INSERT INTO quizzes (lesson_id, pass_mark_percent) VALUES (?, 70)",
      [lessonId]
    );
    quiz = { id: lastInsertRowid, lesson_id: lessonId, pass_mark_percent: 70 };
  }

  const questions = await queryAll<{
    id: number;
    quiz_id: number;
    text: string;
    options_json: string;
    correct_index: number;
    explanation: string;
    order: number;
  }>('SELECT * FROM questions WHERE quiz_id = ? ORDER BY "order" ASC, id ASC', [quiz.id]);

  return c.json({
    id: Number(quiz.id),
    lesson_id: Number(quiz.lesson_id),
    pass_mark_percent: Number(quiz.pass_mark_percent),
    questions: questions.map((q) => ({
      id: Number(q.id),
      quiz_id: Number(q.quiz_id),
      text: q.text,
      options: JSON.parse(q.options_json) as string[],
      correct_index: Number(q.correct_index),
      explanation: q.explanation,
      order: Number(q.order),
    })),
  });
});

router.put("/lessons/:lessonId/quiz", async (c) => {
  const lessonId = Number(c.req.param("lessonId"));
  const lesson = await queryOne("SELECT id FROM lessons WHERE id = ?", [lessonId]);
  if (!lesson) return c.json({ detail: "Lesson not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const passMark = Number(body.pass_mark_percent ?? 70);

  let quiz = await queryOne<{ id: number; lesson_id: number; pass_mark_percent: number }>(
    "SELECT id, lesson_id, pass_mark_percent FROM quizzes WHERE lesson_id = ?",
    [lessonId]
  );
  if (!quiz) {
    const { lastInsertRowid } = await execute(
      "INSERT INTO quizzes (lesson_id, pass_mark_percent) VALUES (?, ?)",
      [lessonId, passMark]
    );
    quiz = { id: lastInsertRowid, lesson_id: lessonId, pass_mark_percent: passMark };
  } else {
    await execute("UPDATE quizzes SET pass_mark_percent = ? WHERE id = ?", [passMark, quiz.id]);
    quiz.pass_mark_percent = passMark;
  }

  const questions = await queryAll<{
    id: number;
    quiz_id: number;
    text: string;
    options_json: string;
    correct_index: number;
    explanation: string;
    order: number;
  }>('SELECT * FROM questions WHERE quiz_id = ? ORDER BY "order" ASC, id ASC', [quiz.id]);

  return c.json({
    id: Number(quiz.id),
    lesson_id: Number(quiz.lesson_id),
    pass_mark_percent: Number(quiz.pass_mark_percent),
    questions: questions.map((q) => ({
      id: Number(q.id),
      quiz_id: Number(q.quiz_id),
      text: q.text,
      options: JSON.parse(q.options_json) as string[],
      correct_index: Number(q.correct_index),
      explanation: q.explanation,
      order: Number(q.order),
    })),
  });
});

router.post("/quizzes/:quizId/questions", async (c) => {
  const quizId = Number(c.req.param("quizId"));
  const quiz = await queryOne("SELECT id FROM quizzes WHERE id = ?", [quizId]);
  if (!quiz) return c.json({ detail: "Quiz not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  const options = Array.isArray(body.options) ? body.options.map(String) : [];
  const correctIndex = Number(body.correct_index ?? 0);
  const explanation = String(body.explanation ?? "");
  const order = Number(body.order ?? 0);

  if (correctIndex < 0 || correctIndex >= options.length) {
    return c.json({ detail: "correct_index out of range for options" }, 422);
  }

  const { lastInsertRowid } = await execute(
    'INSERT INTO questions (quiz_id, text, options_json, correct_index, explanation, "order") VALUES (?, ?, ?, ?, ?, ?)',
    [quizId, text, JSON.stringify(options), correctIndex, explanation, order]
  );

  return c.json(
    {
      id: lastInsertRowid,
      quiz_id: quizId,
      text,
      options,
      correct_index: correctIndex,
      explanation,
      order,
    },
    201
  );
});

router.delete("/questions/:questionId", async (c) => {
  const questionId = Number(c.req.param("questionId"));
  const existing = await queryOne("SELECT id FROM questions WHERE id = ?", [questionId]);
  if (!existing) return c.json({ detail: "Question not found" }, 404);
  await execute("DELETE FROM questions WHERE id = ?", [questionId]);
  return c.body(null, 204);
});

router.get("/payments", async (c) => {
  const rows = await queryAll(
    `SELECT e.id, e.user_id, u.name AS user_name, u.email AS user_email,
            e.course_id, c.title AS course_title, c.price_kobo AS amount_kobo,
            e.status, e.paystack_reference, e.paid_at, e.expires_at, e.created_at
     FROM enrollments e
     JOIN users u ON u.id = e.user_id
     JOIN courses c ON c.id = e.course_id
     ORDER BY e.created_at DESC, e.id DESC`
  );
  return c.json(rows);
});

router.get("/emails", async (c) => {
  const rows = await queryAll(
    `SELECT el.id, el.user_id, u.email AS user_email, el.lesson_id,
            l.title AS lesson_title, l.day_number, el.type, el.status, el.sent_at, el.error
     FROM email_log el
     JOIN users u ON u.id = el.user_id
     JOIN lessons l ON l.id = el.lesson_id
     ORDER BY el.id DESC
     LIMIT 200`
  );
  return c.json(rows);
});

router.post("/emails/resend", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const targetDate = body.target_date ? String(body.target_date) : undefined;
  const result = await dispatchDailyEmails(targetDate);
  return c.json(result);
});

router.get("/scores", async (c) => {
  const rows = await queryAll<{
    attempt_id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    lesson_id: number;
    lesson_title: string;
    day_number: number;
    quiz_id: number;
    score_percent: number;
    passed: number;
    created_at: string;
  }>(
    `SELECT qa.id AS attempt_id, qa.user_id, u.name AS user_name, u.email AS user_email,
            l.id AS lesson_id, l.title AS lesson_title, l.day_number, qa.quiz_id,
            qa.score_percent, qa.passed, qa.created_at
     FROM quiz_attempts qa
     JOIN users u ON u.id = qa.user_id
     JOIN quizzes q ON q.id = qa.quiz_id
     JOIN lessons l ON l.id = q.lesson_id
     ORDER BY qa.created_at DESC, qa.id DESC`
  );

  const byLessonMap = new Map<number, typeof rows>();
  for (const r of rows) {
    const lid = Number(r.lesson_id);
    const list = byLessonMap.get(lid) ?? [];
    list.push(r);
    byLessonMap.set(lid, list);
  }

  const byLesson = Array.from(byLessonMap.entries()).map(([lessonId, list]) => {
    const avg = list.reduce((acc, x) => acc + Number(x.score_percent), 0) / list.length;
    const passRate = (list.filter((x) => Boolean(x.passed)).length / list.length) * 100;
    return {
      lesson_id: lessonId,
      lesson_title: list[0].lesson_title,
      day_number: Number(list[0].day_number),
      attempts_count: list.length,
      average_score: Math.round(avg * 100) / 100,
      pass_rate: Math.round(passRate * 100) / 100,
    };
  });
  byLesson.sort((a, b) => a.day_number - b.day_number);

  return c.json({
    by_lesson: byLesson,
    attempts: rows.map((r) => ({
      ...r,
      attempt_id: Number(r.attempt_id),
      user_id: Number(r.user_id),
      lesson_id: Number(r.lesson_id),
      day_number: Number(r.day_number),
      quiz_id: Number(r.quiz_id),
      score_percent: Number(r.score_percent),
      passed: Boolean(r.passed),
    })),
  });
});

router.get("/scores/export.csv", async (c) => {
  const rows = await queryAll<{
    attempt_id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    day_number: number;
    lesson_title: string;
    score_percent: number;
    passed: number;
    created_at: string;
  }>(
    `SELECT qa.id AS attempt_id, qa.user_id, u.name AS user_name, u.email AS user_email,
            l.day_number, l.title AS lesson_title, qa.score_percent, qa.passed, qa.created_at
     FROM quiz_attempts qa
     JOIN users u ON u.id = qa.user_id
     JOIN quizzes q ON q.id = qa.quiz_id
     JOIN lessons l ON l.id = q.lesson_id
     ORDER BY qa.created_at DESC, qa.id DESC`
  );

  const lines = [
    "attempt_id,user_id,user_name,user_email,day_number,lesson_title,score_percent,passed,created_at",
    ...rows.map((r) =>
      [
        r.attempt_id,
        r.user_id,
        JSON.stringify(r.user_name),
        JSON.stringify(r.user_email),
        r.day_number,
        JSON.stringify(r.lesson_title),
        r.score_percent,
        Boolean(r.passed),
        r.created_at,
      ].join(",")
    ),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="quiz_scores.csv"',
    },
  });
});

export default router;
