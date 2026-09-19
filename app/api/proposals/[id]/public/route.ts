import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  findPublishedProposalBySlug,
  getPublicProjection,
} from "@/lib/db/repositories";

interface RouteParams {
  params: Promise<{ id?: string; slug?: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/proposals/[id]/public
 * Unauthenticated public endpoint returning the sanitized public projection.
 * Resolves by slug (where [id] in the URL captures the proposal slug).
 * Enforces strict non-disclosure (indistinguishable 404 for drafts, unpublished,
 * deleted, or non-existent proposals).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const resolved = await params;
  const slug = resolved.id || resolved.slug || "";
  const db = getDb();

  // Find only published proposals matching the slug
  const proposal = findPublishedProposalBySlug(db, slug);

  if (!proposal || proposal.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Proposal not found" },
      {
        status: 404,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      }
    );
  }

  // Filter into sanitized public projection (no creator_id, email, billing, internal dates)
  const projection = getPublicProjection(proposal);

  return NextResponse.json(
    { proposal: projection },
    {
      status: 200,
      headers: {
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    }
  );
}
