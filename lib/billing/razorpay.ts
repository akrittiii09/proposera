import crypto from "node:crypto";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  priceInr: number;
  amountPaise: number;
}

export function getRazorpayConfig(): RazorpayConfig {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const priceInr = parseInt(process.env.PROPOSERA_PRICE_INR || "499", 10);
  const amountPaise = priceInr * 100;

  return {
    keyId,
    keySecret,
    webhookSecret,
    priceInr,
    amountPaise,
  };
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Creates a Razorpay Order.
 * In live/staging environments with credentials, calls the official Razorpay Orders API.
 * In test/dev environments without credentials, generates a structured mock order.
 */
export async function createRazorpayOrder(
  params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
  const { keyId, keySecret } = getRazorpayConfig();

  // If live credentials are available and we're not in test simulation
  if (keyId && keySecret && !process.env.MOCK_PAYMENTS) {
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || "INR",
        receipt: params.receipt,
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.description ||
          `Razorpay order creation failed with status ${response.status}`
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: data.status,
    };
  }

  // Deterministic local mock order for testing and local development
  return {
    id: `order_${crypto.randomBytes(8).toString("hex")}`,
    amount: params.amount,
    currency: params.currency || "INR",
    receipt: params.receipt,
    status: "created",
  };
}

/**
 * Verifies Razorpay payment signature from client checkout:
 * HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
 * Timing-safe comparison to prevent side-channel timing attacks.
 */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
  secret,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string;
}): boolean {
  const keySecret = secret || process.env.RAZORPAY_KEY_SECRET || "";
  if (!keySecret || !orderId || !paymentId || !signature) {
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature (header: x-razorpay-signature):
 * HMAC-SHA256(raw_body, webhook_secret) == signature
 * Timing-safe comparison.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string;
  signature: string;
  secret?: string;
}): boolean {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!webhookSecret || !rawBody || !signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}
