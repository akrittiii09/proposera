import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  createProposal,
  findProposalById,
  findProposalsByCreatorId,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { POST as createProposalHandler, GET as listProposalsHandler } from "@/app/api/proposals/route";
import {
  GET as getProposalHandler,
  PATCH as patchProposalHandler,
  DELETE as deleteProposalHandler,
} from "@/app/api/proposals/[id]/route";
import { POST as publishProposalHandler } from "@/app/api/proposals/[id]/publish/route";
import * as dbModule from "@/lib/db";

describe("Milestone 3: Proposal Authoring & Management Integration", () => {
  let db: DatabaseSync;
  let creator1: { id: string; email: string };
  let creator2: { id: string; email: string };
  let sessionToken1: string;
  let sessionToken2: string;

  beforeEach(async () => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);

    // Mock getDb in module to point to our in-memory DB
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
  });

  afterEach(() => {
    db.close();
    dbModule.closeDb();
  });

  describe("Proposal Creation (POST /api/proposals)", () => {
    it("rejects unauthenticated request with 401", async () => {
      const request = new NextRequest("http://localhost:3000/api/proposals", {
        method: "POST",
        body: JSON.stringify({
          title: "Our Story",
          partnerName: "Taylor",
        }),
      });

      const res = await createProposalHandler(request);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("creates proposal attached strictly to authenticated creator in DRAFT status", async () => {
      const request = new NextRequest("http://localhost:3000/api/proposals", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({
          title: "A Night Under The Stars",
          partnerName: "Alex",
          themeId: "midnight-velvet",
          storyContent: {
            question: "Will you marry me, Alex?",
            introMessage: "To the love of my life...",
            letterText: "Every single day with you is paradise.",
          },
        }),
      });

      const res = await createProposalHandler(request);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.proposal.creator_id).toBe(creator1.id);
      expect(json.proposal.status).toBe("DRAFT");
      expect(json.proposal.title).toBe("A Night Under The Stars");
      expect(json.proposal.partner_name).toBe("Alex");
      expect(json.proposal.theme_id).toBe("midnight-velvet");
      expect(json.proposal.slug).toBeTruthy();

      // Ensure proposal is stored in DB
      const stored = findProposalById(dbModule.getDb(), json.proposal.id);
      expect(stored).not.toBeNull();
      expect(stored?.creator_id).toBe(creator1.id);
    });

    it("prevents slug collisions by returning 409 Conflict", async () => {
      // First proposal with custom slug
      const req1 = new NextRequest("http://localhost:3000/api/proposals", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({
          title: "First",
          partnerName: "Alex",
          slug: "unique-love-journey",
        }),
      });
      const res1 = await createProposalHandler(req1);
      expect(res1.status).toBe(201);

      // Second proposal attempting same slug
      const req2 = new NextRequest("http://localhost:3000/api/proposals", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}`,
        },
        body: JSON.stringify({
          title: "Second",
          partnerName: "Jordan",
          slug: "unique-love-journey",
        }),
      });
      const res2 = await createProposalHandler(req2);
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.error).toContain("already taken");
    });
  });

  describe("Proposal Listing (GET /api/proposals)", () => {
    it("lists only proposals belonging to the authenticated creator", async () => {
      // Create 2 proposals for creator1
      createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        slug: "proposal-1-c1",
        title: "C1 Proposal 1",
        partnerName: "Pat 1",
        themeId: "midnight-velvet",
        storyContent: "{}",
      });
      createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        slug: "proposal-2-c1",
        title: "C1 Proposal 2",
        partnerName: "Pat 2",
        themeId: "midnight-velvet",
        storyContent: "{}",
      });

      // Create 1 proposal for creator2
      createProposal(dbModule.getDb(), {
        creatorId: creator2.id,
        slug: "proposal-1-c2",
        title: "C2 Proposal 1",
        partnerName: "Pat 3",
        themeId: "sunset-terrace",
        storyContent: "{}",
      });

      const req1 = new NextRequest("http://localhost:3000/api/proposals", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });
      const res1 = await listProposalsHandler(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.proposals).toHaveLength(2);
      expect(json1.proposals.every((p: { creator_id: string }) => p.creator_id === creator1.id)).toBe(true);

      const req2 = new NextRequest("http://localhost:3000/api/proposals", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}`,
        },
      });
      const res2 = await listProposalsHandler(req2);
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.proposals).toHaveLength(1);
      expect(json2.proposals[0].creator_id).toBe(creator2.id);
    });
  });

  describe("Proposal Retrieval (GET /api/proposals/[id]) & Non-Disclosure", () => {
    it("returns proposal if requested by the owner", async () => {
      const proposal = createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        slug: "c1-retrieval-test",
        title: "Proposal for Alex",
        partnerName: "Alex",
        themeId: "midnight-velvet",
        storyContent: "{}",
      });

      const req = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}`, {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });
      const res = await getProposalHandler(req, { params: Promise.resolve({ id: proposal.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.proposal.id).toBe(proposal.id);
    });

    it("enforces 404 non-disclosure when another creator tries to fetch it", async () => {
      const proposal = createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        slug: "c1-private-proposal",
        title: "Proposal for Alex",
        partnerName: "Alex",
        themeId: "midnight-velvet",
        storyContent: "{}",
      });

      // Creator 2 attempts to fetch Creator 1's proposal
      const req = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}`, {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}`,
        },
      });
      const res = await getProposalHandler(req, { params: Promise.resolve({ id: proposal.id }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Proposal not found");
    });
  });

  describe("Live Mutable Proposal Updates (PATCH /api/proposals/[id])", () => {
    it("updates proposal in-place on the canonical row with no snapshots created", async () => {
      const proposal = createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        slug: "mutable-proposal",
        title: "Initial Title",
        partnerName: "Morgan",
        themeId: "midnight-velvet",
        storyContent: JSON.stringify({ letterText: "Original text" }),
      });

      const patchReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({
          title: "Updated Title Live",
          storyContent: {
            letterText: "Updated live letter text!",
          },
        }),
      });

      const res = await patchProposalHandler(patchReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.proposal.title).toBe("Updated Title Live");

      // Verify canonical row was updated and no extra rows exist
      const allProposals = findProposalsByCreatorId(dbModule.getDb(), creator1.id);
      expect(allProposals).toHaveLength(1);
      expect(allProposals[0].id).toBe(proposal.id);
      expect(allProposals[0].title).toBe("Updated Title Live");
      expect(JSON.parse(allProposals[0].story_content).letterText).toBe("Updated live letter text!");
    });
  });

  describe("Proposal Publishing (POST /api/proposals/[id]/publish)", () => {
    it("allows authenticated creator to publish proposal directly without payment or paywall", async () => {
      const proposal = createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        slug: "direct-publish-proposal",
        title: "Direct Proposal",
        partnerName: "Sam",
        themeId: "sunset-terrace",
        storyContent: "{}",
      });

      const publishReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({ action: "publish" }),
      });

      const res = await publishProposalHandler(publishReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.proposal.status).toBe("PUBLISHED");
      expect(json.proposal.published_at).not.toBeNull();

      // Verify status in DB is PUBLISHED
      const stored = findProposalById(dbModule.getDb(), proposal.id);
      expect(stored?.status).toBe("PUBLISHED");

      // Now test unpublish
      const unpublishReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({ action: "unpublish" }),
      });

      const unpublishRes = await publishProposalHandler(unpublishReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(unpublishRes.status).toBe(200);
      const unpublishJson = await unpublishRes.json();
      expect(unpublishJson.proposal.status).toBe("UNPUBLISHED");
    });
  });

  describe("Proposal Soft Deletion (DELETE /api/proposals/[id])", () => {
    it("soft deletes proposal and excludes it from active listings", async () => {
      const proposal = createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        slug: "proposal-to-delete",
        title: "To Be Deleted",
        partnerName: "Rowan",
        themeId: "celestial-rose",
        storyContent: "{}",
      });

      const delReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}`, {
        method: "DELETE",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });

      const res = await deleteProposalHandler(delReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(res.status).toBe(200);

      // Proposal should not show in creator's list
      const list = findProposalsByCreatorId(dbModule.getDb(), creator1.id);
      expect(list).toHaveLength(0);

      // Proposal in DB has status DELETED
      const rawProposal = findProposalById(dbModule.getDb(), proposal.id);
      expect(rawProposal?.status).toBe("DELETED");

      // Fetching soft-deleted proposal returns 404
      const getReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}`, {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });
      const getRes = await getProposalHandler(getReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(getRes.status).toBe(404);
    });
  });
});
