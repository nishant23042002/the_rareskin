"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useCart } from "@/components/providers/cart-provider";
import type { CartLine } from "@/lib/cart";

/**
 * "Add to bag" with the caller's own markup — the homepage's champagne bars and
 * ghost buttons carry a price or an arrow, which `AddToBagButton`'s string
 * label cannot. Same cart call, same provider toast; briefly swaps to `added`.
 */
export function BagButton({
  line,
  className,
  children,
  added,
  ariaLabel,
}: {
  line: Omit<CartLine, "qty"> & { qty?: number };
  className?: string;
  /** resting content */
  children: ReactNode;
  /** content for the ~1.4s after a tap (default: "Added ✓") */
  added?: ReactNode;
  ariaLabel?: string;
}) {
  const { addItem } = useCart();
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onClick() {
    addItem(line);
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
