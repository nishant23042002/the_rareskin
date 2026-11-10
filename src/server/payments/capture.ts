import type { RazorpayPayment } from "./razorpay";

/**
 * "Was money actually captured?" — the one pure rule every path that can mint a
 * paid order must pass. Deliberately free of `server-only` / env / network so it
 * is trivially testable and cannot grow a side effect.
 *
 * An HMAC signature (checkout callback or webhook) only proves the payload came
 * from Razorpay. It does NOT prove funds were captured: a payment id can be
 * `created`, `authorized`, `failed` or `refunded`. Only `status === "captured"`
 * together with `captured === true` on a payment fetched from Razorpay's own API
 * (or carried by a signed `payment.captured` / `order.paid` webhook) counts.
 */

export type CaptureFailure =
  /** status is not `captured` (failed / authorized / created / refunded …) */
  | "not-captured"
  /** the payment belongs to a different Razorpay order than the intent */
  | "order-mismatch"
  /** the payment entity is not the payment id we were asked about */
  | "payment-mismatch"
  /** captured, but for a different amount than the intent locked */
  | "amount-mismatch"
  /** we could not reach Razorpay to find out — NOT proof of failure */
  | "lookup-failed";

export type CaptureVerdict =
  | { ok: true; payment: RazorpayPayment }
  | {
      ok: false;
      reason: CaptureFailure;
      /** Razorpay's payment status when we got one */
      status: string | null;
      /** safe to show the customer */
      message: string;
      payment: RazorpayPayment | null;
    };

export const DEFAULT_FAILED_MESSAGE =
  "Your payment was not completed by the bank. Please try again.";

const PENDING_MESSAGE =
  "Your bank has not confirmed this payment, so no order was placed. If any money was debited it is reversed automatically — or your order is confirmed by email within minutes.";

function notCapturedMessage(p: RazorpayPayment): string {
  const detail = p.error_description?.trim();
  if (detail) return detail;
  if (p.status === "failed") return DEFAULT_FAILED_MESSAGE;
  if (p.status === "refunded") return "This payment was refunded, so no order was placed.";
  return PENDING_MESSAGE;
}

export function assessCapture(
  payment: RazorpayPayment,
  expected: { paymentId: string; orderId: string; amountPaise?: number | null },
): CaptureVerdict {
  const fail = (
    reason: CaptureFailure,
    message: string,
  ): CaptureVerdict => ({
    ok: false,
    reason,
    status: payment.status ?? null,
    message,
    payment,
  });

  if (payment.id !== expected.paymentId) {
    return fail(
      "payment-mismatch",
      "We couldn't match this payment to your order, so no order was placed.",
    );
  }
  if (payment.order_id !== expected.orderId) {
    return fail(
      "order-mismatch",
      "This payment belongs to a different order, so no order was placed.",
    );
  }
  if (payment.status !== "captured" || payment.captured !== true) {
    return fail("not-captured", notCapturedMessage(payment));
  }
  if (expected.amountPaise != null && payment.amount !== expected.amountPaise) {
    return fail(
      "amount-mismatch",
      "The amount paid did not match your order total, so no order was placed.",
    );
  }
  return { ok: true, payment };
}
