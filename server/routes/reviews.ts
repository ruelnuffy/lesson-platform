import { Hono } from "hono";
import { requireUser, type AuthUser } from "../auth.js";
import { execute, queryAll, queryOne } from "../db.js";

const router = new Hono();

router.get("/", async (c) => {
  const rows = await queryAll<{
    id: number;
    user_name: string;
    role_label: string;
    rating: number;
    comment: string;
    created_at: string;
  }>(
    `SELECT r.id, u.name AS user_name, r.role_label, r.rating, r.comment, r.created_at
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT 30`
  );
  return c.json(
    rows.map((r) => ({
      id: Number(r.id),
      user_name: r.user_name,
      role_label: r.role_label,
      rating: Number(r.rating),
      comment: r.comment,
      created_at: r.created_at,
    }))
  );
});

router.post("/", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const body = await c.req.json().catch(() => ({}));
  const rating = Number(body.rating);
  const roleLabel = String(body.role_label ?? "").trim().slice(0, 120);
  const comment = String(body.comment ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return c.json({ detail: "Rating must be between 1 and 5" }, 422);
  }
  if (comment.length < 5 || comment.length > 600) {
    return c.json({ detail: "Comment must be between 5 and 600 characters" }, 422);
  }

  const { lastInsertRowid } = await execute(
    "INSERT INTO reviews (user_id, rating, role_label, comment) VALUES (?, ?, ?, ?)",
    [user.id, rating, roleLabel, comment]
  );

  const created = await queryOne<{ created_at: string }>(
    "SELECT created_at FROM reviews WHERE id = ?",
    [lastInsertRowid]
  );

  return c.json(
    {
      id: lastInsertRowid,
      user_name: user.name,
      role_label: roleLabel,
      rating,
      comment,
      created_at: created?.created_at ?? new Date().toISOString(),
    },
    201
  );
});

export default router;
