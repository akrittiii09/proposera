import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "@/lib/db/schema";
import { createCreator, createProposal } from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import * as dbModule from "@/lib/db";
import { GET as getHealthHandler } from "@/app/api/health/route";
import { POST as postPermitHandler } from "@/app/api/media/permit/route";
import { POST as postUploadHandler } from "@/app/api/media/upload/route";

describe("Reliability Observability Milestone", () => {
  let db: DatabaseSync;
  let creator: { id: string; email: string };
  let sessionToken: string;
  let proposalId: string;

  beforeEach(async () => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);

    vi.spyOn(dbModule, "getDb").mockReturnValue(db);

    const passHash = await hashPassword("CreatorPassword123!");
    creator = createCreator(db, {
      email: "health_test@proposera.test",
      passwordHash: passHash,
    });
    const s = createSession(db, creator.id);
    sessionToken = s.id;

    const prop = createProposal(db, {
      creatorId: creator.id,
      title: "Health Test Proposal",
      partnerName: "Taylor",
    });
    proposalId = prop.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Health Endpoint (GET /api/health)", () => {
    it("1.1 returns 200 with status ok and timestamp when database and storage are available", async () => {
      const response = await getHealthHandler();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe("ok");
      expect(typeof body.timestamp).toBe("string");
      expect(new Date(body.timestamp).getTime()).not.toBeNaN();

      // Ensure no sensitive internal data or secrets leaked
      expect(body.creator).toBeUndefined();
      expect(body.proposals).toBeUndefined();
      expect(body.database).toBeUndefined();
      expect(body.path).toBeUndefined();
      expect(body.env).toBeUndefined();
    });

    it("1.2 returns 503 with status unhealthy when database check fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Simulate database failure by mocking prepare to throw
      vi.spyOn(db, "prepare").mockImplementationOnce(() => {
        throw new Error("Disk I/O error on SQLite");
      });

      const response = await getHealthHandler();
      expect(response.status).toBe(503);

      const body = await response.json();
      expect(body.status).toBe("unhealthy");
      expect(body.error).toBe("Service dependency check failed");

      // Verify console.error was invoked with diagnostic context
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Health check failure:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("2. Media Error Logging & Sanitization", () => {
    it("2.1 logs unexpected permit issuance error to console.error and returns sanitized 500", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Simulate unexpected database crash during permit creation
      vi.spyOn(db, "prepare").mockImplementation(() => {
        throw new Error("Unexpected SQLite memory corruption");
      });

      const req = new NextRequest("http://localhost:3000/api/media/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `proposera_session=${sessionToken}`,
        },
        body: JSON.stringify({
          proposalId,
          fileSize: 1024 * 500,
          mimeType: "image/jpeg",
        }),
      });

      const response = await postPermitHandler(req);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("Internal server error issuing upload permit");

      // Ensure internal error details were logged with route context
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Media permit issuance error:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("2.2 logs unexpected upload processing error to console.error and returns sanitized 500", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Cause unexpected error during auth extraction or permit verification
      vi.spyOn(db, "prepare").mockImplementation(() => {
        throw new Error("Unexpected database filesystem failure");
      });

      const formData = new FormData();
      formData.append("permitId", "some-permit-id");
      formData.append(
        "file",
        new Blob([Buffer.from("dummy-content")], { type: "image/jpeg" }),
        "photo.jpg"
      );

      const req = new NextRequest("http://localhost:3000/api/media/upload", {
        method: "POST",
        headers: {
          Cookie: `proposera_session=${sessionToken}`,
        },
        body: formData,
      });

      const response = await postUploadHandler(req);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("Internal server error during media upload");

      // Ensure internal error details were logged with route context
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Media upload processing error:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
