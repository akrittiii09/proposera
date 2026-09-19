import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import {
  findProposalById,
  updateProposal,
  deleteProposal,
} from "@/lib/db/repositories";
import { UpdateProposalSchema } from "@/lib/validation/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/[id]
 * Retrieves a single proposal owned by the authenticated creator.
 * Returns 404 for non-existent or unowned proposals to prevent existence leakage.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { id } = await params;
  const db = getDb();
  const proposal = findProposalById(db, id);

  if (!proposal || proposal.creator_id !== authResult.auth.creator.id || proposal.status === "DELETED") {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}

/**
 * PATCH /api/proposals/[id]
 * Updates proposal fields with strict server-side creator ownership enforcement.
 * In accordance with DEC-007 / Q4, published proposals are live and mutable;
 * saves immediately update the canonical published record without snapshots.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { id } = await params;
  const db = getDb();
  const proposal = findProposalById(db, id);

  if (!proposal || proposal.creator_id !== authResult.auth.creator.id || proposal.status === "DELETED") {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parseResult = UpdateProposalSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid update data";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const updated = updateProposal(db, id, authResult.auth.creator.id, parseResult.data);
    return NextResponse.json({ proposal: updated });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update proposal";
    if (errorMessage.includes("Slug is already in use")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }
    console.error("Update proposal error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating proposal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/proposals/[id]
 * Soft deletes a proposal with creator ownership enforcement.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { id } = await params;
  const db = getDb();
  const success = deleteProposal(db, id, authResult.auth.creator.id);

  if (!success) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
