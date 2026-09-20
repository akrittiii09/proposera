import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  createProposal,
  findProposalById,
  updateProposalStatus,
  findResponsesByProposalId,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { GET as getPublicProposalHandler } from "@/app/api/proposals/[id]/public/route";
import { POST as postRespondHandler } from "@/app/api/proposals/[id]/respond/route";
import { GET as getResponsesHandler } from "@/app/api/proposals/[id]/responses/route";
import {
  PATCH as patchProposalHandler,
  GET as getProposalHandler,
} from "@/app/api/proposals/[id]/route";
import { POST as publishProposalHandler } from "@/app/api/proposals/[id]/publish/route";
import * as dbModule from "@/lib/db";

describe("Milestone 5: Live Mutable Publishing Integration", () => {
  let db: DatabaseSync;
  let creator1: { id: string; email: string };
  let creator2: { id: string; email: string };
  let sessionToken1: string;
  let sessionToken2: string;

  beforeEach(async () => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);

    // Point global getDb to our in-memory SQLite instance
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

  describe("1. Live Update Reflection Without Republishing", () => {
    it("immediately reflects creator edits in the public projection without republishing and preserves PUBLISHED status", async () => {
      const activeDb = dbModule.getDb();
      const slug = "elena-sunset-journey-a1b2";

      // Create proposal
      const proposal = createProposal(activeDb, {
        creatorId: creator1.id,
        title: "Sunset in Paris",
        partnerName: "Elena",
        slug,
        themeId: "midnight-velvet",
        storyContent: {
          introMessage: "Elena, from the moment we met...",
          letterText: "You made my world brighter.",
          question: "Will you spend forever with me?",
        },
      });

      // Publish proposal via API
      const publishReq = new NextRequest(
        `http://localhost:3000/api/proposals/${proposal.id}/publish`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ action: "publish" }),
        }
      );
      const publishRes = await publishProposalHandler(publishReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(publishRes.status).toBe(200);

      // Verify initial public projection
      const pubReq1 = new NextRequest(`http://localhost:3000/api/proposals/${slug}/public`);
      const pubRes1 = await getPublicProposalHandler(pubReq1, {
        params: Promise.resolve({ slug }),
      });
      expect(pubRes1.status).toBe(200);
      const pubJson1 = await pubRes1.json();
      expect(pubJson1.proposal.title).toBe("Sunset in Paris");
      expect(pubJson1.proposal.partner_name).toBe("Elena");
      expect(pubJson1.proposal.story_content.introMessage).toBe("Elena, from the moment we met...");

      // Update proposal via PATCH /api/proposals/[id]
      const patchReq = new NextRequest(
        `http://localhost:3000/api/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "Sunset in Rome & Paris",
            partnerName: "Elena Marie",
            storyContent: {
              introMessage: "Elena, from Rome to Paris...",
              letterText: "Our journey has only just begun.",
              question: "Will you marry me?",
            },
          }),
        }
      );
      const patchRes = await patchProposalHandler(patchReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();
      expect(patchJson.proposal.status).toBe("PUBLISHED");

      // Verify public projection immediately returns updated content without republishing
      const pubReq2 = new NextRequest(`http://localhost:3000/api/proposals/${slug}/public`);
      const pubRes2 = await getPublicProposalHandler(pubReq2, {
        params: Promise.resolve({ slug }),
      });
      expect(pubRes2.status).toBe(200);
      const pubJson2 = await pubRes2.json();
      expect(pubJson2.proposal.title).toBe("Sunset in Rome & Paris");
      expect(pubJson2.proposal.partner_name).toBe("Elena Marie");
      expect(pubJson2.proposal.story_content.introMessage).toBe("Elena, from Rome to Paris...");
      expect(pubJson2.proposal.story_content.letterText).toBe("Our journey has only just begun.");
      expect(pubJson2.proposal.story_content.question).toBe("Will you marry me?");
    });
  });

  describe("2. Canonical Row Invariance", () => {
    it("maintains exactly 1 database row throughout lifecycle, keeping ID and published_at constant while updated_at advances", async () => {
      const activeDb = dbModule.getDb();
      const slug = "maya-starry-night-c3d4";

      // 1. Create proposal
      const proposal = createProposal(activeDb, {
        creatorId: creator1.id,
        title: "Starry Night",
        partnerName: "Maya",
        slug,
        themeId: "midnight-velvet",
        storyContent: {
          introMessage: "To Maya...",
          letterText: "Under a blanket of stars...",
          question: "Will you marry me?",
        },
      });
      const canonicalId = proposal.id;

      // Check row count = 1
      const countAfterCreate = activeDb
        .prepare("SELECT COUNT(*) as count FROM proposals WHERE creator_id = ?")
        .get(creator1.id) as { count: number };
      expect(countAfterCreate.count).toBe(1);

      // 2. Publish proposal
      updateProposalStatus(activeDb, canonicalId, creator1.id, "PUBLISHED");
      const publishedRow = findProposalById(activeDb, canonicalId);
      expect(publishedRow).not.toBeNull();
      expect(publishedRow?.status).toBe("PUBLISHED");
      const originalPublishedAt = publishedRow?.published_at;
      expect(originalPublishedAt).toBeTruthy();
      const originalUpdatedAt = publishedRow?.updated_at;

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 3. Update published proposal via PATCH /api/proposals/[id]
      const patchReq = new NextRequest(
        `http://localhost:3000/api/proposals/${canonicalId}`,
        {
          method: "PATCH",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "Starry Night in Tokyo",
            partnerName: "Maya Lin",
          }),
        }
      );
      const patchRes = await patchProposalHandler(patchReq, {
        params: Promise.resolve({ id: canonicalId }),
      });
      expect(patchRes.status).toBe(200);

      // 4. Verify canonical row invariance
      const allRows = activeDb
        .prepare("SELECT * FROM proposals WHERE creator_id = ?")
        .all(creator1.id) as any[];
      expect(allRows.length).toBe(1);

      const updatedRow = allRows[0];
      expect(updatedRow.id).toBe(canonicalId);
      expect(updatedRow.status).toBe("PUBLISHED");
      expect(updatedRow.published_at).toBe(originalPublishedAt);
      expect(new Date(updatedRow.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt!).getTime()
      );

      // 5. Verify no snapshot, history, or revision tables exist in SQLite
      const tables = activeDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames.some((n) => n.includes("snapshot"))).toBe(false);
      expect(tableNames.some((n) => n.includes("history"))).toBe(false);
      expect(tableNames.some((n) => n.includes("revision"))).toBe(false);
      expect(tableNames.some((n) => n.includes("version"))).toBe(false);
    });
  });

  describe("3. Response Continuity Across Edits", () => {
    it("preserves response attachment to the canonical proposal ID across edits", async () => {
      const activeDb = dbModule.getDb();
      const slug = "clara-golden-hour-e5f6";

      const proposal = createProposal(activeDb, {
        creatorId: creator1.id,
        title: "Golden Hour with Clara",
        partnerName: "Clara",
        slug,
        themeId: "sunset-terrace",
        storyContent: {
          introMessage: "To Clara...",
          letterText: "Our golden hour...",
          question: "Will you say yes?",
        },
      });
      updateProposalStatus(activeDb, proposal.id, creator1.id, "PUBLISHED");

      // Recipient response 1 before edit
      const respReq1 = new NextRequest(
        `http://localhost:3000/api/proposals/${slug}/respond`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0 TestBrowser1",
          },
          body: JSON.stringify({
            choice: "YES",
            customNote: "Yes, a thousand times yes!",
          }),
        }
      );
      const respRes1 = await postRespondHandler(respReq1, {
        params: Promise.resolve({ slug }),
      });
      expect(respRes1.status).toBe(201);
      const respJson1 = await respRes1.json();
      expect(respJson1.response.id).toBeDefined();
      expect(respJson1.response.choice).toBe("YES");

      // Creator edits published proposal
      const patchReq = new NextRequest(
        `http://localhost:3000/api/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "Golden Hour Forever with Clara",
            storyContent: {
              introMessage: "To Clara, always and forever...",
              letterText: "Our golden hours will never end.",
              question: "Will you say yes?",
            },
          }),
        }
      );
      const patchRes = await patchProposalHandler(patchReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(patchRes.status).toBe(200);

      // Recipient response 2 after edit
      const respReq2 = new NextRequest(
        `http://localhost:3000/api/proposals/${slug}/respond`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0 TestBrowser2",
          },
          body: JSON.stringify({
            choice: "YES",
            customNote: "Even after the edit, always yes!",
          }),
        }
      );
      const respRes2 = await postRespondHandler(respReq2, {
        params: Promise.resolve({ slug }),
      });
      expect(respRes2.status).toBe(201);

      // Creator queries responses via GET /api/proposals/[id]/responses
      const listRespReq = new NextRequest(
        `http://localhost:3000/api/proposals/${proposal.id}/responses`,
        {
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
          },
        }
      );
      const listRespRes = await getResponsesHandler(listRespReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(listRespRes.status).toBe(200);
      const listJson = await listRespRes.json();
      expect(listJson.responses).toHaveLength(2);

      const notes = listJson.responses.map((r: { custom_note: string }) => r.custom_note);
      expect(notes).toContain("Yes, a thousand times yes!");
      expect(notes).toContain("Even after the edit, always yes!");

      // Verify direct database link
      const directDbResponses = findResponsesByProposalId(activeDb, proposal.id, creator1.id);
      expect(directDbResponses).not.toBeNull();
      expect(directDbResponses!.length).toBe(2);
    });
  });

  describe("4. Published Slug Mutation", () => {
    it("updates slug on published proposal; old slug yields 404, new slug yields 200 with updated content", async () => {
      const activeDb = dbModule.getDb();
      const oldSlug = "olivia-original-slug-g7h8";
      const newSlug = "olivia-updated-slug-j9k0";

      const proposal = createProposal(activeDb, {
        creatorId: creator1.id,
        title: "Original Romance",
        partnerName: "Olivia",
        slug: oldSlug,
        themeId: "midnight-velvet",
        storyContent: {
          introMessage: "To Olivia...",
          letterText: "Original text...",
          question: "Marry me?",
        },
      });
      updateProposalStatus(activeDb, proposal.id, creator1.id, "PUBLISHED");

      // Verify old slug returns 200
      const oldSlugReq = new NextRequest(
        `http://localhost:3000/api/proposals/${oldSlug}/public`
      );
      const oldSlugRes = await getPublicProposalHandler(oldSlugReq, {
        params: Promise.resolve({ slug: oldSlug }),
      });
      expect(oldSlugRes.status).toBe(200);

      // Mutate slug via PATCH /api/proposals/[id]
      const patchReq = new NextRequest(
        `http://localhost:3000/api/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            slug: newSlug,
            title: "Updated Romance",
          }),
        }
      );
      const patchRes = await patchProposalHandler(patchReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(patchRes.status).toBe(200);

      // Old slug must now return 404 (non-disclosure / not found)
      const oldSlugReq2 = new NextRequest(
        `http://localhost:3000/api/proposals/${oldSlug}/public`
      );
      const oldSlugRes2 = await getPublicProposalHandler(oldSlugReq2, {
        params: Promise.resolve({ slug: oldSlug }),
      });
      expect(oldSlugRes2.status).toBe(404);

      // New slug must return 200 with updated content
      const newSlugReq = new NextRequest(
        `http://localhost:3000/api/proposals/${newSlug}/public`
      );
      const newSlugRes = await getPublicProposalHandler(newSlugReq, {
        params: Promise.resolve({ slug: newSlug }),
      });
      expect(newSlugRes.status).toBe(200);
      const newSlugJson = await newSlugRes.json();
      expect(newSlugJson.proposal.slug).toBe(newSlug);
      expect(newSlugJson.proposal.title).toBe("Updated Romance");

      // Verify proposal count remains 1
      const count = activeDb
        .prepare("SELECT COUNT(*) as count FROM proposals WHERE creator_id = ?")
        .get(creator1.id) as { count: number };
      expect(count.count).toBe(1);
    });
  });

  describe("5. Ownership & Non-Disclosure Invariants", () => {
    it("prevents unauthorized creator or unauthenticated user from editing published proposal", async () => {
      const activeDb = dbModule.getDb();
      const slug = "secret-proposal-m1n2";

      const proposal = createProposal(activeDb, {
        creatorId: creator1.id,
        title: "Creator 1 Exclusive",
        partnerName: "Aria",
        slug,
        themeId: "midnight-velvet",
        storyContent: {
          introMessage: "To Aria...",
          letterText: "Private story...",
          question: "Will you marry me?",
        },
      });
      updateProposalStatus(activeDb, proposal.id, creator1.id, "PUBLISHED");

      // 1. Unauthenticated PATCH returns 401
      const unauthPatchReq = new NextRequest(
        `http://localhost:3000/api/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ title: "Hacked Title" }),
        }
      );
      const unauthPatchRes = await patchProposalHandler(unauthPatchReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(unauthPatchRes.status).toBe(401);

      // 2. Unauthorized creator (Creator 2) PATCH returns 404 (existence non-disclosure)
      const unownedPatchReq = new NextRequest(
        `http://localhost:3000/api/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ title: "Creator 2 Tampering" }),
        }
      );
      const unownedPatchRes = await patchProposalHandler(unownedPatchReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(unownedPatchRes.status).toBe(404);

      // 3. Draft proposal unauthenticated public request returns 404
      const draftSlug = "unshared-draft-p3q4";
      createProposal(activeDb, {
        creatorId: creator1.id,
        title: "Unshared Draft",
        partnerName: "Aria",
        slug: draftSlug,
        themeId: "midnight-velvet",
        storyContent: {
          introMessage: "Draft intro",
          letterText: "Draft text",
          question: "Draft question",
        },
      });

      const draftPubReq = new NextRequest(
        `http://localhost:3000/api/proposals/${draftSlug}/public`
      );
      const draftPubRes = await getPublicProposalHandler(draftPubReq, {
        params: Promise.resolve({ slug: draftSlug }),
      });
      expect(draftPubRes.status).toBe(404);
    });
  });
});
