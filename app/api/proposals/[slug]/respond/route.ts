import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  findProposalBySlug,
  createResponse,
} from "@/lib/db/repositories";
import { CreateResponseSchema } from "@/lib/validation/schemas";
import crypto from "node:crypto";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/proposals/[slug]/respond
 * Public unauthenticated endpoint for capturing recipient responses.
 * Resolves proposal by slug; rejects unreleased/draft/unpublished proposals with 404 non-disclosure.
 * Persists response to database and returns 201 Created.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
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

    // Optional privacy-safe user-agent hash (one-way SHA-256)
    const rawUserAgent = request.headers.get("user-agent") || "";
    const userAgentHash = rawUserAgent
      ? crypto.createHash("sha256").update(rawUserAgent).digest("hex").slice(0, 16)
      : null;

    const response = createResponse(db, {
      proposalId: proposal.id,
      choice,
      customNote: customNote || null,
      userAgentHash,
    });

    return NextResponse.json(
      {
        success: true,
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
