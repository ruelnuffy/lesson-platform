import { Hono } from "hono";
import { queryAll, execute } from "../db.js";
import { nowUtcIso, todayInAppTz } from "../helpers.js";

const router = new Hono();

export async function dispatchDailyEmails(targetDate?: string) {
  const dateStr = targetDate || todayInAppTz();
  const lessons = await queryAll<{ id: number; course_id: number; title: string }>(
    "SELECT id, course_id, title FROM lessons WHERE release_date = ?",
    [dateStr]
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const now = nowUtcIso();

  for (const lesson of lessons) {
    const enrolledUsers = await queryAll<{ user_id: number; email: string }>(
      `SELECT DISTINCT e.user_id, u.email
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       WHERE e.course_id = ? AND e.status = 'paid' AND (e.expires_at IS NULL OR e.expires_at > ?)`,
      [lesson.course_id, now]
    );

    for (const u of enrolledUsers) {
      const existing = await queryAll<{ id: number; status: string }>(
        "SELECT id, status FROM email_log WHERE user_id = ? AND lesson_id = ? AND type = 'daily_lesson'",
        [u.user_id, lesson.id]
      );
      if (existing.length > 0 && existing[0].status === "sent") {
        skipped += 1;
        continue;
      }

      try {
        if (existing.length === 0) {
          await execute(
            "INSERT INTO email_log (user_id, lesson_id, type, sent_at, status) VALUES (?, ?, 'daily_lesson', ?, 'sent')",
            [u.user_id, lesson.id, now]
          );
        } else {
          await execute("UPDATE email_log SET status = 'sent', sent_at = ?, error = NULL WHERE id = ?", [
            now,
            existing[0].id,
          ]);
        }
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error("Email log failed:", err);
      }
    }
  }

  return { target_date: dateStr, sent, skipped, failed };
}

router.all("/daily-emails", async (c) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = c.req.header("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return c.json({ detail: "Invalid cron secret" }, 401);
    }
  }
  const result = await dispatchDailyEmails();
  return c.json(result);
});

export default router;
