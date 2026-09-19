import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  createProposal,
  createResponse,
  findResponsesByProposalId,
  updateProposalStatus,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { GET as getPublicProposalHandler } from "@/app/api/proposals/[slug]/public/route";
import { POST as postRespondHandler } from "@/app/api/proposals/[slug]/respond/route";
import { GET as getResponsesHandler } from "@/app/api/proposals/[id]/responses/route";
import * as dbModule from "@/lib/db";

describe("Milestone 4: Public Recipient Delivery & Response Capture", () => {
  let db: DatabaseSync;
  let creator1: { id: string; email: string };
  let creator2: { id: string; email: string };
  let sessionToken1: string;
  let sessionToken2: string;
  let publishedSlug: string;
  let publishedProposalId: string;
  let draftSlug: string;
  let draftProposalId: string;

  beforeEach(async () => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);

    dbModule.getDb({ inMemory: true });

    // Seed Creator 1
    const passHash1 = await hashPassword("Creator1Password123!");
    creator1 = createCreator(dbModule.getDb(), {
      email: "creator1@proposera.test",
      passwordHash: passHash1,
    });
    const s1 = createSession(dbModule.getDb(), creator1.id);
    sessionToken1 = s1.id;

    // Seed Creator 2
    const passHash2 = await hashPassword("Creator2Password123!");
    creator2 = createCreator(dbModule.getDb(), {
      email: "creator2@proposera.test",
      passwordHash: passHash2,
    });
    const s2 = createSession(dbModule.getDb(), creator2.id);
    sessionToken2 = s2.id;

    // Seed a PUBLISHED proposal for creator 1
    publishedSlug = "sarah-forever-love-x9y2";
    const published = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      title: "Sarah & Alex Forever",
      partnerName: "Sarah",
      slug: publishedSlug,
      themeId: "midnight-velvet",
      storyContent: {
        introMessage: "To my favorite person in the world...",
        letterText: "Every single day with you is pure joy.",
        question: "Sarah, will you marry me?",
      },
    });
    publishedProposalId = published.id;
    updateProposalStatus(dbModule.getDb(), published.id, creator1.id, "PUBLISHED");

    // Seed a DRAFT proposal for creator 1
    draftSlug = "sarah-draft-private-k1m8";
    const draft = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      title: "Private In-Progress Draft",
      partnerName: "Sarah",
      slug: draftSlug,
      themeId: "sunset-terrace",
      storyContent: {
        introMessage: "Draft in progress...",
        letterText: "Working on it...",
        question: "Will you marry me?",
      },
    });
    draftProposalId = draft.id;
  });

  afterEach(() => {
    db.close();
    dbModule.closeDb();
  });

  describe("Public Delivery & Non-Disclosure (GET /api/proposals/[slug]/public)", () => {
    it("resolves published proposal and returns sanitized public projection with no auth required", async () => {
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedSlug}/public`);
      const res = await getPublicProposalHandler(req, {
        params: Promise.resolve({ slug: publishedSlug }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.proposal).toBeDefined();

      // Check allowed public fields
      expect(json.proposal.slug).toBe(publishedSlug);
      expect(json.proposal.title).toBe("Sarah & Alex Forever");
      expect(json.proposal.partner_name).toBe("Sarah");
      expect(json.proposal.theme_id).toBe("midnight-velvet");
      expect(json.proposal.story_content.question).toBe("Sarah, will you marry me?");

      // Strict security: ensure private creator/system fields are completely stripped
      expect(json.proposal.id).toBeUndefined();
      expect(json.proposal.creator_id).toBeUndefined();
      expect(json.proposal.email).toBeUndefined();
      expect(json.proposal.status).toBeUndefined();
      expect(json.proposal.created_at).toBeUndefined();
      expect(json.proposal.updated_at).toBeUndefined();

      // Ensure search engine protection headers are emitted
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive, nosnippet");
    });

    it("returns indistinguishable 404 for DRAFT proposal to unauthenticated visitor", async () => {
      const req = new NextRequest(`http://localhost:3000/api/proposals/${draftSlug}/public`);
      const res = await getPublicProposalHandler(req, {
        params: Promise.resolve({ slug: draftSlug }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Proposal not found");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive, nosnippet");
    });

    it("returns indistinguishable 404 for UNPUBLISHED proposal", async () => {
      // Transition published proposal to UNPUBLISHED
      updateProposalStatus(dbModule.getDb(), publishedProposalId, creator1.id, "UNPUBLISHED");

      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedSlug}/public`);
      const res = await getPublicProposalHandler(req, {
        params: Promise.resolve({ slug: publishedSlug }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Proposal not found");
    });

    it("returns indistinguishable 404 for DELETED proposal", async () => {
      // Soft-delete proposal
      updateProposalStatus(dbModule.getDb(), publishedProposalId, creator1.id, "DELETED");

      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedSlug}/public`);
      const res = await getPublicProposalHandler(req, {
        params: Promise.resolve({ slug: publishedSlug }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Proposal not found");
    });

    it("returns indistinguishable 404 for non-existent slug", async () => {
      const req = new NextRequest("http://localhost:3000/api/proposals/completely-unknown-slug/public");
      const res = await getPublicProposalHandler(req, {
        params: Promise.resolve({ slug: "completely-unknown-slug" }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Proposal not found");
    });
  });

  describe("Public Response Submission (POST /api/proposals/[slug]/respond)", () => {
    it("successfully submits response to published proposal with choice and optional note", async () => {
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedSlug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 iPhone Mobile" },
        body: JSON.stringify({
          choice: "YES_ALWAYS_AND_FOREVER",
          customNote: "I cannot wait to spend the rest of my life with you! ❤️",
        }),
      });

      const res = await postRespondHandler(req, {
        params: Promise.resolve({ slug: publishedSlug }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.response.choice).toBe("YES_ALWAYS_AND_FOREVER");
      expect(json.response.custom_note).toBe("I cannot wait to spend the rest of my life with you! ❤️");
      expect(json.response.created_at).toBeDefined();

      // Verify persisted in DB
      const dbResponses = findResponsesByProposalId(dbModule.getDb(), publishedProposalId, creator1.id);
      expect(dbResponses).toHaveLength(1);
      expect(dbResponses?.[0].choice).toBe("YES_ALWAYS_AND_FOREVER");
    });

    it("accepts a 500-character custom note", async () => {
      const note500 = "a".repeat(500);
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedSlug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: "YES_FOREVER",
          customNote: note500,
        }),
      });

      const res = await postRespondHandler(req, {
        params: Promise.resolve({ slug: publishedSlug }),
      });

      expect(res.status).toBe(201);
    });

    it("rejects a note exceeding 500 characters with 400 Bad Request", async () => {
      const note501 = "a".repeat(501);
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedSlug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: "YES_FOREVER",
          customNote: note501,
        }),
      });

      const res = await postRespondHandler(req, {
        params: Promise.resolve({ slug: publishedSlug }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("500 characters");
    });

    it("rejects response with empty choice", async () => {
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedSlug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: "   ",
        }),
      });

      const res = await postRespondHandler(req, {
        params: Promise.resolve({ slug: publishedSlug }),
      });

      expect(res.status).toBe(400);
    });

    it("rejects response submitted to a DRAFT proposal with 404 non-disclosure", async () => {
      const req = new NextRequest(`http://localhost:3000/api/proposals/${draftSlug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: "YES_FOREVER",
        }),
      });

      const res = await postRespondHandler(req, {
        params: Promise.resolve({ slug: draftSlug }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Proposal not found");
    });
  });

  describe("Creator Response Access (GET /api/proposals/[id]/responses)", () => {
    beforeEach(() => {
      // Insert test response for published proposal
      createResponse(dbModule.getDb(), {
        proposalId: publishedProposalId,
        choice: "YES_ALWAYS",
        customNote: "I love you with all my heart!",
      });
    });

    it("allows authenticated proposal owner to retrieve persisted responses", async () => {
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedProposalId}/responses`, {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });

      const res = await getResponsesHandler(req, {
        params: Promise.resolve({ id: publishedProposalId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.responses).toHaveLength(1);
      expect(json.responses[0].choice).toBe("YES_ALWAYS");
      expect(json.responses[0].custom_note).toBe("I love you with all my heart!");
      expect(json.responses[0].created_at).toBeDefined();
    });

    it("rejects unauthenticated request with 401 Unauthorized", async () => {
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedProposalId}/responses`, {
        method: "GET",
      });

      const res = await getResponsesHandler(req, {
        params: Promise.resolve({ id: publishedProposalId }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("enforces 404 non-disclosure when foreign creator attempts to read responses", async () => {
      // Creator 2 tries to read Creator 1's responses
      const req = new NextRequest(`http://localhost:3000/api/proposals/${publishedProposalId}/responses`, {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}`,
        },
      });

      const res = await getResponsesHandler(req, {
        params: Promise.resolve({ id: publishedProposalId }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Proposal not found");
    });
  });
});
