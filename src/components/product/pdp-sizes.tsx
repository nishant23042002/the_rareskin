"use client";

import { useRef, type KeyboardEvent } from "react";
import { formatINR, type FragranceSlug, type FragranceVariant } from "@/lib/catalog";
import { pdpSizeChip } from "@/config/pdp-gallery";
import { cn } from "@/lib/cn";

/** which size gives the most for the money, per ml, among the priced ones: only worth a tag when it is not the smallest */
function bestValueSlug(variants: FragranceVariant[]): string | null {
  const priced = variants.filter((v) => v.price > 0 && v.state !== "soldout");
  if (priced.length < 2) return null;
  const per = (v: FragranceVariant) => v.price / v.volumeMl;
  const best = priced.reduce((a, b) => (per(b) < per(a) ? b : a));
  const smallest = priced.reduce((a, b) => (b.volumeMl < a.volumeMl ? b : a));
  return best.slug === smallest.slug ? null : best.slug;
}

/**
 * The size chooser: one chip per size (10 / 50 / 100 ml) with the REAL bottle at its size (`pdpSizeChip`), the size, and its
 * price, or "Soon". A size with no bottle photograph yet (the 100 ml) is a dark "Coming soon" card. A size that is not on sale yet stays selectable: choosing it shows its own pictures and
 * says when it arrives, but the buy box will not put it in the bag. It is a radio group, so a screen reader
 * announces "50 ml, selected, 2 of 3", and the arrow keys move the choice.
 */
export function PdpSizes({
  slug,
  variants,
  selectedMl,
  onSelect,
}: {
  slug: FragranceSlug;
  variants: FragranceVariant[];
  selectedMl: number;
  /** kept for callers: the chips no longer tint a drawn bottle */
  juice?: string;
  onSelect: (volumeMl: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const best = bestValueSlug(variants);

  function onKeyDown(e: KeyboardEvent, i: number) {
    const d =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + variants.length) % variants.length;
    onSelect(variants[n].volumeMl);
    refs.current[n]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Size"
      className="pdp-sizes__grid"
      style={{ gridTemplateColumns: `repeat(${variants.length}, minmax(0, 1fr))` }}
    >
      {variants.map((v, i) => {
        const on = v.volumeMl === selectedMl;
        const chip = pdpSizeChip(slug, v.volumeMl);
        // no bottle photograph and not on sale: a dark card that says so
        const dark = !chip && v.state !== "available";
        const tag =
          dark
            ? null
            : v.state === "soldout"
              ? "Sold out"
              : v.state === "soon" && v.price > 0
                ? "Soon"
                : v.slug === best
                  ? "Best value"
                  : null;
        return (
          <button
            key={v.slug}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-state={v.state}
            data-dark={dark ? "" : undefined}
            className="pdp-size"
            onClick={() => onSelect(v.volumeMl)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tag && (
              <span className={cn("pdp-size__tag", tag === "Best value" && "is-best")}>{tag}</span>
            )}
            <span className="pdp-size__bottle" data-ml={v.volumeMl}>
              {chip ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chip.src} alt="" width={chip.width} height={chip.height} loading="lazy" decoding="async" />
              ) : (
                <svg viewBox="0 0 60 100" aria-hidden="true" className="pdp-size__ghost">
                  <rect x="22" y="2" width="16" height="16" rx="2" />
                  <rect x="25" y="18" width="10" height="5" />
                  <rect x="4" y="23" width="52" height="73" rx="5" />
                  <path d="M18 62h24" />
                </svg>
              )}
            </span>
            <span className="pdp-size__ml">{v.volumeMl} ml</span>
            <span className="pdp-size__sub">
              {dark ? (
                <>
                  <i aria-hidden="true" />
                  Coming soon
                </>
              ) : v.price > 0 ? (
                formatINR(v.price)
              ) : (
                "Soon"
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
