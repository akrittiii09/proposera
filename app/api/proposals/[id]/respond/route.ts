import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  findProposalBySlug,
  findLatestResponseByProposalId,
  createResponse,
} from "@/lib/db/repositories";
import { CreateResponseSchema } from "@/lib/validation/schemas";
import crypto from "node:crypto";

interface RouteParams {
  params: Promise<{ id?: string; slug?: string }>;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/proposals/[id]/respond
 * Public unauthenticated endpoint for capturing recipient responses.
 * Resolves proposal by slug (where [id] in the URL captures the proposal slug).
 * Rejects unreleased/draft/unpublished proposals with 404 non-disclosure.
 * Persists response to database and returns 201 Created.
 * Duplicate/repeated submissions follow an explicit, deterministic rule:
 * Identical repeat submissions (same choice & custom note) are handled idempotently
 * returning 200 OK with the existing response without creating redundant duplicate rows.
 * Submissions with modified content create a new response record with 201 Created.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const resolved = await params;
  const slug = resolved.id || resolved.slug || "";
  const db = getDb();

  // Non-disclosure: must only accept responses for active PUBLISHED proposals
  const proposal = findProposalBySlug(db, slug);
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

  try {
    const body = await request.json();
    const parseResult = CreateResponseSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid response data";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { choice, customNote } = parseResult.data;
    const normalizedNote = customNote ? customNote.trim() : null;

    // Explicit deterministic rule for duplicate / repeated submissions:
    // Check if the latest response for this proposal is identical in choice and custom note.
    // If identical, return 200 OK idempotently with existing record rather than polluting state.
    const latestResponse = findLatestResponseByProposalId(db, proposal.id);
    const isDuplicate =
      latestResponse !== null &&
      latestResponse.choice === choice &&
      (latestResponse.custom_note ?? null) === normalizedNote;

    if (isDuplicate) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          response: {
            id: latestResponse.id,
            choice: latestResponse.choice,
            custom_note: latestResponse.custom_note,
            created_at: latestResponse.created_at,
          },
        },
        {
          status: 200,
          headers: {
            "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
          },
        }
      );
    }

    // Optional privacy-safe user-agent hash (one-way SHA-256)
    const rawUserAgent = request.headers.get("user-agent") || "";
    const userAgentHash = rawUserAgent
      ? crypto.createHash("sha256").update(rawUserAgent).digest("hex").slice(0, 16)
      : null;

    const response = createResponse(db, {
      proposalId: proposal.id,
      choice,
      customNote: normalizedNote,
      userAgentHash,
    });

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        response: {
          id: response.id,
          choice: response.choice,
          custom_note: response.custom_note,
          created_at: response.created_at,
        },
      },
      {
        status: 201,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      }
    );
  } catch (error) {
    console.error("Response submission error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while saving your response" },
      { status: 500 }
    );
  }
}
