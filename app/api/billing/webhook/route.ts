import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  createOrUpdateEntitlement,
  findEntitlementByCreatorId,
  findEntitlementByOrderId,
} from "@/lib/db/repositories";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook
 * Public endpoint for Razorpay webhook callbacks.
 * Verifies the webhook signature against the raw body:
 * HMAC-SHA256(raw_body, RAZORPAY_WEBHOOK_SECRET) == x-razorpay-signature
 * Idempotent: safe against retries and duplicate event deliveries.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature header" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read webhook payload" },
      { status: 400 }
    );
  }

  const isValid = verifyWebhookSignature({ rawBody, signature });
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

interface WebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
      };
    };
  };
}

  let eventPayload: WebhookPayload;
  try {
    eventPayload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook JSON payload" },
      { status: 400 }
    );
  }

  const event = eventPayload.event;
  const db = getDb();

  // Handle relevant payment and order events
  if (event === "payment.captured" || event === "order.paid") {
    const paymentEntity = eventPayload.payload?.payment?.entity;
    const orderEntity = eventPayload.payload?.order?.entity;

    const paymentId = paymentEntity?.id || null;
    const orderId = paymentEntity?.order_id || orderEntity?.id || null;

    // Resolve creator ID from event notes or previous order association
    let creatorId: string | null =
      paymentEntity?.notes?.creator_id ||
      orderEntity?.notes?.creator_id ||
      null;

    if (!creatorId && orderId) {
      const existing = findEntitlementByOrderId(db, orderId);
      if (existing) {
        creatorId = existing.creator_id;
      }
    }

    if (creatorId) {
      const existing = findEntitlementByCreatorId(db, creatorId);

      // Idempotency: if already active with this payment, do not re-run updates
      if (
        existing &&
        existing.status === "ACTIVE" &&
        existing.payment_id === paymentId
      ) {
        return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
      }

      createOrUpdateEntitlement(db, {
        creatorId,
        status: "ACTIVE",
        provider: "RAZORPAY",
        externalReference: paymentId || orderId,
        orderId,
        paymentId,
      });

      return NextResponse.json(
        { received: true, status: "ACTIVE" },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ received: true, processed: true }, { status: 200 });
}
