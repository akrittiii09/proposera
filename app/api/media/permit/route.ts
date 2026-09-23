import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import {
  findProposalById,
  getCreatorStorageUsage,
  createUploadPermit,
  DEFAULT_CREATOR_QUOTA_BYTES,
} from "@/lib/db/repositories";
import { RequestUploadPermitSchema } from "@/lib/validation/schemas";

/**
 * POST /api/media/permit
 * Issues a short-lived (15 min), single-use upload permit for the authenticated creator.
 * Enforces creator proposal ownership and cumulative 50 MB storage quota.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const body = await request.json();
    const parseResult = RequestUploadPermitSchema.safeParse(body);

    if (!parseResult.success) {
      const msg = parseResult.error.issues[0]?.message || "Invalid permit request payload";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { proposalId, fileSize, mimeType } = parseResult.data;
    const creatorId = authResult.auth.creator.id;
    const db = getDb();

    // Verify proposal ownership
    const proposal = findProposalById(db, proposalId);
    if (!proposal || proposal.creator_id !== creatorId) {
      return NextResponse.json(
        { error: "Proposal not found or access denied" },
        { status: 404 }
      );
    }

    // Verify storage quota
    const currentUsage = getCreatorStorageUsage(db, creatorId);
    if (currentUsage + fileSize > DEFAULT_CREATOR_QUOTA_BYTES) {
      return NextResponse.json(
        {
          error: `Storage quota exceeded. Current usage is ${(currentUsage / (1024 * 1024)).toFixed(2)} MB. Uploading this file would exceed your 50 MB limit.`,
          currentUsageBytes: currentUsage,
          quotaBytes: DEFAULT_CREATOR_QUOTA_BYTES,
        },
        { status: 403 }
      );
    }

    // Issue permit
    const permit = createUploadPermit(db, {
      creatorId,
      proposalId,
      maxByteSize: fileSize,
      allowedMimeTypes: [mimeType],
      durationMinutes: 15,
    });

    return NextResponse.json(
      {
        permitId: permit.id,
        uploadUrl: "/api/media/upload",
        expiresAt: permit.expires_at,
        maxByteSize: permit.max_byte_size,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Media permit issuance error:", err);
    return NextResponse.json(
      { error: "Internal server error issuing upload permit" },
      { status: 500 }
    );
  }
}
