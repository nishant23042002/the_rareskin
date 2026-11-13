"use client";

import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { TickMark } from "@/components/ui/spinner";
import { useCart } from "@/components/providers/cart-provider";
import { flyToBag } from "@/lib/fly-to-bag";
import { haptic } from "@/lib/haptics";
import { FRAGRANCE_PALETTE } from "@/lib/catalog";
import type { CartLine } from "@/lib/cart";

type Props = Omit<CartLine, "qty" | "list"> & {
  qty?: number;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  /** where this button sits, for analytics (`item_list_name`); defaults to the page */
  list?: string;
};

/**
 * The one entry point for putting something in the bag — cards, PDP, quiz,
 * discovery set all use this. The press is acknowledged four ways at once: the
 * label slides out for a drawn tick + "Added", a drop of the scent's colour arcs
 * up to the bag icon (which swells as it lands), the phone gives a tap, and the
 * provider's toast confirms it in words.
 */
export function AddToBagButton({
  label = "Add to bag",
  variant,
  size,
  className,
  list,
  ...line
}: Props) {
  const { addItem, isOpen } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    const from = e.currentTarget;
    addItem(line, list);
    // with the bag open there is no icon to fly to: the new line lights up in the bag instead
    if (!isOpen) {
      flyToBag(from, { color: line.fragrance ? FRAGRANCE_PALETTE[line.fragrance]?.juice : undefined });
    }
    haptic("tap");
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
    >
      <span className="rh-swap" data-state={added ? "done" : "idle"}>
        <span className="rh-swap__a" aria-hidden={added || undefined}>
          {label}
        </span>
        <span className="rh-swap__b" aria-hidden={!added}>
          <TickMark on={added} />
          Added
        </span>
      </span>
    </Button>
  );
}
