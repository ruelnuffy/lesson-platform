import { queryAll, queryOne } from "./db.js";

export function todayInAppTz(): string {
  const now = new Date();
  // Africa/Lagos is UTC+1
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  return lagos.toISOString().slice(0, 10);
}

export function nowUtcIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export async function getActivePaidCourseIds(userId: number): Promise<number[]> {
  const now = nowUtcIso();
  const rows = await queryAll<{ course_id: number }>(
    `SELECT DISTINCT course_id
     FROM enrollments
     WHERE user_id = ?
       AND status = 'paid'
       AND (expires_at IS NULL OR expires_at > ?)`,
    [userId, now]
  );
  return rows.map((r) => Number(r.course_id));
}

export async function hasActivePaidEnrollment(userId: number, courseId: number): Promise<boolean> {
  const now = nowUtcIso();
  const row = await queryOne<{ id: number }>(
    `SELECT id
     FROM enrollments
     WHERE user_id = ?
       AND course_id = ?
       AND status = 'paid'
       AND (expires_at IS NULL OR expires_at > ?)
     LIMIT 1`,
    [userId, courseId, now]
  );
  return row !== null;
}

export interface LessonRow {
  id: number;
  course_id: number;
  day_number: number;
  title: string;
  content_markdown: string;
  video_url: string | null;
  release_date: string;
}

export async function checkLessonAccess(
  userId: number,
  lesson: LessonRow
): Promise<{ status: 403; detail: Record<string, string> } | null> {
  const paid = await hasActivePaidEnrollment(userId, lesson.course_id);
  if (!paid) {
    return {
      status: 403,
      detail: {
        reason: "not_paid",
        message: "An active paid enrollment is required to access this lesson.",
      },
    };
  }
  const today = todayInAppTz();
  if (lesson.release_date > today) {
    return {
      status: 403,
      detail: {
        reason: "not_released_yet",
        message: "This lesson has not been released yet.",
        release_date: lesson.release_date,
      },
    };
  }
  return null;
}
