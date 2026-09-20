import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import {
  findUploadPermitById,
  markUploadPermitUsed,
  createMediaAsset,
  getCreatorStorageUsage,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_CREATOR_QUOTA_BYTES,
} from "@/lib/db/repositories";
import { processImageUpload } from "@/lib/media/processor";
import { saveProcessedMedia } from "@/lib/media/storage";

/**
 * POST /api/media/upload
 * Ingests, validates, strips EXIF, re-encodes to WebP, and stores media.
 * Requires a valid, single-use, non-expired permit.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const creatorId = authResult.auth.creator.id;
  const db = getDb();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data: Failed to parse multipart body" },
      { status: 400 }
    );
  }

  try {
    const permitId =
      (formData.get("permitId") as string | null) ||
      request.headers.get("x-permit-id");

    if (!permitId) {
      return NextResponse.json(
        { error: "Upload permit ID is required" },
        { status: 400 }
      );
    }

    // 1. Verify permit validity
    const permit = findUploadPermitById(db, permitId);
    if (!permit) {
      return NextResponse.json(
        { error: "Upload permit not found or invalid" },
        { status: 404 }
      );
    }

    if (permit.creator_id !== creatorId) {
      return NextResponse.json(
        { error: "Permit does not belong to authenticated creator" },
        { status: 403 }
      );
    }

    if (permit.used_at) {
      return NextResponse.json(
        { error: "Upload permit has already been used (single-use permit)" },
        { status: 409 }
      );
    }

    const expiresAt = new Date(permit.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { error: "Upload permit has expired" },
        { status: 410 }
      );
    }

    // 2. Extract and inspect uploaded file
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No binary file provided in 'file' form field" },
        { status: 400 }
      );
    }

    const fileBlob = file as File;
    if (fileBlob.size > DEFAULT_MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 8 MB maximum size limit" },
        { status: 413 }
      );
    }

    if (fileBlob.size > permit.max_byte_size) {
      return NextResponse.json(
        { error: `File exceeds permitted size of ${permit.max_byte_size} bytes` },
        { status: 413 }
      );
    }

    interface BufferProvider {
      arrayBuffer?: () => Promise<ArrayBuffer>;
      bytes?: () => Promise<Uint8Array>;
      buffer?: Buffer;
    }
    const provider = file as unknown as BufferProvider;

    let rawBuffer: Buffer;
    if (typeof provider.arrayBuffer === "function") {
      const arrayBuffer = await provider.arrayBuffer();
      rawBuffer = Buffer.from(arrayBuffer);
    } else if (typeof provider.bytes === "function") {
      const bytes = await provider.bytes();
      rawBuffer = Buffer.from(bytes);
    } else if (Buffer.isBuffer(file)) {
      rawBuffer = file;
    } else if (provider.buffer && Buffer.isBuffer(provider.buffer)) {
      rawBuffer = provider.buffer;
    } else {
      const arrayBuffer = await (file as Blob).arrayBuffer();
      rawBuffer = Buffer.from(arrayBuffer);
    }

    // 3. Quota check
    const currentUsage = getCreatorStorageUsage(db, creatorId);
    if (currentUsage + rawBuffer.length > DEFAULT_CREATOR_QUOTA_BYTES) {
      return NextResponse.json(
        {
          error: "Storage quota exceeded. Cumulative creator storage cannot exceed 50 MB.",
          currentUsageBytes: currentUsage,
          quotaBytes: DEFAULT_CREATOR_QUOTA_BYTES,
        },
        { status: 403 }
      );
    }

    // 4. Validate & Process Image (magic bytes, decompression bomb, EXIF stripping, WebP)
    let allowedMimes: string[] = [];
    try {
      allowedMimes = JSON.parse(permit.allowed_mime_types);
    } catch {
      allowedMimes = [];
    }

    let processed;
    try {
      processed = await processImageUpload(rawBuffer, allowedMimes);
    } catch (procErr: unknown) {
      const msg = procErr instanceof Error ? procErr.message : "Failed to process image upload";
      return NextResponse.json(
        { error: msg },
        { status: 422 }
      );
    }

    // 5. Store processed WebP derivative on disk
    const mediaId = crypto.randomUUID();
    const storageKey = `creators/${creatorId}/media/${mediaId}.webp`;
    await saveProcessedMedia(storageKey, processed.buffer);

    // 6. Mark permit used and record media asset
    markUploadPermitUsed(db, permit.id);

    const safeFilename = fileBlob.name ? path.basename(fileBlob.name).slice(0, 255) : "upload.webp";

    const asset = createMediaAsset(db, {
      id: mediaId,
      creatorId,
      proposalId: permit.proposal_id,
      storageKey,
      originalFilename: safeFilename,
      mimeType: processed.mimeType,
      byteSize: processed.byteSize,
      width: processed.width,
      height: processed.height,
      sha256Hash: processed.sha256Hash,
      status: "READY",
    });

    return NextResponse.json(
      {
        asset: {
          id: asset.id,
          proposalId: asset.proposal_id,
          mimeType: asset.mime_type,
          byteSize: asset.byte_size,
          width: asset.width,
          height: asset.height,
          sha256Hash: asset.sha256_hash,
          url: `/api/media/${asset.id}`,
          createdAt: asset.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error during media upload";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
