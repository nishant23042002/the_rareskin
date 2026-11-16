"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

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
 *
 * Someone else may close the dialog (the route curtain closes every open dialog
 * once it is opaque; the menu closes itself for a picture flight). The lock is
 * released in that case too: on the dialog's own `close` event, and whenever
 * `open` turns false with the dialog already shut. `onExternalClose` tells the
 * owner so its `open` state does not stay true over a closed dialog (a dead
 * first tap on the button that opens it).
 */
export function useSlideDialog(
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  lockKey: string,
  reduced: boolean,
  onExternalClose?: () => void,
): boolean {
  const [shown, setShown] = useState(false);
  const openRef = useRef(open);
  const externalRef = useRef(onExternalClose);
  useEffect(() => {
    openRef.current = open;
    externalRef.current = onExternalClose;
  });

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
    } else {
      // already shut by someone else (the curtain, a flight): nothing to slide, but the lock is ours to give back
      unlockScroll(lockKey);
      fallbackTimer = window.setTimeout(() => setShown(false), 0);
    }

    // the dialog was closed from outside while we still thought it open
    const onClosed = () => {
      if (dlg.open) return; // a modal -> non-modal flip (the payment window), not a close
      unlockScroll(lockKey);
      setShown(false);
      if (openRef.current) externalRef.current?.();
    };
    dlg.addEventListener("close", onClosed);

    return () => {
      dlg.removeEventListener("close", onClosed);
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
