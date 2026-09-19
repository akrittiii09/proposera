import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  findCreatorByEmail,
  findCreatorById,
  createProposal,
  findProposalsByCreatorId,
  findEntitlementByCreatorId,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  validateSession,
  invalidateSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import * as dbModule from "@/lib/db";

describe("Milestone 2: Creator Authentication & Dashboard Integration", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);

    // Mock getDb to return our isolated in-memory test database
    dbModule.getDb({ inMemory: true });
  });

  afterEach(() => {
    db.close();
    dbModule.closeDb();
  });

  describe("Registration Flow (POST /api/auth/register)", () => {
    it("creates creator with hashed password and establishes session", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "NewCreator@Example.Com",
          password: "SecurePassword123!",
        }),
      });

      const response = await registerHandler(request);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.creator.email).toBe("newcreator@example.com");

      // Verify cookie is set
      const sessionCookie = response.cookies.get(SESSION_COOKIE_NAME);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toHaveLength(64); // 32 bytes hex
      expect(sessionCookie?.httpOnly).toBe(true);

      // Verify in DB that plaintext password was NEVER stored
      const activeDb = dbModule.getDb();
      const creatorInDb = findCreatorByEmail(activeDb, "newcreator@example.com");
      expect(creatorInDb).not.toBeNull();
      expect(creatorInDb?.password_hash).not.toBe("SecurePassword123!");
      expect(creatorInDb?.password_hash).toMatch(/^\$2[ab]\$12\$/);

      // Verify entitlement was initialized as INACTIVE (paywall boundary preserved)
      const entitlement = findEntitlementByCreatorId(activeDb, creatorInDb!.id);
      expect(entitlement).not.toBeNull();
      expect(entitlement?.status).toBe("INACTIVE");
    });

    it("rejects duplicate email address safely", async () => {
      const activeDb = dbModule.getDb();
      const hash = await hashPassword("ExistingPassword123!");
      createCreator(activeDb, { email: "existing@example.com", passwordHash: hash });

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "Existing@Example.com",
          password: "NewPassword123!",
        }),
      });

      const response = await registerHandler(request);
      expect(response.status).toBe(409);

      const json = await response.json();
      expect(json.error).toContain("already exists");
    });

    it("rejects invalid registration inputs", async () => {
      const badEmailReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", password: "Password123!" }),
      });
      expect((await registerHandler(badEmailReq)).status).toBe(400);

      const shortPwdReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "user@test.com", password: "123" }),
      });
      expect((await registerHandler(shortPwdReq)).status).toBe(400);
    });
  });

  describe("Login Flow (POST /api/auth/login)", () => {
    it("authenticates valid credentials and sets session cookie", async () => {
      const activeDb = dbModule.getDb();
      const hash = await hashPassword("MyValidPassword!");
      createCreator(activeDb, { email: "valid@test.com", passwordHash: hash });

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "VALID@TEST.COM",
          password: "MyValidPassword!",
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.creator.email).toBe("valid@test.com");

      const sessionCookie = response.cookies.get(SESSION_COOKIE_NAME);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);
    });

    it("rejects incorrect password with generic error message", async () => {
      const activeDb = dbModule.getDb();
      const hash = await hashPassword("RealPassword123!");
      createCreator(activeDb, { email: "user@test.com", passwordHash: hash });

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@test.com",
          password: "WrongPassword999!",
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe("Invalid email or password");
    });

    it("fails safely for nonexistent email without leaking existence", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "unknown@example.com",
          password: "AnyPassword123!",
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe("Invalid email or password");
    });
  });

  describe("Logout Flow (POST /api/auth/logout)", () => {
    it("invalidates active session and clears session cookie", async () => {
      const activeDb = dbModule.getDb();
      const creator = createCreator(activeDb, { email: "logout@test.com", passwordHash: "h" });
      const session = createSession(activeDb, creator.id);

      expect(validateSession(activeDb, session.id)).not.toBeNull();

      const request = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${session.id}`,
        },
      });

      const response = await logoutHandler(request);
      expect(response.status).toBe(200);

      // Session must be removed from database
      expect(validateSession(activeDb, session.id)).toBeNull();

      // Cookie must be expired
      const expiredCookie = response.cookies.get(SESSION_COOKIE_NAME);
      expect(expiredCookie?.maxAge).toBe(0);
    });

    it("handles repeated logout or missing cookie gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
      });

      const response = await logoutHandler(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });

  describe("Dashboard & Creator Isolation", () => {
    it("isolates creator proposals strictly by creator_id", () => {
      const activeDb = dbModule.getDb();
      const creatorA = createCreator(activeDb, { email: "a@domain.com", passwordHash: "h" });
      const creatorB = createCreator(activeDb, { email: "b@domain.com", passwordHash: "h" });

      createProposal(activeDb, { creatorId: creatorA.id, title: "Proposal A1", partnerName: "P1" });
      createProposal(activeDb, { creatorId: creatorA.id, title: "Proposal A2", partnerName: "P2" });
      createProposal(activeDb, { creatorId: creatorB.id, title: "Proposal B1", partnerName: "P3" });

      const creatorAProposals = findProposalsByCreatorId(activeDb, creatorA.id);
      expect(creatorAProposals).toHaveLength(2);
      expect(creatorAProposals.map((p) => p.title)).toEqual(["Proposal A2", "Proposal A1"]);

      const creatorBProposals = findProposalsByCreatorId(activeDb, creatorB.id);
      expect(creatorBProposals).toHaveLength(1);
      expect(creatorBProposals[0].title).toBe("Proposal B1");

      // Verify Creator A cannot see Creator B's proposals
      expect(creatorAProposals.some((p) => p.creator_id === creatorB.id)).toBe(false);
    });
  });
});
