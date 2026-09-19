import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import {
  findProposalById,
  findResponsesByProposalId,
} from "@/lib/db/repositories";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/[id]/responses
 * Authenticated endpoint for the proposal owner to view persisted recipient responses.
 * Enforces ownership: foreign creators receive 404 (non-disclosure); unauthenticated requests receive 401.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { id } = await params;
  const db = getDb();
  const proposal = findProposalById(db, id);

  // Non-disclosure check: unowned, deleted, or non-existent proposal returns 404
  if (!proposal || proposal.creator_id !== authResult.auth.creator.id || proposal.status === "DELETED") {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const responses = findResponsesByProposalId(db, id, authResult.auth.creator.id) || [];

  // Sanitize responses to expose only relevant fields
  const sanitizedResponses = responses.map((r) => ({
    id: r.id,
    choice: r.choice,
    custom_note: r.custom_note,
    created_at: r.created_at,
  }));

  return NextResponse.json({ responses: sanitizedResponses });
}
