"use client";

import { useEffect, useState, type RefObject } from "react";

import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

/** matches the 0.65s slide in `.rh-sb` / `.rh-cart` (home.css), plus a frame */
export const SLIDE_MS = 660;

/**
 * The one open / close choreography shared by the menu drawer and the bag
 * drawer, so the two always move identically.
 *
 * A native <dialog> hosts the panel (focus trap, ESC and an inert page for
 * free). Opening: `showModal()`, lock the page scroll, then — two frames later,
 * once the browser has painted the parked state — return `true`, which the
 * caller turns into an `.is-open` class so the slide is a real CSS transition
 * and not a jump. Closing: return `false` (the panel slides out), and close the
 * dialog once the slide has had time to play.
 *
 * The page is never left locked, and a throttled rAF (hidden tab / pane) can
 * never leave an open dialog parked off-screen: a timer sets the state anyway.
 */
export function useSlideDialog(
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  lockKey: string,
  reduced: boolean,
): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    let closeTimer = 0;
    let fallbackTimer = 0;
    let r1 = 0;
    let r2 = 0;

    if (open) {
      if (!dlg.open) dlg.showModal();
      lockScroll(lockKey);
      r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      fallbackTimer = window.setTimeout(() => setShown(true), 400);
    } else if (dlg.open) {
      r1 = requestAnimationFrame(() => setShown(false));
      fallbackTimer = window.setTimeout(() => setShown(false), 120);
      closeTimer = window.setTimeout(
        () => {
          dlg.close();
          unlockScroll(lockKey);
        },
        reduced ? 0 : SLIDE_MS,
      );
    }

    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(closeTimer);
    };
  }, [dialogRef, open, lockKey, reduced]);

  // never leave the page locked if the drawer unmounts while open
  useEffect(() => () => unlockScroll(lockKey), [lockKey]);

  return shown;
}
