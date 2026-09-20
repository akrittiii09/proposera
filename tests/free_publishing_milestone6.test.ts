import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  createProposal,
  findProposalById,
  findResponsesByProposalId,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { POST as publishProposalHandler } from "@/app/api/proposals/[id]/publish/route";
import { PATCH as patchProposalHandler } from "@/app/api/proposals/[id]/route";
import { GET as getPublicProposalHandler } from "@/app/api/proposals/[id]/public/route";
import { POST as postRespondHandler } from "@/app/api/proposals/[id]/respond/route";
import { GET as getResponsesHandler } from "@/app/api/proposals/[id]/responses/route";
import * as dbModule from "@/lib/db";

describe("Milestone 6: Free Proposal Publishing & Complete Lifecycle (No Paywall)", () => {
  let db: DatabaseSync;
  let creator1: { id: string; email: string };
  let creator2: { id: string; email: string };
  let sessionToken1: string;
  let sessionToken2: string;

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
  });

  afterEach(() => {
    db.close();
    dbModule.closeDb();
  });

  it("A. allows authenticated creator to publish proposal directly without any payment", async () => {
    const proposal = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      slug: "free-romantic-story",
      title: "Our Journey Together",
      partnerName: "Elena",
      themeId: "midnight-velvet",
      storyContent: { question: "Will you marry me?" },
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
    expect(json.status).toBe("PUBLISHED");
    expect(json.proposal.status).toBe("PUBLISHED");
    expect(json.proposal.published_at).not.toBeNull();

    const stored = findProposalById(dbModule.getDb(), proposal.id);
    expect(stored?.status).toBe("PUBLISHED");
  });

  it("B. published proposal is immediately accessible on public URL without auth", async () => {
    const proposal = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      slug: "elena-forever-love",
      title: "Elena & Alex",
      partnerName: "Elena",
      themeId: "sunset-terrace",
      storyContent: { question: "Will you marry me?" },
    });

    // Publish proposal
    const pubReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      body: JSON.stringify({ action: "publish" }),
    });
    await publishProposalHandler(pubReq, { params: Promise.resolve({ id: proposal.id }) });

    // Public recipient request (unauthenticated)
    const publicReq = new NextRequest("http://localhost:3000/api/proposals/elena-forever-love/public");
    const publicRes = await getPublicProposalHandler(publicReq, {
      params: Promise.resolve({ id: "elena-forever-love" }),
    });

    expect(publicRes.status).toBe(200);
    const json = await publicRes.json();
    expect(json.proposal.title).toBe("Elena & Alex");
    expect(json.proposal.partner_name).toBe("Elena");
    expect(json.proposal.slug).toBe("elena-forever-love");
    // Ensure creator ID and private details are stripped
    expect(json.proposal.creator_id).toBeUndefined();
    expect(json.proposal.id).toBeUndefined();
  });

  it("C. editing a published proposal immediately updates the same public URL", async () => {
    const proposal = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      slug: "live-update-url",
      title: "Initial Title",
      partnerName: "Elena",
      themeId: "midnight-velvet",
      storyContent: { question: "Will you marry me?" },
    });

    // Publish
    const pubReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      body: JSON.stringify({ action: "publish" }),
    });
    await publishProposalHandler(pubReq, { params: Promise.resolve({ id: proposal.id }) });

    // Creator edits title
    const patchReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      body: JSON.stringify({ title: "Updated Romantic Title" }),
    });
    const patchRes = await patchProposalHandler(patchReq, { params: Promise.resolve({ id: proposal.id }) });
    expect(patchRes.status).toBe(200);

    // Public fetch reflects updated title immediately
    const publicReq = new NextRequest("http://localhost:3000/api/proposals/live-update-url/public");
    const publicRes = await getPublicProposalHandler(publicReq, {
      params: Promise.resolve({ id: "live-update-url" }),
    });

    expect(publicRes.status).toBe(200);
    const json = await publicRes.json();
    expect(json.proposal.title).toBe("Updated Romantic Title");
  });

  it("D. recipient response flow works on published proposal", async () => {
    const proposal = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      slug: "respond-check-url",
      title: "Respond Test",
      partnerName: "Elena",
      themeId: "midnight-velvet",
      storyContent: { question: "Will you marry me?" },
    });

    // Publish
    const pubReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      body: JSON.stringify({ action: "publish" }),
    });
    await publishProposalHandler(pubReq, { params: Promise.resolve({ id: proposal.id }) });

    // Recipient responds
    const respondReq = new NextRequest("http://localhost:3000/api/proposals/respond-check-url/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choice: "YES_ALWAYS",
        customNote: "Yes, I cannot wait!",
      }),
    });
    const respondRes = await postRespondHandler(respondReq, {
      params: Promise.resolve({ id: "respond-check-url" }),
    });

    expect(respondRes.status).toBe(201);
    const respondJson = await respondRes.json();
    expect(respondJson.success).toBe(true);
    expect(respondJson.response.choice).toBe("YES_ALWAYS");
    expect(respondJson.response.custom_note).toBe("Yes, I cannot wait!");
  });

  it("E. creator can retrieve their own proposal responses", async () => {
    const proposal = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      slug: "creator-view-url",
      title: "Creator Retrieval Test",
      partnerName: "Elena",
      themeId: "midnight-velvet",
      storyContent: { question: "Will you marry me?" },
    });

    // Publish
    const pubReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      body: JSON.stringify({ action: "publish" }),
    });
    await publishProposalHandler(pubReq, { params: Promise.resolve({ id: proposal.id }) });

    // Recipient responds
    const respondReq = new NextRequest("http://localhost:3000/api/proposals/creator-view-url/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice: "YES_A_THOUSAND_TIMES" }),
    });
    await postRespondHandler(respondReq, { params: Promise.resolve({ id: "creator-view-url" }) });

    // Creator retrieves responses
    const getRespReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/responses`, {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
    });
    const getRespRes = await getResponsesHandler(getRespReq, {
      params: Promise.resolve({ id: proposal.id }),
    });

    expect(getRespRes.status).toBe(200);
    const json = await getRespRes.json();
    expect(json.responses).toHaveLength(1);
    expect(json.responses[0].choice).toBe("YES_A_THOUSAND_TIMES");
  });

  it("F. unauthorized users and foreign creators cannot modify or publish proposal", async () => {
    const proposal = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      slug: "secure-auth-url",
      title: "Private Ownership Proposal",
      partnerName: "Elena",
      themeId: "midnight-velvet",
      storyContent: { question: "Will you marry me?" },
    });

    // 1. Unauthenticated request to publish -> 401
    const unauthReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
      method: "POST",
      body: JSON.stringify({ action: "publish" }),
    });
    const unauthRes = await publishProposalHandler(unauthReq, {
      params: Promise.resolve({ id: proposal.id }),
    });
    expect(unauthRes.status).toBe(401);

    // 2. Foreign creator request to publish -> 404 non-disclosure
    const foreignReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}` },
      body: JSON.stringify({ action: "publish" }),
    });
    const foreignRes = await publishProposalHandler(foreignReq, {
      params: Promise.resolve({ id: proposal.id }),
    });
    expect(foreignRes.status).toBe(404);

    // 3. Foreign creator request to read responses -> 404 non-disclosure
    const foreignRespReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/responses`, {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}` },
    });
    const foreignRespRes = await getResponsesHandler(foreignRespReq, {
      params: Promise.resolve({ id: proposal.id }),
    });
    expect(foreignRespRes.status).toBe(404);
  });

  it("G. confirms no active paywall or entitlement requirement remains in the publishing path", async () => {
    // Fresh creator registers and immediately publishes without any payment or entitlement record
    const passHash3 = await hashPassword("FreshCreatorPassword!");
    const creator3 = createCreator(dbModule.getDb(), {
      email: "fresh@proposera.test",
      passwordHash: passHash3,
    });
    const s3 = createSession(dbModule.getDb(), creator3.id);

    const proposal = createProposal(dbModule.getDb(), {
      creatorId: creator3.id,
      slug: "fresh-creator-free-publish",
      title: "Zero Friction Proposal",
      partnerName: "Maya",
      themeId: "midnight-velvet",
      storyContent: { question: "Will you marry me?" },
    });

    const pubReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal.id}/publish`, {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${s3.id}` },
      body: JSON.stringify({ action: "publish" }),
    });
    const pubRes = await publishProposalHandler(pubReq, {
      params: Promise.resolve({ id: proposal.id }),
    });

    expect(pubRes.status).toBe(200);
    const pubJson = await pubRes.json();
    expect(pubJson.success).toBe(true);
    expect(pubJson.status).toBe("PUBLISHED");

    // Verify creator_entitlements table was completely removed from database
    const tableCheck = dbModule
      .getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='creator_entitlements'")
      .get();
    expect(tableCheck).toBeUndefined();
  });
});
