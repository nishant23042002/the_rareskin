/**
 * Razorpay Standard Checkout — the hosted modal. Card data never touches our
 * origin. The script is loaded on demand (not in the document head) so it costs
 * nothing until someone actually pays.
 */

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string; backdrop_color?: string };
  handler: (r: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; escape?: boolean; backdropclose?: boolean };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (e: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loader: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("Could not load the payment window."));
    };
    document.head.appendChild(s);
  });
  return loader;
}

interface OpenCheckoutInput {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  prefill: { name: string; email: string; contact: string };
  /** a short label shown in the Razorpay modal (no order number exists yet) */
  reference: string;
}

/**
 * What happened in the modal. `success` only means Razorpay handed back a signed
 * payload — it is NOT proof of payment: the server must still confirm the
 * capture before any order exists, so callers must treat it as "verify me".
 */
export type CheckoutOutcome =
  | { status: "success"; payload: RazorpaySuccess }
  | { status: "dismissed" }
  | { status: "failed"; message: string };

const DEFAULT_FAILURE = "The payment could not be completed.";

/** Razorpay's `payment.failed` payload → the most useful human-readable reason. */
function failureMessage(e: unknown): string {
  const err = (e as { error?: { description?: string; reason?: string } } | null)
    ?.error;
  const text = err?.description?.trim() || err?.reason?.trim();
  return text || DEFAULT_FAILURE;
}

/** Open the Razorpay modal and resolve with what happened. */
export async function openRazorpayCheckout(
  input: OpenCheckoutInput,
): Promise<CheckoutOutcome> {
  await loadScript();
  const Ctor = window.Razorpay;
  if (!Ctor) return { status: "failed", message: "Payment window unavailable." };

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    // A failed attempt does NOT close Razorpay's window — it swaps to a "try
    // another method" screen. We hold this and only settle the promise when the
    // window is actually dismissed, so the caller doesn't restore the drawer
    // on top of a still-open payment window.
    let lastError: string | null = null;
    const done = (o: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };

    const rzp = new Ctor({
      key: input.keyId,
      order_id: input.razorpayOrderId,
      amount: input.amountPaise,
      currency: "INR",
      name: "THE RARESKIN",
      description: input.reference,
      prefill: input.prefill,
      notes: { reference: input.reference },
      theme: { color: "#17140f" },
      handler: (payload) => {
        // Only a complete, matching payload is even worth sending for
        // verification; anything else is treated as a failed attempt.
        const ok =
          payload?.razorpay_order_id === input.razorpayOrderId &&
          Boolean(payload.razorpay_payment_id) &&
          Boolean(payload.razorpay_signature);
        done(
          ok
            ? { status: "success", payload }
            : {
                status: "failed",
                message: "We couldn't read the payment response.",
              },
        );
      },
      modal: {
        ondismiss: () =>
          done(
            lastError
              ? { status: "failed", message: lastError }
              : { status: "dismissed" },
          ),
        escape: true,
      },
    });
    // Fires when the bank / UPI app declines or the attempt fails. Capture the
    // reason; the window stays open for another method, so we settle only when it
    // is dismissed (or a later attempt succeeds and `handler` wins).
    rzp.on("payment.failed", (e) => {
      lastError = failureMessage(e);
    });
    rzp.open();
  });
}
