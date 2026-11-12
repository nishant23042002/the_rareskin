"use client";

import { useRef, type KeyboardEvent } from "react";
import { formatINR, sizeScale, type FragranceVariant } from "@/lib/catalog";
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

/** a bottle as a small glyph, drawn at its size next to the others (a 10 ml stands visibly shorter than a 100 ml) */
function Bottle({ ml, juice }: { ml: number; juice: string }) {
  const h = Math.round(34 * sizeScale(ml));
  return (
    <svg viewBox="0 0 20 40" height={h} width={h / 2} aria-hidden="true">
      <rect x="6" y="0" width="8" height="9" rx="1.5" fill="var(--color-cta)" />
      <rect x="7.5" y="8" width="5" height="2.5" fill="#b89a5c" />
      <rect x="1.5" y="10" width="17" height="29" rx="2.5" fill="var(--color-surface-2)" />
      <rect x="1.5" y="10" width="17" height="29" rx="2.5" fill={juice} opacity="0.88" />
      <rect x="1.5" y="10" width="17" height="29" rx="2.5" fill="none" stroke="rgba(16,14,12,0.28)" strokeWidth="0.8" />
      <rect x="4" y="12" width="2" height="24" rx="1" fill="#fff" opacity="0.38" />
    </svg>
  );
}

/**
 * The size chooser: one chip per size (10 / 50 / 100 ml) with the bottle drawn at its size, the size, and its
 * price, or "Soon". A size that is not on sale yet stays selectable: choosing it shows its own pictures and
 * says when it arrives, but the buy box will not put it in the bag. It is a radio group, so a screen reader
 * announces "50 ml, selected, 2 of 3", and the arrow keys move the choice.
 */
export function PdpSizes({
  variants,
  selectedMl,
  juice,
  onSelect,
}: {
  variants: FragranceVariant[];
  selectedMl: number;
  juice: string;
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
        const tag =
          v.state === "soldout"
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
            className="pdp-size"
            onClick={() => onSelect(v.volumeMl)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tag && (
              <span className={cn("pdp-size__tag", tag === "Best value" && "is-best")}>{tag}</span>
            )}
            <span className="pdp-size__bottle">
              <Bottle ml={v.volumeMl} juice={juice} />
            </span>
            <span className="pdp-size__ml">{v.volumeMl} ml</span>
            <span className="pdp-size__sub">{v.price > 0 ? formatINR(v.price) : "Soon"}</span>
          </button>
        );
      })}
    </div>
  );
}
