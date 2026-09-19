import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "@/lib/db/schema";
import { createCreator } from "@/lib/db/repositories";
import { hashPassword, verifyPassword, BCRYPT_SALT_ROUNDS } from "@/lib/auth/password";
import {
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllCreatorSessions,
} from "@/lib/auth/session";

describe("Password & Session Authentication Primitives", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);
  });

  afterEach(() => {
    db.close();
  });

  describe("Password Hashing", () => {
    it("ensures BCRYPT_SALT_ROUNDS is at least 12", () => {
      expect(BCRYPT_SALT_ROUNDS).toBeGreaterThanOrEqual(12);
    });

    it("hashes password and does not return plaintext", async () => {
      const plaintext = "SuperSecretPassword123!";
      const hash = await hashPassword(plaintext);

      expect(hash).not.toBe(plaintext);
      // Valid bcrypt format check: $2a$ or $2b$ followed by rounds
      expect(hash).toMatch(/^\$2[ab]\$12\$/);
    });

    it("verifies correct password against hash", async () => {
      const plaintext = "CorrectRomanticPassword2026!";
      const hash = await hashPassword(plaintext);

      const isValid = await verifyPassword(plaintext, hash);
      expect(isValid).toBe(true);
    });

    it("rejects incorrect password against hash", async () => {
      const plaintext = "OriginalPassword";
      const hash = await hashPassword(plaintext);

      const isInvalid = await verifyPassword("WrongPassword", hash);
      expect(isInvalid).toBe(false);
    });

    it("safely handles empty or invalid inputs", async () => {
      await expect(hashPassword("")).rejects.toThrow();
      expect(await verifyPassword("", "somehash")).toBe(false);
      expect(await verifyPassword("password", "")).toBe(false);
    });
  });

  describe("Session Management", () => {
    it("creates a cryptographically secure random session token", () => {
      const creator = createCreator(db, { email: "session@test.com", passwordHash: "h" });
      const session1 = createSession(db, creator.id);
      const session2 = createSession(db, creator.id);

      expect(session1.id).toBeDefined();
      expect(session1.id).toHaveLength(64); // 32 bytes hex = 64 characters
      expect(session2.id).toHaveLength(64);
      expect(session1.id).not.toBe(session2.id); // Unpredictable tokens
    });

    it("validates an active session and resolves associated creator", () => {
      const creator = createCreator(db, { email: "active@test.com", passwordHash: "h" });
      const session = createSession(db, creator.id);

      const result = validateSession(db, session.id);
      expect(result).not.toBeNull();
      expect(result?.creator.id).toBe(creator.id);
      expect(result?.creator.email).toBe("active@test.com");
      expect(result?.session.id).toBe(session.id);
    });

    it("rejects nonexistent or malformed session tokens", () => {
      expect(validateSession(db, "nonexistent-token")).toBeNull();
      expect(validateSession(db, "")).toBeNull();
    });

    it("invalidates an individual session token on logout", () => {
      const creator = createCreator(db, { email: "logout@test.com", passwordHash: "h" });
      const session = createSession(db, creator.id);

      expect(validateSession(db, session.id)).not.toBeNull();
      const invalidated = invalidateSession(db, session.id);
      expect(invalidated).toBe(true);
      expect(validateSession(db, session.id)).toBeNull();
    });

    it("invalidates all sessions for a creator", () => {
      const creator = createCreator(db, { email: "multisess@test.com", passwordHash: "h" });
      const s1 = createSession(db, creator.id);
      const s2 = createSession(db, creator.id);

      expect(validateSession(db, s1.id)).not.toBeNull();
      expect(validateSession(db, s2.id)).not.toBeNull();

      const count = invalidateAllCreatorSessions(db, creator.id);
      expect(count).toBe(2);

      expect(validateSession(db, s1.id)).toBeNull();
      expect(validateSession(db, s2.id)).toBeNull();
    });

    it("rejects and purges expired sessions", () => {
      const creator = createCreator(db, { email: "expired@test.com", passwordHash: "h" });
      // Create session with negative duration (-1 second) to force expiration
      const expiredSession = createSession(db, creator.id, -1);

      expect(validateSession(db, expiredSession.id)).toBeNull();

      // Verify it was purged from database
      const stmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
      expect(stmt.get(expiredSession.id)).toBeUndefined();
    });
  });
});
