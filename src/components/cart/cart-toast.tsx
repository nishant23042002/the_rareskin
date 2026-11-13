"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { TickMark } from "@/components/ui/spinner";
import { useCart, type ToastState } from "@/components/providers/cart-provider";
import { cn } from "@/lib/cn";

/**
 * The bag's confirmation toast. Two mounts share one piece of state:
 *
 *  - `page`    bottom-centre, over the storefront (shown while the bag is closed). An "added" toast
 *              carries a "View bag" shortcut.
 *  - `drawer`  under the drawer's header (shown while the bag is open). The drawer is a top-layer
 *              <dialog>, which paints above any z-indexed element on the page, so a page-level toast
 *              would be hidden behind it, and could not be tapped (the rest of the document is inert).
 *
 * A removal toast carries "Undo". Each toast has a countdown hairline along its foot, restarts its
 * entrance when a new one replaces it, and eases out instead of vanishing.
 */
export function CartToast({ placement = "page" }: { placement?: "page" | "drawer" }) {
  const { toastState, dismissToast, isOpen, openCart } = useCart();
  const mine = placement === "page" ? !isOpen : isOpen;
  const live = mine ? toastState : null;

  // the toast on screen: it outlives `live` by the length of its exit
  const [shown, setShown] = useState<ToastState | null>(null);
  if (live && live !== shown) setShown(live);
  const leaving = !live && shown !== null;

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setShown(null), 320);
    return () => window.clearTimeout(t);
  }, [leaving]);

  if (!shown) return null;

  const removed = shown.tone === "removed";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none z-[130] flex justify-center",
        placement === "page"
          ? "rh-toast-host fixed inset-x-3 bottom-[calc(24px+env(safe-area-inset-bottom))]"
          : "absolute inset-x-3 top-[102px]",
      )}
    >
      <div
        key={shown.id}
        className={cn(
          "rh-toast relative w-full max-w-[440px] overflow-hidden rounded-[3px] bg-cta text-w0 shadow-[0_18px_40px_-16px_rgba(16,14,12,0.55)]",
          leaving ? "rh-toast--out" : "rh-toast--in pointer-events-auto",
        )}
      >
        <div className="flex items-center gap-3 py-2.5 pr-2 pl-3.5">
          <span
            aria-hidden="true"
            className="grid size-[22px] shrink-0 place-items-center rounded-full bg-w0/15"
          >
            {removed ? <Icon name="minus" className="size-3" /> : <TickMark className="size-3" />}
          </span>
          <p className="min-w-0 flex-1 text-[10.5px] leading-snug tracking-[0.1em] uppercase">
            {shown.message}
          </p>
          {shown.action ? (
            <button
              type="button"
              onClick={shown.action.run}
              className="shrink-0 rounded-[2px] px-2.5 py-2 text-[10.5px] font-medium tracking-[0.14em] text-champagne uppercase underline decoration-w0/40 underline-offset-4 transition-colors hover:decoration-w0"
            >
              {shown.action.label}
            </button>
          ) : placement === "page" && shown.tone === "added" ? (
            <button
              type="button"
              onClick={() => {
                dismissToast();
                openCart();
              }}
              className="shrink-0 rounded-[2px] px-2.5 py-2 text-[10.5px] font-medium tracking-[0.14em] text-champagne uppercase underline decoration-w0/40 underline-offset-4 transition-colors hover:decoration-w0"
            >
              View bag
            </button>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className="rh-toast__bar absolute inset-x-0 bottom-0 h-[2px] origin-left bg-w0/35"
          style={{ ["--ms" as string]: `${shown.ms}ms` }}
        />
      </div>
    </div>
  );
}
