"use client";

import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { PayStack } from "@/components/ui/payment-marks";
import { Icon } from "@/components/ui/icon";
import { Odometer } from "@/components/ui/odometer";
import { haptic } from "@/lib/haptics";
import { useCart } from "@/components/providers/cart-provider";
import { formatINR } from "@/lib/catalog";
import { BagSuggestions } from "./bag-suggestions";
import { CartLineRow } from "./cart-line";
import { EmptyBag } from "./empty-bag";
import { ShippingMeter } from "./shipping-meter";
import { TrustGrid } from "./trust-grid";

/**
 * The `bag` view of the drawer. Reads everything from `useCart()` and changes
 * nothing about it; the only action it owns is `goToCheckout()`.
 *
 *   filled:  free-delivery meter (pinned) · scrolling [product cards, one-tap
 *            add-ons, trust grid + payment marks] · price summary + checkout
 *   empty:   an editorial empty state with quick-add recommendations
 */
export function BagView({
  freeShippingAbove,
  shippingFlat,
  codEnabled,
  onClose,
}: {
  /** order value (rupees) from which delivery is free; 0 = every order ships free */
  freeShippingAbove: number;
  /** delivery fee (rupees) below that threshold; 0 = none set in the admin settings */
  shippingFlat: number;
  codEnabled: boolean;
  /** closes the drawer; called when a link inside the bag is followed */
  onClose: () => void;
}) {
  const {
    lines,
    subtotal,
    savings,
    listTotal,
    hydrated,
    goToCheckout,
    checkoutAvailable,
  } = useCart();

  /** stagger slot for what rises in after the panel (capped, so a long bag
   *  never makes the last block wait) */
  const slot = (n: number) => ({ "--i": Math.min(n, 6) }) as CSSProperties;

  // localStorage not read yet: hold the space rather than flash "empty"
  if (!hydrated) return <div className="flex-1" />;

  if (lines.length === 0) {
    return (
      <div
        data-lenis-prevent
        className="flex flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        <EmptyBag className="rh-in" style={slot(1)} onNavigate={onClose} />
        <BagSuggestions className="rh-in pt-1 pb-8" style={slot(2)} />
      </div>
    );
  }

  const shippingFree = freeShippingAbove <= 0 || subtotal >= freeShippingAbove;
  // below the threshold the fee is the admin's flat rate; with none set the
  // checkout prices it, so the bag says so rather than guessing
  const feeKnown = !shippingFree && shippingFlat > 0;
  const payable = feeKnown ? subtotal + shippingFlat : subtotal;

  return (
    <>
      <ShippingMeter
        className="rh-in"
        style={slot(1)}
        subtotal={subtotal}
        threshold={freeShippingAbove}
      />

      <div
        data-lenis-prevent
        className="flex flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        <ul>
          {lines.map((line, i) => (
            <CartLineRow key={line.sku} line={line} slot={i + 2} />
          ))}
        </ul>
        <BagSuggestions
          className="rh-in pt-6 pb-6"
          style={slot(lines.length + 2)}
        />
        <TrustGrid
          className="rh-in"
          style={slot(lines.length + 3)}
          codEnabled={codEnabled}
        />
      </div>

      <footer
        className="rh-in shrink-0 border-t border-line bg-surface px-5 pt-4 pb-[calc(18px+env(safe-area-inset-bottom))] [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-[calc(12px+env(safe-area-inset-bottom))]"
        style={slot(lines.length + 3)}
      >
        <dl className="space-y-1.5 text-[12.5px] [@media(max-height:720px)]:space-y-1">
          <SummaryRow label="Subtotal" value={formatINR(listTotal)} />
          {savings > 0 && (
            <SummaryRow
              label="You save"
              value={`− ${formatINR(savings)}`}
              tone="ok"
            />
          )}
          <SummaryRow
            label="Delivery"
            value={
              shippingFree
                ? "FREE"
                : feeKnown
                  ? formatINR(shippingFlat)
                  : "At checkout"
            }
            tone={shippingFree ? "gilt" : undefined}
          />
          <div className="!mt-3 flex items-baseline justify-between border-t border-line pt-3 [@media(max-height:720px)]:!mt-2 [@media(max-height:720px)]:pt-2">
            <dt className="text-[10.5px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              {shippingFree || feeKnown ? "Total" : "Bag total"}
            </dt>
            <dd className="serif text-[1.6rem] leading-none tabular-nums text-ink">
              <Odometer text={formatINR(payable)} />
            </dd>
          </div>
        </dl>

        <Button
          onClick={() => {
            haptic("tap");
            goToCheckout();
          }}
          disabled={!checkoutAvailable}
          size="lg"
          className="group mt-4 w-full whitespace-nowrap max-[479px]:px-4 max-[479px]:tracking-[0.12em] [@media(max-height:720px)]:mt-3 [@media(max-height:720px)]:py-3.5"
        >
          {checkoutAvailable ? (
            // the label on the left; on the right the three payment methods as circles, then the arrow
            <span className="flex w-full items-center justify-between gap-3">
              <span>
                <span className="max-[419px]:hidden">Proceed to </span>
                Checkout
                <span aria-hidden> • </span>
                <span className="tabular-nums">
                  <Odometer text={formatINR(payable)} />
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <PayStack />
                <Icon
                  name="arrowRight"
                  className="size-[15px] transition-transform duration-300 group-hover:translate-x-1.5"
                />
              </span>
            </span>
          ) : (
            <span>Checkout opens with launch</span>
          )}
        </Button>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10.5px] leading-snug tracking-[0.03em] text-ink-3">
          <Icon name="lock" className="size-3 shrink-0" />
          100% Safe &amp; Secure Checkout • Easy 7-Day Returns
        </p>
      </footer>
    </>
  );
}

/** one line of the bag's price breakdown */
function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "gilt";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd
        className={
          tone === "ok"
            ? "tabular-nums text-ok"
            : tone === "gilt"
              ? "rounded-full bg-gilt/15 px-2.5 py-0.5 text-[10.5px] font-medium tracking-[0.14em] text-gilt"
              : "tabular-nums text-ink"
        }
      >
        {/\d/.test(value) ? <Odometer text={value} /> : value}
      </dd>
    </div>
  );
}
