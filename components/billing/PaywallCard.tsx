"use client";

import { useState } from "react";

interface PaywallCardProps {
  isEntitled: boolean;
  onEntitled?: () => void;
  priceInr?: number;
}

interface RazorpayInstance {
  open: () => void;
  on: (
    event: string,
    handler: (response: { error?: { description?: string } }) => void
  ) => void;
}

interface RazorpayConstructor {
  new (options: unknown): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export default function PaywallCard({
  isEntitled,
  onEntitled,
  priceInr = 499,
}: PaywallCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Create order on the server
      const orderRes = await fetch("/api/billing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        setError(orderData.error || "Failed to initiate checkout. Please try again.");
        setLoading(false);
        return;
      }

      if (orderData.alreadyEntitled) {
        setSuccess(true);
        onEntitled?.();
        setLoading(false);
        return;
      }

      // 2. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Unable to load Razorpay payment gateway. Please check your connection.");
        setLoading(false);
        return;
      }

      // 3. Launch Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Proposera",
        description: "Lifetime Proposal Publishing Entitlement",
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setLoading(true);
          try {
            // 4. Verify payment cryptographically on server
            const verifyRes = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setError(verifyData.error || "Payment verification failed.");
              setLoading(false);
              return;
            }

            setSuccess(true);
            setLoading(false);
            onEntitled?.();
          } catch {
            setError("Network error verifying payment with server.");
            setLoading(false);
          }
        },
        theme: {
          color: "#e11d48", // Rose 600
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      if (!window.Razorpay) {
        setError("Razorpay SDK is not available.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
        setError(response.error?.description || "Payment was declined or cancelled.");
        setLoading(false);
      });
      rzp.open();
    } catch {
      setError("An unexpected error occurred while launching checkout.");
      setLoading(false);
    }
  };

  if (isEntitled || success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            ✓
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Active Proposera Entitlement
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your account has full access to publish and live-update proposals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-neutral-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Creator Paywall
          </span>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
            Unlock Proposal Publishing
          </h2>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            One-time payment for lifetime access to publish and share your romantic proposals.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:text-right">
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            ₹{priceInr}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            One-time fee &bull; No recurring subscription
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 border-t border-neutral-100 pt-4 text-xs text-neutral-700 sm:grid-cols-2 dark:border-neutral-800 dark:text-neutral-300">
        <div className="flex items-center space-x-2">
          <span className="text-rose-600 dark:text-rose-400">✓</span>
          <span>Live mutable publishing &amp; custom URL slug</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-rose-600 dark:text-rose-400">✓</span>
          <span>Seamless scene-based mobile presentation</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-rose-600 dark:text-rose-400">✓</span>
          <span>Persisted recipient responses &amp; loving notes</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-rose-600 dark:text-rose-400">✓</span>
          <span>Unlimited edits without republish charges</span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-md bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="mt-5">
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Connecting to Razorpay..." : `Unlock Access Now (₹${priceInr})`}
        </button>
      </div>
    </div>
  );
}
