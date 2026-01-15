import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = ".flux";
const DB_PATH = join(DATA_DIR, "sessions.db");
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Create sessions table
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

// Create index for expiration cleanup
db.run(`
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
`);

export interface SessionData {
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region: string;
    isSSO: boolean;
  };
  userInfo?: {
    account: string;
    arn: string;
    userId: string;
  };
}

export function getSession(sessionId: string): SessionData | null {
  // Clean up expired sessions occasionally (1% chance per read)
  if (Math.random() < 0.01) {
    cleanupExpiredSessions();
  }

  const row = db
    .query<{ data: string; expires_at: number }, [string]>(
      "SELECT data, expires_at FROM sessions WHERE id = ?"
    )
    .get(sessionId);

  if (!row) {
    return null;
  }

  // Check if expired
  if (row.expires_at < Date.now()) {
    deleteSession(sessionId);
    return null;
  }

  return JSON.parse(row.data) as SessionData;
}

export function setSession(sessionId: string, data: SessionData): void {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const jsonData = JSON.stringify(data);

  db.run(
    `INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`,
    [sessionId, jsonData, expiresAt]
  );
}

export function deleteSession(sessionId: string): void {
  db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

function cleanupExpiredSessions(): void {
  db.run("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]);
}
