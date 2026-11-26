import crypto from "node:crypto";
import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { queryOne } from "./db.js";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  avatar_url: string | null;
  created_at: string;
}

const COOKIE_NAME = "dailylessons_session";
const SECRET = process.env.JWT_SECRET || "dev-only-secret-change-in-production";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("scrypt$")) return false;
  const [, salt, hashHex] = stored.split("$");
  if (!salt || !hashHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8");
}

export function signToken(payload: Record<string, unknown>, ttlSeconds = 60 * 60 * 24 * 7): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    })
  );
  const sig = base64UrlEncode(crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = base64UrlEncode(
    crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest()
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(base64UrlDecode(body)) as Record<string, unknown>;
    if (typeof data.exp === "number" && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setAuthCookie(c: Context, userId: number): void {
  const token = signToken({ sub: String(userId), type: "access" });
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: Boolean(process.env.VERCEL),
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(c: Context): void {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

export async function getOptionalUser(c: Context): Promise<AuthUser | null> {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.type !== "access" || !payload.sub) return null;
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) return null;
  return queryOne<AuthUser>(
    "SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?",
    [userId]
  );
}

export async function requireUser(c: Context, next: Next): Promise<Response | void> {
  const user = await getOptionalUser(c);
  if (!user) {
    return c.json({ detail: "Not authenticated" }, 401);
  }
  c.set("user", user);
  await next();
}

export async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const user = await getOptionalUser(c);
  if (!user) {
    return c.json({ detail: "Not authenticated" }, 401);
  }
  if (user.role !== "admin") {
    return c.json({ detail: "Admin access required" }, 403);
  }
  c.set("user", user);
  await next();
}
