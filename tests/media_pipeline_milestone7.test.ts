import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NextRequest } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  createProposal,
  createMediaAsset,
  createUploadPermit,
  findMediaAssetById,
  findUploadPermitById,
  getCreatorStorageUsage,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_CREATOR_QUOTA_BYTES,
} from "@/lib/db/repositories";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { POST as permitHandler } from "@/app/api/media/permit/route";
import { POST as uploadHandler } from "@/app/api/media/upload/route";
import { GET as getMediaHandler, DELETE as deleteMediaHandler } from "@/app/api/media/[id]/route";
import { POST as publishHandler } from "@/app/api/proposals/[id]/publish/route";
import * as dbModule from "@/lib/db";

describe("Milestone 7: Media Upload Ingestion Pipeline Integration", () => {
  let db: DatabaseSync;
  let testStorageDir: string;
  let creator1: { id: string; email: string };
  let creator2: { id: string; email: string };
  let sessionToken1: string;
  let sessionToken2: string;
  let proposal1: { id: string; slug: string };

  beforeEach(async () => {
    // Isolated storage path
    testStorageDir = path.join(os.tmpdir(), `proposera-test-media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    process.env.MEDIA_STORAGE_PATH = testStorageDir;

    // In-memory test DB
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

    // Seed Proposal for Creator 1
    proposal1 = createProposal(dbModule.getDb(), {
      creatorId: creator1.id,
      slug: "our-special-memory",
      title: "Proposal for Elena",
      partnerName: "Elena",
      themeId: "midnight-velvet",
      storyContent: { question: "Will you marry me?" },
    });
  });

  afterEach(async () => {
    db.close();
    dbModule.closeDb();
    delete process.env.MEDIA_STORAGE_PATH;
    try {
      await fs.promises.rm(testStorageDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error in test temp dir
    }
  });

  // Helper to create synthetic images
  async function createTestJpeg(width = 100, height = 100): Promise<Buffer> {
    return await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  // Helper to create a NextRequest with FormData
  function createMultipartRequest(
    url: string,
    sessionCookie: string | null,
    fields: { permitId?: string; file?: { name: string; type: string; buffer: Buffer } }
  ): NextRequest {
    const formData = new FormData();
    if (fields.permitId) {
      formData.append("permitId", fields.permitId);
    }
    if (fields.file) {
      const file = new File([new Uint8Array(fields.file.buffer)], fields.file.name, { type: fields.file.type });
      if (typeof (file as any).arrayBuffer !== "function") {
        (file as any).arrayBuffer = async () => fields.file!.buffer;
      }
      formData.append("file", file);
    }

    const headers: Record<string, string> = {
      "content-type": "multipart/form-data",
    };
    if (sessionCookie) {
      headers["cookie"] = `${SESSION_COOKIE_NAME}=${sessionCookie}`;
    }

    const req = new NextRequest(url, {
      method: "POST",
      headers,
    });
    req.formData = async () => formData;

    return req;
  }

  // =========================================================================
  // 1. Upload Permit Endpoint (POST /api/media/permit)
  // =========================================================================
  describe("Upload Permit Issuance", () => {
    it("1.1 rejects unauthenticated permit requests with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/media/permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal1.id,
          fileSize: 1024 * 500,
          mimeType: "image/jpeg",
        }),
      });

      const res = await permitHandler(req);
      expect(res.status).toBe(401);
    });

    it("1.2 rejects permit requests for proposals owned by another creator with 404", async () => {
      const req = new NextRequest("http://localhost:3000/api/media/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}`, // Creator 2 trying to access Creator 1's proposal
        },
        body: JSON.stringify({
          proposalId: proposal1.id,
          fileSize: 1024 * 500,
          mimeType: "image/jpeg",
        }),
      });

      const res = await permitHandler(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/not found or access denied/i);
    });

    it("1.3 rejects permit requests exceeding the 8 MB per-file limit with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/media/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({
          proposalId: proposal1.id,
          fileSize: 9 * 1024 * 1024, // 9 MB
          mimeType: "image/jpeg",
        }),
      });

      const res = await permitHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/exceeds/i);
    });

    it("1.4 rejects unsupported MIME types with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/media/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({
          proposalId: proposal1.id,
          fileSize: 1024 * 100,
          mimeType: "application/pdf",
        }),
      });

      const res = await permitHandler(req);
      expect(res.status).toBe(400);
    });

    it("1.5 enforces creator storage quota cap (50 MB) and returns 403 when exceeded", async () => {
      // Simulate existing usage near 50 MB (e.g., 49.5 MB)
      const nearFullBytes = 49.5 * 1024 * 1024;
      createMediaAsset(dbModule.getDb(), {
        creatorId: creator1.id,
        storageKey: "dummy-key",
        originalFilename: "large.webp",
        mimeType: "image/webp",
        byteSize: nearFullBytes,
        sha256Hash: "dummysha256",
        status: "READY",
      });

      expect(getCreatorStorageUsage(dbModule.getDb(), creator1.id)).toBe(nearFullBytes);

      // Request 1 MB upload -> 49.5 + 1 = 50.5 MB > 50 MB
      const req = new NextRequest("http://localhost:3000/api/media/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({
          proposalId: proposal1.id,
          fileSize: 1024 * 1024,
          mimeType: "image/jpeg",
        }),
      });

      const res = await permitHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/quota exceeded/i);
    });

    it("1.6 issues valid time-limited permit with 201 for valid request", async () => {
      const req = new NextRequest("http://localhost:3000/api/media/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({
          proposalId: proposal1.id,
          fileSize: 1024 * 500,
          mimeType: "image/jpeg",
        }),
      });

      const res = await permitHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.permitId).toBeDefined();
      expect(data.uploadUrl).toBe("/api/media/upload");
      expect(data.maxByteSize).toBe(1024 * 500);

      const permitInDb = findUploadPermitById(dbModule.getDb(), data.permitId);
      expect(permitInDb).not.toBeNull();
      expect(permitInDb?.creator_id).toBe(creator1.id);
      expect(permitInDb?.used_at).toBeNull();
    });
  });

  // =========================================================================
  // 2. Upload Ingestion & Processing Endpoint (POST /api/media/upload)
  // =========================================================================
  describe("Media Upload Ingestion & Processing", () => {
    it("2.1 rejects unauthenticated upload with 401", async () => {
      const req = createMultipartRequest("http://localhost:3000/api/media/upload", null, {
        permitId: "any-permit",
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(401);
    });

    it("2.2 rejects invalid or non-existent permit with 404", async () => {
      const jpegBuffer = await createTestJpeg(50, 50);
      const req = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: "00000000-0000-0000-0000-000000000000",
        file: { name: "test.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(404);
    });

    it("2.3 rejects permit belonging to another creator with 403", async () => {
      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
      });

      const jpegBuffer = await createTestJpeg(50, 50);
      // Creator 2 attempting to use Creator 1's permit
      const req = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken2, {
        permitId: permit.id,
        file: { name: "test.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(403);
    });

    it("2.4 rejects expired permit with 410", async () => {
      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
        durationMinutes: -10, // expired 10 minutes ago
      });

      const jpegBuffer = await createTestJpeg(50, 50);
      const req = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "test.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(410);
    });

    it("2.5 rejects spoofed binary files disguised as images (magic-byte validation)", async () => {
      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
      });

      // Windows executable header (MZ) disguised as image/jpeg
      const fakeExeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00ThisIsAnExecutableNotAnImage");
      const req = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "malicious.jpg", type: "image/jpeg", buffer: fakeExeBuffer },
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toMatch(/executable|magic|signature/i);
    });

    it("2.6 processes genuine image: strips EXIF, converts to WebP, persists file, and returns 201", async () => {
      const jpegBuffer = await createTestJpeg(200, 150);
      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
        maxByteSize: jpegBuffer.length + 1000,
      });

      const req = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "memory.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.asset).toBeDefined();
      expect(data.asset.id).toBeDefined();
      expect(data.asset.mimeType).toBe("image/webp");
      expect(data.asset.width).toBe(200);
      expect(data.asset.height).toBe(150);
      expect(data.asset.sha256Hash).toBeDefined();
      expect(data.asset.url).toBe(`/api/media/${data.asset.id}`);

      // Verify stored in DB
      const assetInDb = findMediaAssetById(dbModule.getDb(), data.asset.id);
      expect(assetInDb).not.toBeNull();
      expect(assetInDb?.creator_id).toBe(creator1.id);
      expect(assetInDb?.mime_type).toBe("image/webp");

      // Verify permit marked as used
      const updatedPermit = findUploadPermitById(dbModule.getDb(), permit.id);
      expect(updatedPermit?.used_at).not.toBeNull();
    });

    it("2.7 enforces single-use permit: reusing permit returns 409 Conflict", async () => {
      const jpegBuffer = await createTestJpeg(100, 100);
      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
        maxByteSize: jpegBuffer.length + 1000,
      });

      // First upload succeeds
      const req1 = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "first.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });
      const res1 = await uploadHandler(req1);
      expect(res1.status).toBe(201);

      // Second upload with same permit is rejected
      const req2 = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "second.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });
      const res2 = await uploadHandler(req2);
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toMatch(/already been used/i);
    });

    it("2.8 downscales images exceeding 4096px while keeping aspect ratio", async () => {
      // Create high dimension image (5000 x 2500)
      const bigBuffer = await sharp({
        create: {
          width: 5000,
          height: 2500,
          channels: 3,
          background: { r: 50, g: 150, b: 200 },
        },
      })
        .jpeg()
        .toBuffer();

      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
        maxByteSize: bigBuffer.length + 1000,
      });

      const req = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "panoramic.jpg", type: "image/jpeg", buffer: bigBuffer },
      });

      const res = await uploadHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.asset.width).toBeLessThanOrEqual(4096);
      expect(data.asset.height).toBeLessThanOrEqual(4096);
      // 5000x2500 scaled inside 4096x4096 becomes 4096x2048
      expect(data.asset.width).toBe(4096);
      expect(data.asset.height).toBe(2048);
    });
  });

  // =========================================================================
  // 3. Media Serving & Access Control (GET /api/media/[id])
  // =========================================================================
  describe("Media Serving & Non-Disclosure Partitioning", () => {
    let uploadedAssetId: string;

    beforeEach(async () => {
      // Ingest one valid media asset for draft proposal1
      const jpegBuffer = await createTestJpeg(120, 120);
      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
        maxByteSize: jpegBuffer.length + 1000,
      });

      const req = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "test-draft.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });

      const res = await uploadHandler(req);
      const data = await res.json();
      uploadedAssetId = data.asset.id;
    });

    it("3.1 allows authenticated owner to view draft media with 200 and image/webp", async () => {
      const req = new NextRequest(`http://localhost:3000/api/media/${uploadedAssetId}`, {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });

      const res = await getMediaHandler(req, {
        params: Promise.resolve({ id: uploadedAssetId }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/webp");
      expect(res.headers.get("cache-control")).toMatch(/private/);
    });

    it("3.2 enforces 404 non-disclosure for unauthenticated visitor on draft media", async () => {
      const req = new NextRequest(`http://localhost:3000/api/media/${uploadedAssetId}`);

      const res = await getMediaHandler(req, {
        params: Promise.resolve({ id: uploadedAssetId }),
      });

      // MUST be 404, not 401 or 403
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Media not found");
    });

    it("3.3 enforces 404 non-disclosure for foreign creator on draft media", async () => {
      const req = new NextRequest(`http://localhost:3000/api/media/${uploadedAssetId}`, {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken2}`, // Creator 2
        },
      });

      const res = await getMediaHandler(req, {
        params: Promise.resolve({ id: uploadedAssetId }),
      });

      // MUST be 404, not 403
      expect(res.status).toBe(404);
    });

    it("3.4 allows public unauthenticated access once proposal is PUBLISHED", async () => {
      // Publish the proposal
      const publishReq = new NextRequest(`http://localhost:3000/api/proposals/${proposal1.id}/publish`, {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
        body: JSON.stringify({ action: "publish" }),
      });
      const pubRes = await publishHandler(publishReq, {
        params: Promise.resolve({ id: proposal1.id }),
      });
      expect(pubRes.status).toBe(200);

      // Now unauthenticated request to media should succeed with 200 OK
      const publicReq = new NextRequest(`http://localhost:3000/api/media/${uploadedAssetId}`);
      const res = await getMediaHandler(publicReq, {
        params: Promise.resolve({ id: uploadedAssetId }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/webp");
      expect(res.headers.get("cache-control")).toMatch(/public/);
    });

    it("3.5 returns 404 for non-existent media asset ID", async () => {
      const req = new NextRequest(`http://localhost:3000/api/media/00000000-0000-0000-0000-000000000000`);
      const res = await getMediaHandler(req, {
        params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
      });
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 4. Media Deletion & Quota Reclamation (DELETE /api/media/[id])
  // =========================================================================
  describe("Media Deletion & Quota Reclamation", () => {
    it("4.1 allows owner to delete media asset and reclaims quota immediately", async () => {
      const jpegBuffer = await createTestJpeg(100, 100);
      const permit = createUploadPermit(dbModule.getDb(), {
        creatorId: creator1.id,
        proposalId: proposal1.id,
        maxByteSize: jpegBuffer.length + 1000,
      });

      const reqUpload = createMultipartRequest("http://localhost:3000/api/media/upload", sessionToken1, {
        permitId: permit.id,
        file: { name: "to-delete.jpg", type: "image/jpeg", buffer: jpegBuffer },
      });
      const resUpload = await uploadHandler(reqUpload);
      const dataUpload = await resUpload.json();
      const assetId = dataUpload.asset.id;

      const usageBefore = getCreatorStorageUsage(dbModule.getDb(), creator1.id);
      expect(usageBefore).toBeGreaterThan(0);

      // Delete media
      const delReq = new NextRequest(`http://localhost:3000/api/media/${assetId}`, {
        method: "DELETE",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });
      const delRes = await deleteMediaHandler(delReq, {
        params: Promise.resolve({ id: assetId }),
      });
      expect(delRes.status).toBe(200);

      // Quota is reclaimed immediately
      const usageAfter = getCreatorStorageUsage(dbModule.getDb(), creator1.id);
      expect(usageAfter).toBe(0);

      // Subsequent GET returns 404
      const getReq = new NextRequest(`http://localhost:3000/api/media/${assetId}`, {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken1}`,
        },
      });
      const getRes = await getMediaHandler(getReq, {
        params: Promise.resolve({ id: assetId }),
      });
      expect(getRes.status).toBe(404);
    });
  });
});
