import { Hono } from "hono";
import {
  clearAuthCookie,
  getOptionalUser,
  hashPassword,
  requireUser,
  setAuthCookie,
  signToken,
  verifyPassword,
  verifyToken,
  type AuthUser,
} from "../auth.js";
import { execute, queryOne } from "../db.js";

const router = new Hono();

router.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name || !email || password.length < 6) {
    return c.json({ detail: "Name, valid email, and password (min 6 chars) are required" }, 422);
  }

  const existing = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    return c.json({ detail: "Email is already registered" }, 409);
  }

  const { lastInsertRowid } = await execute(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
    [name, email, hashPassword(password)]
  );

  const user = await queryOne<AuthUser>(
    "SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?",
    [lastInsertRowid]
  );
  if (!user) return c.json({ detail: "Failed to create user" }, 500);

  setAuthCookie(c, user.id);
  return c.json(user, 201);
});

router.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const row = await queryOne<AuthUser & { password_hash: string }>(
    "SELECT id, name, email, role, avatar_url, created_at, password_hash FROM users WHERE email = ?",
    [email]
  );
  if (!row || !verifyPassword(password, row.password_hash)) {
    return c.json({ detail: "Invalid email or password" }, 401);
  }

  setAuthCookie(c, row.id);
  const { password_hash: _, ...user } = row;
  return c.json(user);
});

router.post("/logout", (c) => {
  clearAuthCookie(c);
  return c.json({ status: "logged_out" });
});

router.get("/me", async (c) => {
  const user = await getOptionalUser(c);
  if (!user) return c.json({ detail: "Not authenticated" }, 401);
  return c.json(user);
});

router.patch("/profile", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const body = await c.req.json().catch(() => ({}));
  const name = body.name !== undefined ? String(body.name).trim() : user.name;
  const avatarUrl = body.avatar_url !== undefined ? (body.avatar_url ? String(body.avatar_url) : null) : user.avatar_url;

  if (!name) {
    return c.json({ detail: "Name cannot be empty" }, 422);
  }

  await execute("UPDATE users SET name = ?, avatar_url = ? WHERE id = ?", [name, avatarUrl, user.id]);
  const updated = await queryOne<AuthUser>(
    "SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?",
    [user.id]
  );
  return c.json(updated);
});

router.post("/forgot-password", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const user = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
  const resetToken = user ? signToken({ sub: String(user.id), type: "reset" }, 900) : undefined;
  return c.json({
    message: "If that email exists, a password reset link has been generated.",
    ...(process.env.VERCEL ? {} : resetToken ? { reset_token: resetToken } : {}),
  });
});

router.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const newPassword = String(body.new_password ?? "");
  if (newPassword.length < 6) {
    return c.json({ detail: "Password must be at least 6 characters" }, 422);
  }
  const payload = verifyToken(token);
  if (!payload || payload.type !== "reset" || !payload.sub) {
    return c.json({ detail: "Invalid or expired reset token" }, 400);
  }
  const userId = Number(payload.sub);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(newPassword), userId]);
  return c.json({ status: "password_reset" });
});

export default router;
