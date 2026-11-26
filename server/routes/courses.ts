import { Hono } from "hono";
import { queryAll, queryOne } from "../db.js";
import { todayInAppTz } from "../helpers.js";

const router = new Hono();

router.get("/", async (c) => {
  const rows = await queryAll<{
    id: number;
    title: string;
    description: string;
    price_kobo: number;
    image_url: string | null;
    is_active: number;
    total_lessons: number;
  }>(
    `SELECT c.id, c.title, c.description, c.price_kobo, c.image_url, c.is_active,
            COUNT(l.id) AS total_lessons
     FROM courses c
     LEFT JOIN lessons l ON l.course_id = c.id
     WHERE c.is_active = 1
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
      total_lessons: Number(r.total_lessons),
    }))
  );
});

router.get("/:id", async (c) => {
  const courseId = Number(c.req.param("id"));
  const course = await queryOne<{
    id: number;
    title: string;
    description: string;
    price_kobo: number;
    image_url: string | null;
    is_active: number;
  }>("SELECT id, title, description, price_kobo, image_url, is_active FROM courses WHERE id = ? AND is_active = 1", [
    courseId,
  ]);
  if (!course) {
    return c.json({ detail: "Course not found" }, 404);
  }

  const lessons = await queryAll<{
    id: number;
    day_number: number;
    title: string;
    release_date: string;
  }>(
    "SELECT id, day_number, title, release_date FROM lessons WHERE course_id = ? ORDER BY day_number ASC",
    [courseId]
  );

  const today = todayInAppTz();
  const syllabus = lessons.map((l) => ({
    id: Number(l.id),
    day_number: Number(l.day_number),
    title: l.title,
    release_date: l.release_date,
    is_released: l.release_date <= today,
  }));

  return c.json({
    id: Number(course.id),
    title: course.title,
    description: course.description,
    price_kobo: Number(course.price_kobo),
    image_url: course.image_url,
    is_active: Boolean(course.is_active),
    total_lessons: syllabus.length,
    syllabus,
  });
});

export default router;
