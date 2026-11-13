"use client";

import { Icon } from "@/components/ui/icon";
import { TickMark } from "@/components/ui/spinner";
import type { PaymentMethod } from "@/lib/validation/commerce";

/** where a payment attempt is: our server is preparing it, the bank's window is open, or we are verifying */
export type PayPhase = "securing" | "window" | "confirming";

const ORDER: PayPhase[] = ["securing", "window", "confirming"];

const COPY: Record<PayPhase, { title: string; body: string }> = {
  securing: {
    title: "Securing your order",
    body: "Checking stock and holding your price for a moment.",
  },
  window: {
    title: "Complete your payment",
    body: "Finish in the secure payment window. We’ll wait right here.",
  },
  confirming: {
    title: "Confirming your payment",
    body: "We’re verifying it with your bank. This only takes a moment.",
  },
};

const STEPS: { id: PayPhase; label: string }[] = [
  { id: "securing", label: "Order secured" },
  { id: "window", label: "Secure payment" },
  { id: "confirming", label: "Confirmed by your bank" },
];

/**
 * What the shopper sees while a payment is in flight, laid over the whole checkout
 * (the content under it is `inert`, so nothing can be tapped or tabbed to).
 *
 * Money is the one moment people really are anxious, so this is deliberately honest:
 * three named steps that tick off as they truly happen (not a timer), plain words for
 * what is going on right now, and, while the bank is being asked, a clear "don't close
 * or refresh". Fades in after a short beat, so a fast step never flashes it.
 * Cash on delivery has no payment, so it gets the single calm line instead of steps.
 */
export function PaymentOverlay({
  phase,
  method,
}: {
  phase: PayPhase;
  method: PaymentMethod;
}) {
  const cod = method === "cod";
  const at = ORDER.indexOf(phase);
  const copy = cod
    ? { title: "Placing your order", body: "Confirming stock and your delivery address." }
    : COPY[phase];

  return (
    <div
      role="status"
      aria-live="polite"
      className="rh-pay absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center"
    >
      <div className="rh-pay__ring">
        <svg className="rh-pay__arc" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="31" pathLength={100} />
        </svg>
        <Icon
          name={!cod && phase === "confirming" ? "shield" : "lock"}
          className="size-6 text-ink"
        />
      </div>

      {/* the words change with the phase; the keyed wrapper lets each one rise in */}
      <div key={cod ? "cod" : phase} className="rh-phase-in">
        <h3 className="serif mt-6 text-[1.5rem] leading-tight tracking-[-0.01em] text-ink">
          {copy.title}
        </h3>
        <p className="mx-auto mt-2 max-w-[32ch] text-[13px] leading-relaxed text-ink-2">
          {copy.body}
        </p>
      </div>

      {!cod && (
        <ol className="mt-7 w-full max-w-[290px] text-left" aria-label="Payment progress">
          {STEPS.map((s, i) => {
            const state = i < at ? "done" : i === at ? "active" : "pending";
            return (
              <li key={s.id} className="rh-pay__step" data-state={state}>
                <span className="rh-pay__dot">
                  {state === "done" ? (
                    <TickMark className="size-3" />
                  ) : state === "active" ? (
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  ) : (
                    <span aria-hidden="true">{i + 1}</span>
                  )}
                </span>
                <span className="text-[12.5px] tracking-[0.02em]">{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-7 inline-flex items-center gap-2 text-[10.5px] tracking-[0.14em] text-ink-3 uppercase">
        <Icon name="lock" className="size-3" />
        {!cod && phase === "confirming"
          ? "Please don’t close or refresh"
          : "256-bit encrypted"}
      </p>
    </div>
  );
}
