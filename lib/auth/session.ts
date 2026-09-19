import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { findCreatorById, CreatorRecord, SessionRecord } from "../db/repositories";

export const SESSION_COOKIE_NAME = "proposera_session";
export const DEFAULT_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Creates a new cryptographically secure session for a creator.
 */
export function createSession(
  db: DatabaseSync,
  creatorId: string,
  durationSeconds: number = DEFAULT_SESSION_DURATION_SECONDS
): SessionRecord {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();
  const createdAt = now.toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, creator_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(token, creatorId, createdAt, expiresAt);

  return {
    id: token,
    creator_id: creatorId,
    created_at: createdAt,
    expires_at: expiresAt,
  };
}

/**
 * Validates a session token.
 * If valid and unexpired, returns both the session and associated creator record.
 * If expired or invalid, returns null and purges expired records.
 */
export function validateSession(
  db: DatabaseSync,
  token: string
): { session: SessionRecord; creator: CreatorRecord } | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const stmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
  const session = stmt.get(token) as unknown as SessionRecord | undefined;

  if (!session) {
    return null;
  }

  const now = new Date().toISOString();
  if (session.expires_at <= now) {
    // Expired session - purge it
    invalidateSession(db, token);
    return null;
  }

  const creator = findCreatorById(db, session.creator_id);
  if (!creator) {
    invalidateSession(db, token);
    return null;
  }

  return { session, creator };
}

/**
 * Invalidates (deletes) a specific session token (logout).
 */
export function invalidateSession(db: DatabaseSync, token: string): boolean {
  if (!token) return false;
  const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
  const result = stmt.run(token);
  return Number(result.changes) > 0;
}

/**
 * Invalidates all active sessions for a creator.
 */
export function invalidateAllCreatorSessions(db: DatabaseSync, creatorId: string): number {
  const stmt = db.prepare("DELETE FROM sessions WHERE creator_id = ?");
  const result = stmt.run(creatorId);
  return Number(result.changes);
}

/**
 * Standard secure cookie configuration for session tokens.
 */
export function getSessionCookieOptions(durationSeconds: number = DEFAULT_SESSION_DURATION_SECONDS) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: durationSeconds,
  };
}
