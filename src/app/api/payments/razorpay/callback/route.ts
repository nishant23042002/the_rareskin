import { NextResponse } from "next/server";

import { razorpayCallbackInput } from "@/lib/validation/commerce";
import { getAuth } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { CheckoutIntent } from "@/server/models";
import {
  verifyCallbackSignature,
  verifyCapturedPayment,
  finalizeOnlineCheckout,
  markIntentFailed,
} from "@/server/payments";

/**
 * Fast confirmation path after the hosted Razorpay checkout reports a result.
 *
 * Two independent checks must both pass before an order can exist:
 *  1. the HMAC signature — proves the payload came from Razorpay, **not** that
 *     money moved (a payment id may be failed / created / authorized / refunded);
 *  2. a server-to-server lookup of the payment on Razorpay's API — it must be
 *     `captured`, belong to this Razorpay order, and match the intent's locked
 *     amount.
 * Only then does `finalizeOnlineCheckout` (which re-asserts the capture) turn the
 * intent into an order. Anything else answers `{ ok: false }` and creates
 * nothing. The **webhook is authoritative** and calls the same idempotent path —
 * this just lets the drawer flip to the confirmation screen without waiting.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }

  const parsed = razorpayCallbackInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    parsed.data;

  if (
    !verifyCallbackSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "signature",
        message:
          "We couldn't verify this payment response, so no order was placed.",
      },
      { status: 400 },
    );
  }

  await dbConnect();
  // The intent must belong to this customer (defence in depth — the signature
  // already proves the payload is from Razorpay).
  const intent = await CheckoutIntent.findOne({
    razorpayOrderId: razorpay_order_id,
    userId: auth.user.id,
  })
    .select("_id amountPaise")
    .lean<{ _id: unknown; amountPaise: number } | null>();
  if (!intent) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  // A valid signature is not a capture — ask Razorpay.
  const verdict = await verifyCapturedPayment(razorpay_payment_id, {
    orderId: razorpay_order_id,
    amountPaise: intent.amountPaise,
  });

  if (!verdict.ok) {
    console.warn("[payments/callback] payment not captured — no order created", {
      id: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: verdict.status,
      reason: verdict.reason,
      error_description: verdict.payment?.error_description ?? null,
    });

    if (verdict.reason === "lookup-failed") {
      // Unknown, not failed: the webhook / reconcile cron can still settle it.
      return NextResponse.json(
        { ok: false, error: "verification-unavailable", message: verdict.message },
        { status: 503 },
      );
    }
    if (verdict.reason === "not-captured") {
      if (verdict.status === "failed") {
        await markIntentFailed(razorpay_order_id, verdict.message);
      }
      return NextResponse.json(
        {
          ok: false,
          error: "payment-not-captured",
          message: verdict.message,
          paymentStatus: verdict.status,
        },
        { status: 400 },
      );
    }
    // order / payment / amount mismatch — never create an order. (A genuinely
    // captured wrong-amount payment is auto-refunded by the webhook's finalize.)
    console.error("[payments/callback] payment does not match intent", {
      id: razorpay_payment_id,
      orderId: razorpay_order_id,
      reason: verdict.reason,
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          verdict.reason === "amount-mismatch"
            ? "amount-mismatch"
            : "payment-mismatch",
        message: verdict.message,
      },
      { status: 400 },
    );
  }

  const p = verdict.payment;
  const res = await finalizeOnlineCheckout({
    providerOrderId: razorpay_order_id,
    providerPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
    source: "checkout-callback",
    verifiedPayment: p,
    instrument: p.method ?? null,
    last4: p.card?.last4 ?? null,
    upiVpa: p.vpa ?? null,
    amountPaise: p.amount ?? null,
  });

  if (!res.ok) {
    if (res.reason === "sold-out-refunded") {
      return NextResponse.json({ ok: false, error: "sold-out", refunded: true });
    }
    const status =
      res.reason === "verification-unavailable"
        ? 503
        : res.reason === "intent-not-found"
          ? 404
          : 400;
    return NextResponse.json(
      {
        ok: false,
        error: res.reason,
        message: res.message,
        paymentStatus: res.paymentStatus ?? null,
      },
      { status },
    );
  }
  return NextResponse.json({ ok: true, orderNumber: res.orderNumber });
}
