import crypto from "node:crypto";
import { Hono } from "hono";
import { requireUser, type AuthUser } from "../auth.js";
import { execute, queryAll, queryOne } from "../db.js";
import { hasActivePaidEnrollment, nowUtcIso } from "../helpers.js";

const router = new Hono();

router.post("/initialize", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const body = await c.req.json().catch(() => ({}));
  const courseId = Number(body.course_id);

  const course = await queryOne<{ id: number; price_kobo: number }>(
    "SELECT id, price_kobo FROM courses WHERE id = ? AND is_active = 1",
    [courseId]
  );
  if (!course) return c.json({ detail: "Course not found" }, 404);

  if (await hasActivePaidEnrollment(user.id, courseId)) {
    return c.json({ detail: "You already have an active paid enrollment for this course" }, 400);
  }

  const reference = `dl_${courseId}_${user.id}_${crypto.randomBytes(6).toString("hex")}`;
  const origin = new URL(c.req.url).origin;
  const callbackUrl = body.callback_url || `${origin}/checkout/callback`;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  let authorizationUrl = `${callbackUrl}?reference=${encodeURIComponent(reference)}`;
  let accessCode = `demo_${reference}`;

  if (paystackSecret && !paystackSecret.startsWith("sk_test_replace")) {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Number(course.price_kobo),
        reference,
        callback_url: callbackUrl,
        metadata: { user_id: user.id, course_id: courseId },
      }),
    });
    const data = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url: string; access_code: string; reference: string };
    };
    if (!res.ok || !data.status || !data.data) {
      return c.json({ detail: data.message || "Paystack initialization failed" }, 502);
    }
    authorizationUrl = data.data.authorization_url;
    accessCode = data.data.access_code;
  }

  await execute(
    "INSERT INTO enrollments (user_id, course_id, status, paystack_reference) VALUES (?, ?, 'pending', ?)",
    [user.id, courseId, reference]
  );

  return c.json({
    authorization_url: authorizationUrl,
    access_code: accessCode,
    reference,
  });
});

router.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-paystack-signature") || "";
  const secret = process.env.PAYSTACK_SECRET_KEY || "";

  if (secret) {
    const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (signature !== expected) {
      return c.json({ detail: "Invalid webhook signature" }, 400);
    }
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    data?: { reference?: string; amount?: number; status?: string };
  };
  if (payload.event !== "charge.success" || !payload.data?.reference) {
    return c.json({ status: "ignored" });
  }

  const enrollment = await queryOne<{ id: number; course_id: number; status: string }>(
    "SELECT id, course_id, status FROM enrollments WHERE paystack_reference = ?",
    [payload.data.reference]
  );
  if (!enrollment) return c.json({ status: "ignored" });

  if (enrollment.status !== "paid") {
    const course = await queryOne<{ price_kobo: number }>(
      "SELECT price_kobo FROM courses WHERE id = ?",
      [enrollment.course_id]
    );
    if (course && Number(payload.data.amount ?? 0) >= Number(course.price_kobo)) {
      await execute("UPDATE enrollments SET status = 'paid', paid_at = ? WHERE id = ?", [
        nowUtcIso(),
        enrollment.id,
      ]);
    }
  }

  return c.json({ status: "ok" });
});

router.get("/verify/:reference", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const reference = c.req.param("reference");

  const enrollment = await queryOne<{
    id: number;
    user_id: number;
    course_id: number;
    status: string;
    paid_at: string | null;
    paystack_reference: string | null;
  }>(
    "SELECT id, user_id, course_id, status, paid_at, paystack_reference FROM enrollments WHERE paystack_reference = ? AND user_id = ?",
    [reference, user.id]
  );
  if (!enrollment) return c.json({ detail: "Payment reference not found" }, 404);

  let status = enrollment.status;
  let paidAt = enrollment.paid_at;

  if (status !== "paid") {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const course = await queryOne<{ price_kobo: number }>(
      "SELECT price_kobo FROM courses WHERE id = ?",
      [enrollment.course_id]
    );

    let verified = false;
    if (paystackSecret && !paystackSecret.startsWith("sk_test_replace")) {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` },
      });
      const data = (await res.json()) as {
        status?: boolean;
        data?: { status?: string; amount?: number };
      };
      if (
        res.ok &&
        data.status &&
        data.data?.status === "success" &&
        course &&
        Number(data.data.amount ?? 0) >= Number(course.price_kobo)
      ) {
        verified = true;
      }
    } else {
      // Demo/standalone mode when Paystack secret is not configured
      verified = true;
    }

    if (verified) {
      paidAt = nowUtcIso();
      status = "paid";
      await execute("UPDATE enrollments SET status = 'paid', paid_at = ? WHERE id = ?", [
        paidAt,
        enrollment.id,
      ]);
    }
  }

  return c.json({
    status,
    is_paid: status === "paid",
    course_id: Number(enrollment.course_id),
    reference,
    paid_at: paidAt,
  });
});

router.get("/my-enrollments", requireUser, async (c) => {
  const user = c.get("user") as AuthUser;
  const rows = await queryAll(
    "SELECT id, user_id, course_id, status, paid_at, expires_at, paystack_reference, created_at FROM enrollments WHERE user_id = ? ORDER BY created_at DESC",
    [user.id]
  );
  return c.json(rows);
});

export default router;
