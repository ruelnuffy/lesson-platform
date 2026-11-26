import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import initSqlJs, { type Database, type SqlJsStatic, type BindParams } from "sql.js";

const require = createRequire(import.meta.url);

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

export function getDbFilePath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }
  if (process.env.VERCEL) {
    return "/tmp/dailylessons.db";
  }
  const cwd = process.cwd();
  const base = path.basename(cwd) === "frontend" ? path.resolve(cwd, "..") : cwd;
  return path.join(base, "data", "dailylessons.db");
}

function findWasmPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"),
    path.resolve(process.cwd(), "../node_modules/sql.js/dist/sql-wasm.wasm"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return require.resolve("sql.js/dist/sql-wasm.wasm");
}

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    const wasmPath = findWasmPath();
    const wasmBinary = fs.readFileSync(wasmPath);
    sqlJsPromise = initSqlJs({
      wasmBinary: wasmBinary.buffer.slice(
        wasmBinary.byteOffset,
        wasmBinary.byteOffset + wasmBinary.byteLength
      ),
    });
  }
  return sqlJsPromise;
}

export function persistDb(): void {
  if (!dbInstance) return;
  const filePath = getDbFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const data = dbInstance.export();
  fs.writeFileSync(filePath, Buffer.from(data));
}

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_kobo INTEGER NOT NULL,
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  release_date TEXT NOT NULL,
  UNIQUE(course_id, day_number)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  expires_at TEXT,
  paystack_reference TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  pass_mark_percent INTEGER NOT NULL DEFAULT 70
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score_percent REAL NOT NULL,
  answers_json TEXT NOT NULL,
  passed INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  role_label TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  sent_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  UNIQUE(user_id, lesson_id, type)
);
`;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = (async () => {
      const SQL = await getSqlJs();
      const filePath = getDbFilePath();
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        dbInstance = new SQL.Database(new Uint8Array(buffer));
      } else {
        dbInstance = new SQL.Database();
      }
      dbInstance.run(SCHEMA_SQL);
      const { seedDatabase } = await import("./seed.js");
      await seedDatabase(dbInstance);
      persistDb();
      return dbInstance;
    })();
  }
  return initPromise;
}

export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: BindParams = []
): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: BindParams = []
): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params: BindParams = [],
  skipPersist = false
): Promise<{ changes: number; lastInsertRowid: number }> {
  const db = await getDb();
  db.run(sql, params);
  const changes = db.getRowsModified();
  const res = db.exec("SELECT last_insert_rowid() AS id");
  const lastInsertRowid = Number(res[0]?.values[0]?.[0] ?? 0);
  if (!skipPersist) {
    persistDb();
  }
  return { changes, lastInsertRowid };
}
