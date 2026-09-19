import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  findCreatorById,
  findCreatorByEmail,
  updateCreatorPassword,
  createProposal,
  findProposalById,
  findProposalsByCreatorId,
  findProposalBySlug,
  findPublishedProposalBySlug,
  getPublicProjection,
  updateProposal,
  updateProposalStatus,
  deleteProposal,
  createResponse,
  findResponsesByProposalId,
  createOrUpdateEntitlement,
  findEntitlementByCreatorId,
  isCreatorEntitled,
} from "@/lib/db/repositories";

describe("Database Foundation & Repositories", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);
  });

  afterEach(() => {
    db.close();
  });

  describe("Schema & Constraints", () => {
    it("creates all required tables", () => {
      const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      const tables = (stmt.all() as { name: string }[]).map((row) => row.name);
      expect(tables).toContain("creators");
      expect(tables).toContain("proposals");
      expect(tables).toContain("responses");
      expect(tables).toContain("creator_entitlements");
      expect(tables).toContain("sessions");
    });

    it("enforces unique email constraint on creators", () => {
      createCreator(db, { email: "alex@example.com", passwordHash: "hash123" });
      expect(() => {
        createCreator(db, { email: "alex@example.com", passwordHash: "hash456" });
      }).toThrow();
    });

    it("enforces case-insensitive email uniqueness", () => {
      createCreator(db, { email: "alex@example.com", passwordHash: "hash123" });
      expect(() => {
        createCreator(db, { email: "ALEX@EXAMPLE.COM", passwordHash: "hash456" });
      }).toThrow();
    });

    it("enforces foreign key constraint from proposal to creator", () => {
      expect(() => {
        createProposal(db, {
          creatorId: "non-existent-creator",
          title: "Test",
          partnerName: "Taylor",
        });
      }).toThrow();
    });

    it("enforces status check constraint on proposals", () => {
      const creator = createCreator(db, { email: "creator@example.com", passwordHash: "h" });
      expect(() => {
        db.prepare(
          "INSERT INTO proposals (id, creator_id, title, partner_name, slug, status, theme_id, custom_theme_overrides, story_content, created_at, updated_at) VALUES ('1', ?, 't', 'p', 's-1', 'INVALID_STATUS', 't', '{}', '{}', '2026-01-01', '2026-01-01')"
        ).run(creator.id);
      }).toThrow();
    });

    it("cascades deletion from creator to proposals and responses", () => {
      const creator = createCreator(db, { email: "delete-me@example.com", passwordHash: "h" });
      const proposal = createProposal(db, {
        creatorId: creator.id,
        title: "To Delete",
        partnerName: "Jordan",
      });
      createResponse(db, {
        proposalId: proposal.id,
        choice: "YES",
      });

      // Delete creator
      db.prepare("DELETE FROM creators WHERE id = ?").run(creator.id);

      expect(findProposalById(db, proposal.id)).toBeNull();
      const respStmt = db.prepare("SELECT * FROM responses WHERE proposal_id = ?");
      expect(respStmt.all(proposal.id)).toHaveLength(0);
    });
  });

  describe("Creator Operations", () => {
    it("creates and retrieves creator by id and email", () => {
      const created = createCreator(db, {
        email: "Sam@Example.Com",
        passwordHash: "secure_hash",
      });
      expect(created.id).toBeDefined();
      expect(created.email).toBe("sam@example.com");

      const byId = findCreatorById(db, created.id);
      expect(byId).not.toBeNull();
      expect(byId?.email).toBe("sam@example.com");

      const byEmail = findCreatorByEmail(db, "SAM@example.com");
      expect(byEmail).not.toBeNull();
      expect(byEmail?.id).toBe(created.id);
    });

    it("updates creator password hash", () => {
      const created = createCreator(db, { email: "user@test.com", passwordHash: "old_hash" });
      const updated = updateCreatorPassword(db, created.id, "new_hash");
      expect(updated).toBe(true);

      const refreshed = findCreatorById(db, created.id);
      expect(refreshed?.password_hash).toBe("new_hash");
    });
  });

  describe("Proposal Operations & Ownership", () => {
    it("creates a proposal in DRAFT state with generated slug", () => {
      const creator = createCreator(db, { email: "c1@test.com", passwordHash: "h" });
      const proposal = createProposal(db, {
        creatorId: creator.id,
        title: "Our Story",
        partnerName: "Sophia",
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.status).toBe("DRAFT");
      expect(proposal.slug).toContain("sophia-");
      expect(proposal.published_at).toBeNull();
    });

    it("finds proposals by creator ID excluding soft-deleted ones", () => {
      const creator = createCreator(db, { email: "c2@test.com", passwordHash: "h" });
      const p1 = createProposal(db, { creatorId: creator.id, title: "P1", partnerName: "P1" });
      const p2 = createProposal(db, { creatorId: creator.id, title: "P2", partnerName: "P2" });

      let list = findProposalsByCreatorId(db, creator.id);
      expect(list).toHaveLength(2);

      deleteProposal(db, p1.id, creator.id);
      list = findProposalsByCreatorId(db, creator.id);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(p2.id);
    });

    it("enforces strict ownership on proposal updates", () => {
      const creatorA = createCreator(db, { email: "a@test.com", passwordHash: "h" });
      const creatorB = createCreator(db, { email: "b@test.com", passwordHash: "h" });

      const proposalA = createProposal(db, {
        creatorId: creatorA.id,
        title: "Original Title",
        partnerName: "Partner A",
      });

      // Creator B attempts to edit Creator A's proposal
      const maliciousEdit = updateProposal(db, proposalA.id, creatorB.id, {
        title: "Hacked Title",
      });
      expect(maliciousEdit).toBeNull();

      // Verify proposal was untouched
      const original = findProposalById(db, proposalA.id);
      expect(original?.title).toBe("Original Title");

      // Creator A edits their own proposal
      const validEdit = updateProposal(db, proposalA.id, creatorA.id, {
        title: "Updated Title",
      });
      expect(validEdit?.title).toBe("Updated Title");
    });

    it("reflects live mutable edits on published proposals immediately", () => {
      const creator = createCreator(db, { email: "live@test.com", passwordHash: "h" });
      const proposal = createProposal(db, {
        creatorId: creator.id,
        title: "Initial Title",
        partnerName: "Emma",
        slug: "emma-love-1234",
      });

      // Publish the proposal
      updateProposalStatus(db, proposal.id, creator.id, "PUBLISHED");
      const published = findPublishedProposalBySlug(db, "emma-love-1234");
      expect(published).not.toBeNull();
      expect(published?.title).toBe("Initial Title");

      // Creator edits published proposal
      updateProposal(db, proposal.id, creator.id, {
        title: "Edited Title While Published",
      });

      // Public published lookup reflects the edit immediately
      const refreshedPublished = findPublishedProposalBySlug(db, "emma-love-1234");
      expect(refreshedPublished?.title).toBe("Edited Title While Published");
    });

    it("serves only PUBLISHED proposals through findPublishedProposalBySlug", () => {
      const creator = createCreator(db, { email: "status@test.com", passwordHash: "h" });
      const proposal = createProposal(db, {
        creatorId: creator.id,
        title: "Draft Proposal",
        partnerName: "Alex",
        slug: "alex-secret-slug",
      });

      // In DRAFT state, published query returns null
      expect(findPublishedProposalBySlug(db, "alex-secret-slug")).toBeNull();

      // Transition to PUBLISHED
      updateProposalStatus(db, proposal.id, creator.id, "PUBLISHED");
      expect(findPublishedProposalBySlug(db, "alex-secret-slug")).not.toBeNull();

      // Transition to UNPUBLISHED
      updateProposalStatus(db, proposal.id, creator.id, "UNPUBLISHED");
      expect(findPublishedProposalBySlug(db, "alex-secret-slug")).toBeNull();
    });

    it("sanitizes public projection to strip private fields", () => {
      const creator = createCreator(db, { email: "priv@test.com", passwordHash: "h" });
      const proposal = createProposal(db, {
        creatorId: creator.id,
        title: "Private Title",
        partnerName: "Chloe",
        slug: "chloe-proposal",
        themeId: "sunset-terrace",
        storyContent: { milestones: [{ title: "First Met" }] },
      });

      const projection = getPublicProjection(proposal);
      expect((projection as unknown as Record<string, unknown>).creator_id).toBeUndefined();
      expect((projection as unknown as Record<string, unknown>).password_hash).toBeUndefined();
      expect(projection.slug).toBe("chloe-proposal");
      expect(projection.partner_name).toBe("Chloe");
      expect(projection.theme_id).toBe("sunset-terrace");
      expect(projection.story_content).toEqual({ milestones: [{ title: "First Met" }] });
    });
  });

  describe("Response Operations", () => {
    it("creates response and retrieves it only for authorized creator", () => {
      const creator = createCreator(db, { email: "resp@test.com", passwordHash: "h" });
      const otherCreator = createCreator(db, { email: "other@test.com", passwordHash: "h" });
      const proposal = createProposal(db, {
        creatorId: creator.id,
        title: "P",
        partnerName: "Riley",
      });

      const response = createResponse(db, {
        proposalId: proposal.id,
        choice: "AFFIRMATIVE",
        customNote: "I love you forever!",
      });
      expect(response.id).toBeDefined();

      // Creator of the proposal retrieves responses
      const creatorResponses = findResponsesByProposalId(db, proposal.id, creator.id);
      expect(creatorResponses).toHaveLength(1);
      expect(creatorResponses?.[0].choice).toBe("AFFIRMATIVE");
      expect(creatorResponses?.[0].custom_note).toBe("I love you forever!");

      // Other creator attempts to retrieve responses -> rejected (returns null)
      const unauthorizedResponses = findResponsesByProposalId(db, proposal.id, otherCreator.id);
      expect(unauthorizedResponses).toBeNull();
    });
  });

  describe("Entitlement Operations (Razorpay Paywall)", () => {
    it("manages creator entitlement lifecycle", () => {
      const creator = createCreator(db, { email: "pay@test.com", passwordHash: "h" });
      expect(isCreatorEntitled(db, creator.id)).toBe(false);

      // Create ACTIVE entitlement
      createOrUpdateEntitlement(db, {
        creatorId: creator.id,
        status: "ACTIVE",
        externalReference: "pay_123456789",
      });
      expect(isCreatorEntitled(db, creator.id)).toBe(true);

      // Update to INACTIVE
      createOrUpdateEntitlement(db, {
        creatorId: creator.id,
        status: "INACTIVE",
      });
      expect(isCreatorEntitled(db, creator.id)).toBe(false);
    });
  });
});
