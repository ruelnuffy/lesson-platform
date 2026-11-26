import type { Database, BindParams } from "sql.js";
import { hashPassword } from "./auth.js";

function isoDateDaysFromToday(offsetDays: number): string {
  const now = new Date();
  // Africa/Lagos is UTC+1
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  lagos.setUTCDate(lagos.getUTCDate() + offsetDays);
  return lagos.toISOString().slice(0, 10);
}

function getScalar(db: Database, sql: string, params: BindParams = []): number | null {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.get();
      return row[0] !== null && row[0] !== undefined ? Number(row[0]) : null;
    }
    return null;
  } finally {
    stmt.free();
  }
}

interface SeedLesson {
  day_number: number;
  offset_days: number;
  title: string;
  video_url: string | null;
  content_markdown: string;
  questions: Array<{
    text: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>;
}

const SEED_LESSONS: SeedLesson[] = [
  {
    day_number: 1,
    offset_days: -3,
    title: "Thinking in Systems & HTTP Basics",
    video_url: "https://www.youtube.com/embed/iYM2zFP3Zn0",
    content_markdown: `# Day 1: Thinking in Systems & HTTP Basics

Welcome to **Day 1**! Every modern web application speaks HTTP.

## Key Concepts
- **Request / Response cycle**: Clients send a method, path, headers, and optional body; servers return a status code, headers, and payload.
- **Idempotency**: \`GET\`, \`PUT\`, and \`DELETE\` should be safe to retry without unintended duplicate side effects.
- **Status codes**: \`2xx\` success, \`4xx\` client error, \`5xx\` server error.

## Today's Exercise
Inspect a request in your browser DevTools Network tab and note the status code and \`Content-Type\` header.
`,
    questions: [
      {
        text: "Which HTTP status code best indicates that a client is authenticated but lacks permission?",
        options: ["401 Unauthorized", "403 Forbidden", "404 Not Found", "500 Internal Server Error"],
        correct_index: 1,
        explanation: "403 Forbidden signals that the server understood the request and identity, but refuses to authorize it.",
      },
      {
        text: "Which HTTP method is defined as safe and read-only?",
        options: ["POST", "PUT", "GET", "PATCH"],
        correct_index: 2,
        explanation: "GET requests should only retrieve data and have no side effects.",
      },
      {
        text: "Why does idempotency matter for webhooks and payments?",
        options: [
          "It speeds up CSS rendering",
          "It ensures retried deliveries do not apply the same effect twice",
          "It disables TLS encryption",
          "It removes the need for a database",
        ],
        correct_index: 1,
        explanation: "Webhook providers retry on timeouts; idempotent handlers safely ignore duplicate deliveries.",
      },
    ],
  },
  {
    day_number: 2,
    offset_days: -2,
    title: "Relational Data Modeling & Constraints",
    video_url: "https://www.youtube.com/embed/ztHopE5Wnpc",
    content_markdown: `# Day 2: Relational Data Modeling & Constraints

Good schemas enforce invariants at the database layer so bugs in application code cannot corrupt your data.

## Core Principles
- Use **foreign keys** to guarantee referential integrity.
- Use **unique constraints** (e.g. \`(user_id, lesson_id, type)\`) to prevent duplicate records even under concurrency.
- Index columns you frequently filter or join on (\`email\`, \`release_date\`, \`course_id\`).
`,
    questions: [
      {
        text: "What does a composite unique constraint on (user_id, lesson_id, type) guarantee?",
        options: [
          "Only one row can exist in the entire table",
          "A user can receive each email type for a given lesson at most once",
          "Lessons are automatically sorted by date",
          "Passwords are encrypted automatically",
        ],
        correct_index: 1,
        explanation: "A composite unique constraint prevents duplicate combinations of those three columns.",
      },
      {
        text: "Why should you add an index on a frequently queried date column?",
        options: [
          "To make range and equality lookups much faster",
          "To prevent NULL values",
          "To compress text columns",
          "To allow duplicate primary keys",
        ],
        correct_index: 0,
        explanation: "Indexes allow the database to locate matching rows without scanning the entire table.",
      },
      {
        text: "What is the purpose of foreign keys in a relational database?",
        options: [
          "Sending SMTP emails",
          "Guaranteeing referential integrity between related tables",
          "Rendering React components",
          "Hashing passwords",
        ],
        correct_index: 1,
        explanation: "Foreign keys ensure child rows always reference valid parent rows.",
      },
    ],
  },
  {
    day_number: 3,
    offset_days: -1,
    title: "Authentication, Cookies & Hashing",
    video_url: "https://www.youtube.com/embed/2PPSXonhIck",
    content_markdown: `# Day 3: Authentication, Cookies & Hashing

Never store plaintext passwords and never trust client-supplied role flags.

## Checklist
- Hash passwords with a salted slow hash (\`scrypt\` / \`bcrypt\`).
- Store session tokens in **HttpOnly**, **SameSite=Lax** cookies so JavaScript cannot steal them via XSS.
- Validate permissions server-side on every protected endpoint.
`,
    questions: [
      {
        text: "Why should session cookies be marked HttpOnly?",
        options: [
          "So they are compressed",
          "So client-side JavaScript cannot read them via document.cookie",
          "So they never expire",
          "So they work without HTTP",
        ],
        correct_index: 1,
        explanation: "HttpOnly cookies mitigate token theft if an XSS vulnerability occurs.",
      },
      {
        text: "Why do we use a slow salted hash instead of plain SHA-256 for passwords?",
        options: [
          "SHA-256 is too slow",
          "Salted slow hashes resist rainbow tables and brute-force attacks",
          "Plain SHA-256 cannot hash strings",
          "Salted hashes allow decrypting passwords later",
        ],
        correct_index: 1,
        explanation: "Unique per-user salts defeat precomputed tables and work-factor slows brute forcing.",
      },
      {
        text: "Where should access control checks happen?",
        options: ["Only in React UI routes", "On the server on every protected API endpoint", "In CSS", "In localStorage"],
        correct_index: 1,
        explanation: "Client checks are UX only; the server must enforce authorization on every request.",
      },
    ],
  },
  {
    day_number: 4,
    offset_days: 0,
    title: "Server-Side Quiz Grading & API Design",
    video_url: "https://www.youtube.com/embed/0sOvCWFmrtA",
    content_markdown: `# Day 4: Server-Side Quiz Grading & API Design

Welcome to **today's lesson**!

## Never Leak Answers to the Client
When serving a quiz to a student:
- Strip \`correct_index\` and \`explanation\` before sending questions.
- Grade submitted answers strictly on the server and return per-question feedback only after submission.
- Store every attempt so learners can retake quizzes and track improvement over time.
`,
    questions: [
      {
        text: "Why should correct_index be omitted from GET /api/lessons/:id/quiz?",
        options: [
          "To reduce JSON size by 2 bytes",
          "So learners cannot inspect network responses to cheat",
          "Because SQLite cannot store integers",
          "To disable retakes",
        ],
        correct_index: 1,
        explanation: "Sending answer keys to the browser lets anyone read them in DevTools.",
      },
      {
        text: "What makes a quiz grading endpoint trustworthy?",
        options: [
          "Trusting score_percent sent by the frontend",
          "Computing score_percent and passed server-side from stored questions",
          "Using Math.random() on the client",
          "Skipping authentication",
        ],
        correct_index: 1,
        explanation: "The server loads the authoritative answer key and calculates the score.",
      },
      {
        text: "Why keep all QuizAttempt rows instead of overwriting one row?",
        options: [
          "To track best score, latest score, and attempt history",
          "Because UPDATE is not supported in SQL",
          "To delete user accounts",
          "To block future lessons",
        ],
        correct_index: 0,
        explanation: "Recording each attempt preserves full history for analytics and retakes.",
      },
    ],
  },
  {
    day_number: 5,
    offset_days: 1,
    title: "Payment Webhooks & Verification",
    video_url: "https://www.youtube.com/embed/4185F5_xW4I",
    content_markdown: `# Day 5: Payment Webhooks & Verification

Never unlock paid access purely from a browser redirect. Always verify HMAC signatures and transaction amounts server-side.
`,
    questions: [
      {
        text: "What should a webhook handler check before marking an enrollment as paid?",
        options: [
          "The user's browser user-agent",
          "The HMAC signature header and that paid amount >= course price",
          "Only the query string",
          "Nothing",
        ],
        correct_index: 1,
        explanation: "Signature verification proves authenticity and amount checking prevents underpayment.",
      },
      {
        text: "What is HMAC-SHA512 used for in Paystack webhooks?",
        options: [
          "Encrypting video files",
          "Verifying the webhook payload genuinely came from Paystack",
          "Compressing images",
          "Scheduling cron jobs",
        ],
        correct_index: 1,
        explanation: "The shared secret lets your server verify payload integrity and origin.",
      },
      {
        text: "What should happen if the same successful webhook arrives twice?",
        options: [
          "Charge the user again",
          "Crash with HTTP 500",
          "Handle it idempotently and keep the enrollment paid",
          "Delete the course",
        ],
        correct_index: 2,
        explanation: "Idempotent webhook processing safely handles duplicate deliveries.",
      },
    ],
  },
  {
    day_number: 6,
    offset_days: 2,
    title: "Background Jobs & Idempotent Emails",
    video_url: null,
    content_markdown: `# Day 6: Background Jobs & Idempotent Emails

Scheduled notifications should never send duplicate emails if a job restarts mid-run.
`,
    questions: [
      {
        text: "How do you prevent duplicate daily lesson emails if a cron job runs twice?",
        options: [
          "Log each send in email_log with a unique constraint on (user_id, lesson_id, type)",
          "Use setTimeout in React",
          "Store sent flags in memory only",
          "Disable cron jobs",
        ],
        correct_index: 0,
        explanation: "A database unique constraint survives restarts and guarantees at-most-once delivery.",
      },
      {
        text: "Why run daily email dispatches via a protected cron endpoint?",
        options: [
          "So any anonymous visitor can spam users",
          "So a scheduler with CRON_SECRET triggers it reliably",
          "To avoid using SQL",
          "To block video playback",
        ],
        correct_index: 1,
        explanation: "Bearer secret protection ensures only your scheduler can trigger batch emails.",
      },
      {
        text: "What should happen when one email fails to send?",
        options: [
          "Abort all remaining users",
          "Record failed status + error on that EmailLog row and continue",
          "Delete the user",
          "Drop the database",
        ],
        correct_index: 1,
        explanation: "Isolating failures lets other users receive their lessons and allows retries.",
      },
    ],
  },
  {
    day_number: 7,
    offset_days: 3,
    title: "Shipping & Observing Production Apps",
    video_url: null,
    content_markdown: `# Day 7: Shipping & Observing Production Apps

Congratulations on reaching Day 7! Keep your deployments simple, observable, and easy to iterate on.
`,
    questions: [
      {
        text: "What is the purpose of a /health endpoint?",
        options: [
          "To stream 4K video",
          "To let platforms and monitors verify the app is alive",
          "To reset passwords",
          "To export CSVs",
        ],
        correct_index: 1,
        explanation: "Health checks quickly confirm service availability.",
      },
      {
        text: "Why keep frontend and serverless API in one repository on Vercel?",
        options: [
          "Single deployment pipeline, shared types, and zero CORS complexity",
          "To require Docker locally",
          "To make builds slower",
          "To avoid HTTPS",
        ],
        correct_index: 0,
        explanation: "Same-origin deployment eliminates CORS headaches and simplifies shipping.",
      },
      {
        text: "What is the best next step after shipping an MVP?",
        options: [
          "Never touch it again",
          "Measure real learner completion and iterate based on feedback",
          "Delete all tests",
          "Hardcode passwords in JS",
        ],
        correct_index: 1,
        explanation: "Real usage data guides the highest-impact improvements.",
      },
    ],
  },
];

export async function seedDatabase(db: Database): Promise<void> {
  // Admin user
  let adminId = getScalar(db, "SELECT id FROM users WHERE email = ?", ["admin@dailylessons.com"]);
  if (!adminId) {
    db.run(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      ["Course Admin", "admin@dailylessons.com", hashPassword("AdminPass123!")]
    );
    adminId = getScalar(db, "SELECT id FROM users WHERE email = ?", ["admin@dailylessons.com"]);
  }

  // Sample paid student
  let studentId = getScalar(db, "SELECT id FROM users WHERE email = ?", ["student@dailylessons.com"]);
  if (!studentId) {
    db.run(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
      ["Ada Learner", "student@dailylessons.com", hashPassword("StudentPass123!")]
    );
    studentId = getScalar(db, "SELECT id FROM users WHERE email = ?", ["student@dailylessons.com"]);
  }

  // Sample course
  const courseTitle = "7-Day Practical Python & Web Engineering";
  let courseId = getScalar(db, "SELECT id FROM courses WHERE title = ?", [courseTitle]);
  if (!courseId) {
    db.run(
      "INSERT INTO courses (title, description, price_kobo, image_url, is_active) VALUES (?, ?, ?, ?, 1)",
      [
        courseTitle,
        "Master backend systems, APIs, SQL databases, and production deployment through 7 daily video lessons and interactive quizzes.",
        1500000,
        "/images/course-workspace.jpg",
      ]
    );
    courseId = getScalar(db, "SELECT id FROM courses WHERE title = ?", [courseTitle]);
  }

  if (courseId && studentId) {
    const existingEnrollment = getScalar(
      db,
      "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
      [studentId, courseId]
    );
    if (!existingEnrollment) {
      db.run(
        "INSERT INTO enrollments (user_id, course_id, status, paid_at, paystack_reference) VALUES (?, ?, 'paid', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'seed_student_paid_001')",
        [studentId, courseId]
      );
    }

    for (const item of SEED_LESSONS) {
      let lessonId = getScalar(
        db,
        "SELECT id FROM lessons WHERE course_id = ? AND day_number = ?",
        [courseId, item.day_number]
      );
      if (!lessonId) {
        db.run(
          "INSERT INTO lessons (course_id, day_number, title, content_markdown, video_url, release_date) VALUES (?, ?, ?, ?, ?, ?)",
          [
            courseId,
            item.day_number,
            item.title,
            item.content_markdown,
            item.video_url,
            isoDateDaysFromToday(item.offset_days),
          ]
        );
        lessonId = getScalar(
          db,
          "SELECT id FROM lessons WHERE course_id = ? AND day_number = ?",
          [courseId, item.day_number]
        );
      }

      if (lessonId) {
        let quizId = getScalar(db, "SELECT id FROM quizzes WHERE lesson_id = ?", [lessonId]);
        if (!quizId) {
          db.run("INSERT INTO quizzes (lesson_id, pass_mark_percent) VALUES (?, 70)", [lessonId]);
          quizId = getScalar(db, "SELECT id FROM quizzes WHERE lesson_id = ?", [lessonId]);
        }
        if (quizId) {
          const qCount = getScalar(db, "SELECT COUNT(*) FROM questions WHERE quiz_id = ?", [quizId]) ?? 0;
          if (qCount === 0) {
            item.questions.forEach((q, idx) => {
              db.run(
                'INSERT INTO questions (quiz_id, text, options_json, correct_index, explanation, "order") VALUES (?, ?, ?, ?, ?, ?)',
                [quizId, q.text, JSON.stringify(q.options), q.correct_index, q.explanation, idx + 1]
              );
            });
          }
        }
      }
    }
  }

  // Seed reviews
  const reviewCount = getScalar(db, "SELECT COUNT(*) FROM reviews") ?? 0;
  if (reviewCount === 0 && studentId) {
    db.run(
      "INSERT INTO reviews (user_id, rating, role_label, comment) VALUES (?, ?, ?, ?)",
      [
        studentId,
        5,
        "Software Engineer",
        "The daily video lessons plus immediate quizzes kept me consistent all week without feeling overwhelmed.",
      ]
    );
  }
}
