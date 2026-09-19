import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import {
  createProposal,
  findProposalsByCreatorId,
  findProposalBySlug,
} from "@/lib/db/repositories";
import { CreateProposalSchema } from "@/lib/validation/schemas";

/**
 * GET /api/proposals
 * Lists all non-deleted proposals belonging exclusively to the authenticated creator.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const db = getDb();
  const proposals = findProposalsByCreatorId(db, authResult.auth.creator.id);
  return NextResponse.json({ proposals });
}

/**
 * POST /api/proposals
 * Initializes a new proposal draft for the authenticated creator.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const parseResult = CreateProposalSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid proposal data";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { title, partnerName, themeId, slug } = parseResult.data;
    const db = getDb();

    // Check slug collision if custom slug was provided
    if (slug) {
      const existing = findProposalBySlug(db, slug);
      if (existing) {
        return NextResponse.json(
          { error: "The requested custom slug is already taken" },
          { status: 409 }
        );
      }
    }

    // Creator ID is authoritative from the session, never request body
    const proposal = createProposal(db, {
      creatorId: authResult.auth.creator.id,
      title,
      partnerName,
      themeId,
      slug,
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error("Create proposal error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating proposal" },
      { status: 500 }
    );
  }
}
