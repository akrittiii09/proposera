import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import { isCreatorEntitled } from "@/lib/db/repositories";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/billing/razorpay";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/order
 * Initiates Razorpay checkout by creating an order server-side.
 * Rejects with { alreadyEntitled: true } if creator is already entitled.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const db = getDb();
  const creator = authResult.auth.creator;

  // If already entitled, do not charge again
  if (isCreatorEntitled(db, creator.id)) {
    return NextResponse.json(
      {
        alreadyEntitled: true,
        message: "You already have an active Proposera entitlement.",
      },
      { status: 200 }
    );
  }

  try {
    const config = getRazorpayConfig();
    const receipt = `rcpt_${creator.id.slice(0, 8)}_${Date.now()}`;

    const order = await createRazorpayOrder({
      amount: config.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        creator_id: creator.id,
        creator_email: creator.email,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.keyId,
    });
  } catch (error) {
    console.error("Failed to create Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment. Please try again." },
      { status: 500 }
    );
  }
}
