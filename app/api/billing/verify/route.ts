import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth/requireAuth";
import { createOrUpdateEntitlement } from "@/lib/db/repositories";
import { verifyPaymentSignature } from "@/lib/billing/razorpay";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/verify
 * Authenticated endpoint that cryptographically verifies the Razorpay payment signature:
 * HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
 * Zero-trust: client claims of success are rejected without valid HMAC signature.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const creator = authResult.auth.creator;

  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // Validate presence of required cryptographic fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid payment verification parameters" },
        { status: 400 }
      );
    }

    // Cryptographic signature check
    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature. Verification failed." },
        { status: 400 }
      );
    }

    // Activate entitlement in canonical SQLite store
    const db = getDb();
    const entitlement = createOrUpdateEntitlement(db, {
      creatorId: creator.id,
      status: "ACTIVE",
      provider: "RAZORPAY",
      externalReference: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    return NextResponse.json({
      success: true,
      status: entitlement.status,
      message: "Proposera entitlement successfully activated!",
      entitlement,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during payment verification" },
      { status: 500 }
    );
  }
}
