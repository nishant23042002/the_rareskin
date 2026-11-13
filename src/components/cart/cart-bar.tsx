"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flacon } from "@/components/ui/flacon";
import { Icon } from "@/components/ui/icon";
import { useCart } from "@/components/providers/cart-provider";
import { useScrolled } from "@/hooks/use-scrolled";
import { cloudinaryVariant, formatINR, isFragranceSlug } from "@/lib/catalog";
import { cn } from "@/lib/cn";

const GOLD = "linear-gradient(90deg, #e0d7bf 0%, #d89a4d 100%)";
const TRI_JUICE =
  "linear-gradient(90deg, #e0d7bf 0%, #c5872f 52%, #3d2712 100%)";
const MAX_THUMBS = 3;

/**
 * The sticky bag bar. Hidden at the top of every page and whenever the bag is
 * empty; slides up once the reader scrolls, and tucks away over the footer.
 *
 * Light like the bag drawer (`.rh-lt`: paper and ink; the Checkout button is the
 * dark note), and built as one precise strip:
 *
 *   ──────────────────────────────────────────────  the bar's top edge IS the
 *   [pack][pack]  2 ITEMS  ₹1,598  You save ₹800     free-delivery meter: it fills
 *                 ✓ Free delivery unlocked           toward the threshold (₹999
 *                                    [View bag] [Checkout →]   today, from settings)
 *
 * What is in the bag (the product page's own packshots, with a ×N where a line
 * holds more than one), what it costs, how close free delivery is, and two ways
 * forward: the left block opens the bag, "Checkout" goes straight to payment.
 * On a phone it keeps the first pack, the total, one line of delivery news and
 * "Checkout".
 */
export function CartBar({
  freeShippingAbove = 0,
}: {
  /** order value (rupees) from which delivery is free; 0 = every order ships free */
  freeShippingAbove?: number;
}) {
  const {
    lines,
    count,
    subtotal,
    savings,
    hydrated,
    isOpen,
    openCart,
    goToCheckout,
    checkoutAvailable,
    suggestions,
  } = useCart();
  const scrolled = useScrolled(64);
  const [overFooter, setOverFooter] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(
      ([entry]) => setOverFooter(entry.isIntersecting),
      { rootMargin: "0px 0px -24% 0px" },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  // each product's picture (the PDP's first photograph), by sku, from the
  // catalogue snapshot the provider already holds
  const imageBySku = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const s of suggestions) m.set(s.sku, s.image ?? null);
    return m;
  }, [suggestions]);

  const visible = hydrated && count > 0 && scrolled && !isOpen && !overFooter;
  const items = `${count} ${count === 1 ? "item" : "items"}`;

  // lets the toast lift itself clear of this bar while it is up (micro.css, `.rh-toast-host`)
  useEffect(() => {
    document.documentElement.toggleAttribute("data-cart-bar", visible);
    return () => document.documentElement.removeAttribute("data-cart-bar");
  }, [visible]);

  const thumbs = lines.slice(0, MAX_THUMBS);
  const extra = lines.length - thumbs.length;

  // free-delivery progress (same rule as the bag's meter)
  const alwaysFree = freeShippingAbove <= 0;
  const unlocked = alwaysFree || subtotal >= freeShippingAbove;
  const pct = unlocked
    ? 100
    : Math.max(4, Math.round((subtotal / freeShippingAbove) * 100));
  const remaining = Math.max(0, freeShippingAbove - subtotal);

  return (
    <div
      className={cn(
        "rh-lt fixed inset-x-0 bottom-0 z-40 w-[calc(100vw+var(--sbw,0px))] border-t border-line bg-surface text-ink shadow-[0_-18px_44px_-30px_rgba(16,14,12,0.4)] transition-transform duration-[450ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!visible}
      inert={!visible}
    >
      {/* the top edge doubles as the free-delivery meter */}
      <div aria-hidden className="h-[3px] w-full bg-line-2">
        <span
          className="block h-full origin-left transition-transform duration-700 ease-[var(--ease-out-strong)] motion-reduce:transition-none"
          style={{
            transform: `scaleX(${pct / 100})`,
            backgroundImage: alwaysFree ? TRI_JUICE : GOLD,
          }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:gap-6 sm:px-14 sm:pb-[calc(14px+env(safe-area-inset-bottom))] xl:px-[92px]">
        {/* what is in the bag: tapping it opens the bag */}
        <button
          type="button"
          onClick={openCart}
          aria-label={`View bag — ${items}, ${formatINR(subtotal)}`}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
        >
          <span className="relative flex shrink-0 items-center">
            {thumbs.map((l, i) => {
              const url = cloudinaryVariant(imageBySku.get(l.sku) ?? undefined, {
                w: 160,
                h: 160,
                fill: true,
              });
              return (
                <span
                  key={l.sku}
                  className={cn(
                    "relative block size-10",
                    i > 0 && "-ml-3.5 max-[399px]:hidden",
                    i === 2 && "max-sm:hidden",
                  )}
                  style={{ zIndex: MAX_THUMBS - i }}
                >
                  <span className="absolute inset-0 overflow-hidden rounded-[3px] bg-[#ebeae6] ring-2 ring-surface">
                    {url ? (
                      // the packshot is cropped by box geometry, not a transform, so it
                      // resamples once and stays sharp at thumbnail size
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute -top-[18%] -left-[18%] h-[136%] w-[136%] max-w-none object-cover object-[50%_54%]"
                      />
                    ) : (
                      <span className="grid size-full place-items-center">
                        {l.fragrance && isFragranceSlug(l.fragrance) ? (
                          <Flacon fragrance={l.fragrance} className="w-4" />
                        ) : null}
                      </span>
                    )}
                  </span>
                  {l.qty > 1 && (
                    <span className="absolute -right-1 -bottom-1 z-10 rounded-full bg-ink px-1 py-px text-[9px] leading-none font-semibold text-w0 tabular-nums">
                      ×{l.qty}
                    </span>
                  )}
                </span>
              );
            })}
            {extra > 0 && (
              <span className="-ml-3.5 grid size-10 place-items-center rounded-[3px] bg-surface-2 text-[10.5px] font-medium text-ink-2 ring-2 ring-surface tabular-nums max-sm:hidden">
                +{extra}
              </span>
            )}
            {/* phones show one pack: the count rides on it */}
            <span className="absolute -top-1.5 -right-1.5 z-10 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[10px] leading-none font-semibold text-w0 tabular-nums sm:hidden">
              {count}
            </span>
          </span>

          <span className="min-w-0">
            <span className="flex items-baseline gap-2.5">
              <span className="hidden text-[10px] tracking-[0.16em] text-ink-3 uppercase sm:inline">
                {items}
              </span>
              <span className="text-[16px] leading-none font-medium tabular-nums sm:text-[17px]">
                {formatINR(subtotal)}
              </span>
              {savings > 0 && (
                <span className="hidden text-[11px] leading-none text-ok tabular-nums sm:inline">
                  You save {formatINR(savings)}
                </span>
              )}
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-none text-ink-2">
              <Icon
                name={unlocked ? "check" : "truck"}
                className={cn("size-3 shrink-0", unlocked ? "text-gilt" : "text-ink-3")}
              />
              <span className="truncate">
                {alwaysFree ? (
                  <>Free delivery on every order</>
                ) : unlocked ? (
                  <>
                    <span className="sm:hidden">Free delivery</span>
                    <span className="hidden sm:inline">Free delivery unlocked</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">
                      <b className="font-medium text-gilt tabular-nums">
                        {formatINR(remaining)}
                      </b>{" "}
                      <span className="max-[359px]:hidden">to free delivery</span>
                      <span className="min-[360px]:hidden">to go</span>
                    </span>
                    <span className="hidden sm:inline">
                      Add{" "}
                      <b className="font-medium text-gilt tabular-nums">
                        {formatINR(remaining)}
                      </b>{" "}
                      for free delivery
                    </span>
                  </>
                )}
              </span>
            </span>
          </span>
        </button>

        {/* the two ways forward */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {/* wrapped, because Button sets its own `display` and `cn` does not merge a `hidden` onto it */}
          <div className="hidden sm:block">
            <Button variant="onDark" size="sm" onClick={openCart}>
              View bag
            </Button>
          </div>
          <Button
            size="sm"
            onClick={goToCheckout}
            disabled={!checkoutAvailable}
            className="group max-[359px]:gap-1.5 max-[359px]:px-3"
          >
            {checkoutAvailable ? "Checkout" : "Opens at launch"}
            {checkoutAvailable && (
              <Icon
                name="arrowRight"
                className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
              />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
