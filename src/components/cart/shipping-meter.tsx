"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Odometer } from "@/components/ui/odometer";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/catalog";
import { haptic } from "@/lib/haptics";

const GOLD = "linear-gradient(90deg, #e0d7bf 0%, #d89a4d 100%)";

/**
 * Free-delivery progress, pinned under the bag's header: "Add ₹X more to unlock
 * Complimentary Delivery" with a champagne-to-gilt bar that fills as the bag
 * grows, and a quiet "unlocked" state once it does.
 *
 * `threshold` is the order value (rupees) from which delivery is free
 * (`shipping.freeAbovePaise` in the admin settings). 0 means every order ships
 * free, so the bar simply reads as unlocked.
 */
export function ShippingMeter({
  subtotal,
  threshold,
  className,
  style,
}: {
  subtotal: number;
  threshold: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const alwaysFree = threshold <= 0;
  const unlocked = alwaysFree || subtotal >= threshold;
  const pct = unlocked
    ? 100
    : Math.max(4, Math.round((subtotal / threshold) * 100));
  const remaining = Math.max(0, threshold - subtotal);

  // The moment the bag crosses the line: the icon rings once and the bar catches a glint. Compared during
  // render (React's documented "adjust state while rendering"), so it never fires for a bag that opens
  // already unlocked, only for the add that unlocks it.
  const [wasUnlocked, setWasUnlocked] = useState(unlocked);
  const [celebrate, setCelebrate] = useState(0);
  if (wasUnlocked !== unlocked) {
    setWasUnlocked(unlocked);
    if (unlocked) setCelebrate((n) => n + 1);
  }
  useEffect(() => {
    if (celebrate > 0) haptic("success");
  }, [celebrate]);

  return (
    <div
      className={cn(
        "shrink-0 border-b border-line bg-surface-2/60 px-5 py-3.5",
        className,
      )}
      style={style}
    >
      <p
        aria-live="polite"
        className="flex items-center gap-2.5 text-[12px] leading-snug text-ink-2"
      >
        <span
          key={celebrate}
          className={cn(
            "grid size-[22px] shrink-0 place-items-center rounded-full border",
            celebrate > 0 && "rh-unlock",
            unlocked
              ? "border-gilt/50 bg-gilt/15 text-gilt"
              : "border-line-2 text-ink-3",
          )}
        >
          <Icon name={unlocked ? "check" : "truck"} className="size-3" />
        </span>
        {alwaysFree ? (
          <span>
            <b className="font-medium text-ink">Complimentary Pan-India Delivery</b>{" "}
            on every order
          </span>
        ) : unlocked ? (
          <span>
            You&rsquo;ve unlocked{" "}
            <b className="font-medium text-ink">
              Complimentary Pan-India Delivery
            </b>
          </span>
        ) : (
          <span>
            Add{" "}
            <b className="font-medium tabular-nums text-gilt">
              <Odometer text={formatINR(remaining)} />
            </b>{" "}
            more to unlock{" "}
            <b className="font-medium text-ink">Complimentary Delivery</b>
          </span>
        )}
      </p>

      <div
        role="progressbar"
        aria-label="Progress to complimentary delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-line-2"
      >
        <span
          className={cn(
            "rh-grow block h-full origin-left rounded-full transition-transform duration-700 ease-[var(--ease-out-strong)]",
            unlocked && "shadow-[0_0_10px_rgba(216,154,77,0.5)]",
          )}
          style={{ transform: `scaleX(${pct / 100})`, backgroundImage: GOLD }}
        />
        {celebrate > 0 && (
          <span
            key={celebrate}
            aria-hidden="true"
            className="rh-glint absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          />
        )}
      </div>

      {!alwaysFree && (
        <p className="mt-1.5 flex justify-between text-[10px] tracking-[0.06em] text-ink-3 tabular-nums">
          <span>{formatINR(subtotal)}</span>
          <span>Free delivery above {formatINR(threshold)}</span>
        </p>
      )}
    </div>
  );
}
