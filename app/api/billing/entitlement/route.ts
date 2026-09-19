import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import { findEntitlementByCreatorId, isCreatorEntitled } from "@/lib/db/repositories";
import { getRazorpayConfig } from "@/lib/billing/razorpay";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/entitlement
 * Returns the current authenticated creator's entitlement status and billing configuration.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const db = getDb();
  const creatorId = authResult.auth.creator.id;
  const entitled = isCreatorEntitled(db, creatorId);
  const entitlement = findEntitlementByCreatorId(db, creatorId);
  const config = getRazorpayConfig();

  return NextResponse.json({
    entitled,
    status: entitlement?.status || "INACTIVE",
    entitlement,
    priceInr: config.priceInr,
    keyId: config.keyId,
  });
}
