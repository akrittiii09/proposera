import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import {
  findMediaAssetById,
  findProposalById,
  deleteMediaAsset,
} from "@/lib/db/repositories";
import { readMedia, deleteMediaFile } from "@/lib/media/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/media/[id]
 * Serves optimized WebP media binary with strict privacy partitioning:
 * - 200 OK Public if proposal status is 'PUBLISHED'.
 * - 200 OK Private if requested by the authenticated creator for draft media.
 * - 404 Non-Disclosure for unauthenticated/unauthorized users on unpublished drafts.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();

  const asset = findMediaAssetById(db, id);
  if (!asset) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Check if proposal is published
  let isPublic = false;
  if (asset.proposal_id) {
    const proposal = findProposalById(db, asset.proposal_id);
    if (proposal && proposal.status === "PUBLISHED") {
      isPublic = true;
    }
  }

  if (!isPublic) {
    // Draft media is strictly private to the proposal's authenticated creator
    const authResult = await requireApiAuth(request);
    if (!authResult.authenticated || authResult.auth.creator.id !== asset.creator_id) {
      // 404 Non-Disclosure: do not leak existence of private draft media
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
  }

  // Read media binary from local storage
  const buffer = await readMedia(asset.storage_key);
  if (!buffer) {
    return NextResponse.json({ error: "Media file missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": buffer.length.toString(),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPublic
        ? "public, max-age=86400, stale-while-revalidate=604800"
        : "private, no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * DELETE /api/media/[id]
 * Soft-deletes a media asset and cleans up local storage. Creator-only.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { id } = await params;
  const creatorId = authResult.auth.creator.id;
  const db = getDb();

  const asset = findMediaAssetById(db, id);
  if (!asset || asset.creator_id !== creatorId) {
    return NextResponse.json({ error: "Media not found or access denied" }, { status: 404 });
  }

  // Soft delete in database (frees creator quota)
  const deleted = deleteMediaAsset(db, id, creatorId);
  if (!deleted) {
    return NextResponse.json({ error: "Failed to delete media asset" }, { status: 500 });
  }

  // Clean up binary file
  await deleteMediaFile(asset.storage_key);

  return NextResponse.json({ message: "Media asset deleted successfully" });
}
