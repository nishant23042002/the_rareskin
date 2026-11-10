import "server-only";

/**
 * Payments — Razorpay hosted checkout, verified webhooks, and the order state
 * machine. The webhook is authoritative; the client callback is a fast path for
 * the confirmation screen only. All processors are idempotent.
 */

export {
  createRazorpayOrder,
  fetchRazorpayPayment,
  fetchRazorpayOrderPayments,
  createRazorpayRefund,
  verifyCapturedPayment,
  verifyCallbackSignature,
  verifyWebhookSignature,
} from "./razorpay";
export { assessCapture, DEFAULT_FAILED_MESSAGE } from "./capture";
export type { CaptureFailure, CaptureVerdict } from "./capture";
export type {
  RazorpayOrder,
  RazorpayPayment,
  RazorpayRefund,
} from "./razorpay";

export {
  canTransition,
  nextStatuses,
  transitionOrder,
  finalizeOnlineCheckout,
  markIntentFailed,
  cancelUnpaidOrder,
  recordRefund,
} from "./process";
export type { FinalizeInput, FinalizeResult } from "./process";
