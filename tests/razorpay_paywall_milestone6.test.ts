import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  createProposal,
  findEntitlementByCreatorId,
  findProposalById,
  createOrUpdateEntitlement,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { GET as getEntitlementHandler } from "@/app/api/billing/entitlement/route";
import { POST as postOrderHandler } from "@/app/api/billing/order/route";
import { POST as postVerifyHandler } from "@/app/api/billing/verify/route";
import { POST as postWebhookHandler } from "@/app/api/billing/webhook/route";
import { POST as publishProposalHandler } from "@/app/api/proposals/[id]/publish/route";
import { GET as getPublicProposalHandler } from "@/app/api/proposals/[id]/public/route";
import { POST as postRespondHandler } from "@/app/api/proposals/[id]/respond/route";
import * as dbModule from "@/lib/db";

const TEST_KEY_SECRET = "test_razorpay_secret_key_12345";
const TEST_WEBHOOK_SECRET = "test_webhook_secret_key_67890";

describe("Milestone 6: Razorpay / Paywall Integration", () => {
  let db: DatabaseSync;
  let creator1: { id: string; email: string };
  let creator2: { id: string; email: string };
  let sessionToken1: string;
  let sessionToken2: string;

  beforeEach(async () => {
    // Set test secrets in process.env
    process.env.RAZORPAY_KEY_ID = "rzp_test_key_123";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_key_123";
    process.env.PROPOSERA_PRICE_INR = "499";
    process.env.MOCK_PAYMENTS = "true";

    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);

    dbModule.getDb({ inMemory: true });

    // Seed Creator 1 (Initially UNENTITLED)
    const passHash1 = await hashPassword("Creator1Pass123!");
    creator1 = createCreator(dbModule.getDb(), {
      email: "creator1@proposera.test",
      passwordHash: passHash1,
    });
    const s1 = createSession(dbModule.getDb(), creator1.id);
    sessionToken1 = s1.id;

    // Seed Creator 2 (Initially UNENTITLED)
    const passHash2 = await hashPassword("Creator2Pass123!");
    creator2 = createCreator(dbModule.getDb(), {
      email: "creator2@proposera.test",
      passwordHash: passHash2,
    });
    const s2 = createSession(dbModule.getDb(), creator2.id);
    sessionToken2 = s2.id;
  });

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    delete process.env.PROPOSERA_PRICE_INR;
    delete process.env.MOCK_PAYMENTS;

    db.close();
    dbModule.closeDb();
  });

  describe("1. Authentication Gates & Entitlement Status", () => {
    it("rejects unauthenticated requests to billing endpoints with 401", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/billing/entitlement");
      const getRes = await getEntitlementHandler(getReq);
      expect(getRes.status).toBe(401);

      const orderReq = new NextRequest("http://localhost:3000/api/billing/order", {
        method: "POST",
      });
      const orderRes = await postOrderHandler(orderReq);
      expect(orderRes.status).toBe(401);

      const verifyReq = new NextRequest("http://localhost:3000/api/billing/verify", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const verifyRes = await postVerifyHandler(verifyReq);
      expect(verifyRes.status).toBe(401);
    });

    it("returns INACTIVE status for unentitled creator and blocks proposal publishing with 403", async () => {
      // Check entitlement endpoint
      const entReq = new NextRequest("http://localhost:3000/api/billing/entitlement", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      });
      const entRes = await getEntitlementHandler(entReq);
      expect(entRes.status).toBe(200);
      const entJson = await entRes.json();
      expect(entJson.entitled).toBe(false);
      expect(entJson.status).toBe("INACTIVE");
      expect(entJson.priceInr).toBe(499);

      // Create a draft proposal
      const proposal = createProposal(dbModule.getDb(), {
        creatorId: creator1.id,
        title: "Sunset Memories",
        partnerName: "Taylor",
        slug: "taylor-sunset-memories-z1x2",
        themeId: "midnight-velvet",
        storyContent: { question: "Marry me?" },
      });

      // Attempt to publish without entitlement
      const pubReq = new NextRequest(
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
      const pubRes = await publishProposalHandler(pubReq, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(pubRes.status).toBe(403);
      const pubJson = await pubRes.json();
      expect(pubJson.code).toBe("ENTITLEMENT_REQUIRED");

      // Verify proposal remains DRAFT
      const row = findProposalById(dbModule.getDb(), proposal.id);
      expect(row?.status).toBe("DRAFT");
    });
  });

  describe("2. Razorpay Order Creation (POST /api/billing/order)", () => {
    it("creates an order with correct amount in paise and keyId for unentitled creator", async () => {
      const req = new NextRequest("http://localhost:3000/api/billing/order", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      });
      const res = await postOrderHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.orderId).toBeDefined();
      expect(json.orderId.startsWith("order_")).toBe(true);
      expect(json.amount).toBe(49900); // 499 * 100 paise
      expect(json.currency).toBe("INR");
      expect(json.keyId).toBe("rzp_test_key_123");
    });

    it("returns { alreadyEntitled: true } if creator is already entitled", async () => {
      createOrUpdateEntitlement(dbModule.getDb(), {
        creatorId: creator1.id,
        status: "ACTIVE",
        externalReference: "pay_preexisting",
      });

      const req = new NextRequest("http://localhost:3000/api/billing/order", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}` },
      });
      const res = await postOrderHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.alreadyEntitled).toBe(true);
      expect(json.orderId).toBeUndefined();
    });
  });

  describe("3. Payment Signature Verification & Anti-Tampering (POST /api/billing/verify)", () => {
    it("rejects client attempts to self-claim success without valid cryptographic signature", async () => {
      // 1. Missing signature
      const req1 = new NextRequest("http://localhost:3000/api/billing/verify", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ payment_success: true }),
      });
      const res1 = await postVerifyHandler(req1);
      expect(res1.status).toBe(400);

      // 2. Tampered / invalid signature
      const req2 = new NextRequest("http://localhost:3000/api/billing/verify", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: "order_test_12345",
          razorpay_payment_id: "pay_test_67890",
          razorpay_signature: "forged_invalid_signature_hash",
        }),
      });
      const res2 = await postVerifyHandler(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error).toContain("Invalid payment signature");

      // Verify creator entitlement remains INACTIVE / null
      const ent = findEntitlementByCreatorId(dbModule.getDb(), creator1.id);
      expect(ent?.status).not.toBe("ACTIVE");
    });

    it("verifies valid HMAC-SHA256 signature and activates creator entitlement", async () => {
      const orderId = "order_valid_abc123";
      const paymentId = "pay_valid_xyz789";

      // Generate legitimate HMAC signature
      const validSignature = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const req = new NextRequest("http://localhost:3000/api/billing/verify", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        }),
      });

      const res = await postVerifyHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe("ACTIVE");

      // Verify persistence in SQLite
      const activeDb = dbModule.getDb();
      const ent = findEntitlementByCreatorId(activeDb, creator1.id);
      expect(ent).not.toBeNull();
      expect(ent?.status).toBe("ACTIVE");
      expect(ent?.provider).toBe("RAZORPAY");
      expect(ent?.payment_id).toBe(paymentId);
      expect(ent?.order_id).toBe(orderId);
      expect(ent?.external_reference).toBe(paymentId);

      // Verify single row invariant
      const count = activeDb
        .prepare("SELECT COUNT(*) as count FROM creator_entitlements WHERE creator_id = ?")
        .get(creator1.id) as { count: number };
      expect(count.count).toBe(1);
    });
  });

  describe("4. Webhook Processing & Idempotency (POST /api/billing/webhook)", () => {
    it("rejects webhook request when signature is missing or invalid", async () => {
      // Missing signature header
      const req1 = new NextRequest("http://localhost:3000/api/billing/webhook", {
        method: "POST",
        body: JSON.stringify({ event: "payment.captured" }),
      });
      const res1 = await postWebhookHandler(req1);
      expect(res1.status).toBe(400);

      // Invalid signature header
      const req2 = new NextRequest("http://localhost:3000/api/billing/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": "bogus_signature_value" },
        body: JSON.stringify({ event: "payment.captured" }),
      });
      const res2 = await postWebhookHandler(req2);
      expect(res2.status).toBe(400);
    });

    it("accepts valid signed payment.captured webhook and idempotently updates entitlement", async () => {
      const activeDb = dbModule.getDb();
      const orderId = "order_webhook_111";
      const paymentId = "pay_webhook_222";

      const webhookPayload = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: 49900,
              currency: "INR",
              status: "captured",
              notes: {
                creator_id: creator2.id,
              },
            },
          },
        },
      });

      // Generate valid signature using TEST_WEBHOOK_SECRET
      const validWebhookSignature = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(webhookPayload)
        .digest("hex");

      // First webhook delivery
      const req1 = new NextRequest("http://localhost:3000/api/billing/webhook", {
        method: "POST",
        headers: {
          "x-razorpay-signature": validWebhookSignature,
          "content-type": "application/json",
        },
        body: webhookPayload,
      });

      const res1 = await postWebhookHandler(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.received).toBe(true);
      expect(json1.status).toBe("ACTIVE");

      // Verify entitlement active
      const ent = findEntitlementByCreatorId(activeDb, creator2.id);
      expect(ent?.status).toBe("ACTIVE");
      expect(ent?.payment_id).toBe(paymentId);

      // Duplicate delivery of same webhook
      const req2 = new NextRequest("http://localhost:3000/api/billing/webhook", {
        method: "POST",
        headers: {
          "x-razorpay-signature": validWebhookSignature,
          "content-type": "application/json",
        },
        body: webhookPayload,
      });

      const res2 = await postWebhookHandler(req2);
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.received).toBe(true);
      expect(json2.idempotent).toBe(true);

      // Verify single row invariant
      const count = activeDb
        .prepare("SELECT COUNT(*) as count FROM creator_entitlements WHERE creator_id = ?")
        .get(creator2.id) as { count: number };
      expect(count.count).toBe(1);
    });
  });

  describe("5. End-to-End Unlock & Regression Journey", () => {
    it("blocks publication when unentitled, unlocks publication after payment verification, and preserves live delivery", async () => {
      const activeDb = dbModule.getDb();
      const slug = "olivia-fairytale-w3e4";

      // 1. Creator creates proposal in DRAFT
      const proposal = createProposal(activeDb, {
        creatorId: creator1.id,
        title: "Fairytale Proposal",
        partnerName: "Olivia",
        slug,
        themeId: "midnight-velvet",
        storyContent: {
          introMessage: "To my one and only...",
          letterText: "Every moment with you is magic.",
          question: "Will you marry me, Olivia?",
        },
      });

      // 2. Publish fails with 403
      const pubReq1 = new NextRequest(
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
      const pubRes1 = await publishProposalHandler(pubReq1, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(pubRes1.status).toBe(403);

      // Public view returns 404
      const publicReq1 = new NextRequest(`http://localhost:3000/api/proposals/${slug}/public`);
      const publicRes1 = await getPublicProposalHandler(publicReq1, {
        params: Promise.resolve({ slug }),
      });
      expect(publicRes1.status).toBe(404);

      // 3. Creator completes Razorpay payment and verifies
      const orderId = "order_journey_999";
      const paymentId = "pay_journey_888";
      const signature = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const verifyReq = new NextRequest("http://localhost:3000/api/billing/verify", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
      });
      const verifyRes = await postVerifyHandler(verifyReq);
      expect(verifyRes.status).toBe(200);

      // 4. Publishing now succeeds with 200
      const pubReq2 = new NextRequest(
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
      const pubRes2 = await publishProposalHandler(pubReq2, {
        params: Promise.resolve({ id: proposal.id }),
      });
      expect(pubRes2.status).toBe(200);
      const pubJson2 = await pubRes2.json();
      expect(pubJson2.status).toBe("PUBLISHED");

      // 5. Public projection resolves with 200
      const publicReq2 = new NextRequest(`http://localhost:3000/api/proposals/${slug}/public`);
      const publicRes2 = await getPublicProposalHandler(publicReq2, {
        params: Promise.resolve({ slug }),
      });
      expect(publicRes2.status).toBe(200);
      const publicJson2 = await publicRes2.json();
      expect(publicJson2.proposal.title).toBe("Fairytale Proposal");

      // 6. Recipient responds successfully
      const respReq = new NextRequest(
        `http://localhost:3000/api/proposals/${slug}/respond`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ choice: "YES", customNote: "I love you forever!" }),
        }
      );
      const respRes = await postRespondHandler(respReq, {
        params: Promise.resolve({ slug }),
      });
      expect(respRes.status).toBe(201);
    });
  });
});
