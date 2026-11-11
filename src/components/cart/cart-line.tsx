"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Icon } from "@/components/ui/icon";
import { gsap } from "@/lib/gsap";
import { useCart } from "@/components/providers/cart-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { FRAGRANCE_PALETTE, formatINR } from "@/lib/catalog";
import { MAX_QTY, type CartLine } from "@/lib/cart";

/** "50 ml · Extrait de Parfum" / "3 × 10 ml · Discovery Set", from the line's own meta */
function subtitle(line: CartLine): string {
  const meta = line.meta ?? "";
  if (line.fragrance) {
    const ml = /(\d+)\s*ml/i.exec(meta)?.[1];
    return ml ? `${ml} ml · Extrait de Parfum` : "Extrait de Parfum";
  }
  return meta ? `${meta} · Discovery Set` : "Discovery Set";
}

/**
 * A chosen scent in the bag, as a retail card. The picture leads: the product
 * page's own packshot at a generous 104 px, shown whole (no crop, no zoom, no
 * transform, so the browser resamples it once and it stays sharp) on the same
 * studio grey it was shot on. Beside it: the name in tracked capitals, the
 * format, the price with its MRP struck through and a "Save ₹X" badge, and a
 * pill stepper whose "−" becomes a bin at 1. A quiet ✕ removes the line.
 */
export function CartLineRow({
  line,
  slot = 0,
}: {
  line: CartLine;
  /** position in the drawer's rise-in stagger (see `.rh-in` in home.css) */
  slot?: number;
}) {
  const { setQty, removeItem, suggestions } = useCart();
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLLIElement>(null);
  const [leaving, setLeaving] = useState(false);

  const f = line.fragrance ? FRAGRANCE_PALETTE[line.fragrance] : null;
  // the cart line keeps no picture, so borrow the catalogue's by SKU
  const image = suggestions.find((s) => s.sku === line.sku)?.image ?? null;

  function remove() {
    if (leaving) return;
    const el = rowRef.current;
    if (reduced || !el) {
      removeItem(line.sku);
      return;
    }
    setLeaving(true);
    gsap.to(el, {
      opacity: 0,
      height: 0,
      duration: 0.34,
      ease: "power2.inOut",
      onComplete: () => removeItem(line.sku),
    });
  }

  const atOne = line.qty <= 1;
  const saved =
    line.mrp && line.mrp > line.price ? (line.mrp - line.price) * line.qty : 0;

  return (
    <li
      ref={rowRef}
      data-cart-line
      className="rh-in overflow-hidden border-b border-line/70"
      style={{ "--i": Math.min(slot, 6) } as CSSProperties}
    >
      <div className="flex gap-4 bg-surface px-5 py-5">
        {/* product picture */}
        <div className="relative aspect-[7/8] w-[104px] shrink-0 self-start overflow-hidden rounded-md border border-line-2 bg-[#ebeae6] shadow-[0_14px_26px_-18px_rgba(16,14,12,0.45)] max-[379px]:w-[88px]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={`${line.name} extrait`}
              loading="eager"
              decoding="async"
              // 118% box, clipped by the frame: the studio margin is trimmed so the
              // flacon fills more of the tile, by geometry rather than a transform
              // (the browser resamples it once, so it stays sharp)
              className="absolute -top-[9%] -left-[9%] h-[118%] w-[118%] max-w-none object-cover object-[50%_54%]"
            />
          ) : f ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="block w-[44%]">
                <Flacon fragrance={line.fragrance!} className="w-full" />
              </span>
            </span>
          ) : (
            // the Discovery Set: all three, side by side
            <span className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
              {(["aurevan", "orvelis", "vayren"] as const).map((slug) => (
                <span key={slug} className="block w-[31%]">
                  <Flacon fragrance={slug} />
                </span>
              ))}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] leading-snug font-medium tracking-[0.08em] text-ink uppercase">
              {line.name}
            </p>
            <button
              type="button"
              onClick={remove}
              aria-label={`Remove ${line.name} from bag`}
              title="Remove"
              className="-mt-3 -mr-3 grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
          <p className="-mt-0.5 text-[11px] leading-snug text-ink-3">
            {subtitle(line)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="text-[16px] leading-none font-semibold tabular-nums text-ink">
              {formatINR(line.price * line.qty)}
            </p>
            {saved > 0 && (
              <>
                <span className="text-[11.5px] leading-none tabular-nums text-ink-3 line-through">
                  {formatINR(line.mrp! * line.qty)}
                </span>
                <span className="rounded-full bg-ok/15 px-2 py-[3px] text-[10px] leading-none font-medium tracking-[0.06em] text-ok uppercase tabular-nums">
                  Save {formatINR(saved)}
                </span>
              </>
            )}
          </div>

          {/* pill stepper */}
          <div
            role="group"
            aria-label={`${line.name} quantity`}
            className="mt-auto inline-flex h-9 w-fit items-center rounded-full border border-line bg-surface-2/40 text-ink-2"
          >
            <button
              type="button"
              onClick={() => (atOne ? remove() : setQty(line.sku, line.qty - 1))}
              aria-label={
                atOne
                  ? `Remove ${line.name} from bag`
                  : `Decrease ${line.name} quantity`
              }
              className="grid h-9 w-9 place-items-center rounded-full transition-[transform,color,background-color] duration-150 hover:bg-ink/10 hover:text-ink active:scale-90"
            >
              <Icon name={atOne ? "trash" : "minus"} className="size-3.5" />
            </button>
            <span
              aria-live="polite"
              className="min-w-[24px] px-0.5 text-center text-[13px] font-medium tabular-nums text-ink"
            >
              {line.qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(line.sku, line.qty + 1)}
              disabled={line.qty >= MAX_QTY}
              aria-label={`Increase ${line.name} quantity`}
              className="grid h-9 w-9 place-items-center rounded-full transition-[transform,color,background-color] duration-150 hover:bg-ink/10 hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-30"
            >
              <Icon name="plus" className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
