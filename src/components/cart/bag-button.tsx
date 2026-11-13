"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { useCart } from "@/components/providers/cart-provider";
import { flyToBag } from "@/lib/fly-to-bag";
import { haptic } from "@/lib/haptics";
import { FRAGRANCE_PALETTE } from "@/lib/catalog";
import type { CartLine } from "@/lib/cart";

/**
 * "Add to bag" with the caller's own markup — the homepage's champagne bars and
 * ghost buttons carry a price or an arrow, which `AddToBagButton`'s string
 * label cannot. Same cart call, same provider toast, same drop that arcs up to
 * the bag icon; briefly swaps to `added`.
 */
export function BagButton({
  line,
  className,
  children,
  added,
  ariaLabel,
  list,
}: {
  line: Omit<CartLine, "qty"> & { qty?: number };
  className?: string;
  /** where this button sits, for analytics (`item_list_name`); defaults to the page */
  list?: string;
  /** resting content */
  children: ReactNode;
  /** content for the ~1.4s after a tap (default: "Added ✓") */
  added?: ReactNode;
  ariaLabel?: string;
}) {
  const { addItem, isOpen } = useCart();
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    const from = e.currentTarget;
    addItem(line, list);
    if (!isOpen) {
      flyToBag(from, { color: line.fragrance ? FRAGRANCE_PALETTE[line.fragrance]?.juice : undefined });
    }
    haptic("tap");
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      data-added={done || undefined}
    >
      {done ? (added ?? "Added ✓") : children}
    </button>
  );
}
