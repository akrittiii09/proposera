import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import {
  findProposalById,
  updateProposalStatus,
  isCreatorEntitled,
} from "@/lib/db/repositories";
import { PublishActionSchema } from "@/lib/validation/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/proposals/[id]/publish
 * Handles proposal publication state transitions.
 * Enforces creator ownership and the Razorpay paywall boundary:
 * Publishing without an ACTIVE entitlement is strictly rejected (HTTP 403).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { id } = await params;
  const db = getDb();
  const proposal = findProposalById(db, id);

  // Ownership check & existence non-disclosure
  if (!proposal || proposal.creator_id !== authResult.auth.creator.id || proposal.status === "DELETED") {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  try {
    let action: "publish" | "unpublish" = "publish";

    // Read action from body if provided
    try {
      const body = await request.json();
      const parseResult = PublishActionSchema.safeParse(body);
      if (parseResult.success) {
        action = parseResult.data.action;
      }
    } catch {
      // Default to "publish" if empty body
      action = "publish";
    }

    if (action === "publish") {
      // Server-side entitlement check (DEC-008 / Q1, DEC-011)
      const entitled = isCreatorEntitled(db, authResult.auth.creator.id);
      if (!entitled) {
        return NextResponse.json(
          {
            error: "Publishing is gated by the creator paywall. An active entitlement is required.",
            code: "ENTITLEMENT_REQUIRED",
          },
          { status: 403 }
        );
      }

      // Transition to PUBLISHED
      const updated = updateProposalStatus(db, id, authResult.auth.creator.id, "PUBLISHED");
      return NextResponse.json({
        success: true,
        action: "publish",
        status: "PUBLISHED",
        proposal: updated,
      });
    } else {
      // Transition to UNPUBLISHED
      const updated = updateProposalStatus(db, id, authResult.auth.creator.id, "UNPUBLISHED");
      return NextResponse.json({
        success: true,
        action: "unpublish",
        status: "UNPUBLISHED",
        proposal: updated,
      });
    }
  } catch (error) {
    console.error("Publish transition error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during publish transition" },
      { status: 500 }
    );
  }
}
