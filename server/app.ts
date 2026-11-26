import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import authRoutes from "./routes/auth.js";
import coursesRoutes from "./routes/courses.js";
import lessonsRoutes from "./routes/lessons.js";
import quizzesRoutes from "./routes/quizzes.js";
import paymentsRoutes from "./routes/payments.js";
import reviewsRoutes from "./routes/reviews.js";
import adminRoutes, { getUploadsDir } from "./routes/admin.js";
import cronRoutes from "./routes/cron.js";
import { getDb } from "./db.js";

export const app = new Hono();

app.get("/health", async (c) => {
  await getDb();
  return c.json({ status: "ok" });
});

app.route("/api/auth", authRoutes);
app.route("/api/courses", coursesRoutes);
app.route("/api/lessons", lessonsRoutes);
app.route("/api", quizzesRoutes);
app.route("/api/payments", paymentsRoutes);
app.route("/api/reviews", reviewsRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/cron", cronRoutes);

app.get("/uploads/:filename", (c) => {
  const filename = path.basename(c.req.param("filename"));
  const filePath = path.join(getUploadsDir(), filename);
  if (!fs.existsSync(filePath)) {
    return c.json({ detail: "File not found" }, 404);
  }
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
      ? "image/webp"
      : ext === ".mp4"
      ? "video/mp4"
      : ext === ".webm"
      ? "video/webm"
      : "application/octet-stream";
  return new Response(data, { headers: { "Content-Type": mime } });
});
