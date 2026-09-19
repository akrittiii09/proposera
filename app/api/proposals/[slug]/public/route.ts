import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  findPublishedProposalBySlug,
  getPublicProjection,
} from "@/lib/db/repositories";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/proposals/[slug]/public
 * Unauthenticated public endpoint returning the sanitized public projection.
 * Enforces strict non-disclosure (indistinguishable 404 for drafts, unpublished,
 * deleted, or non-existent proposals).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
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
