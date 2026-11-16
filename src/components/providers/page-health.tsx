"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";

import { useRouteTransition } from "@/components/providers/route-transition";
import { overlayOpen, reconcileScrollLock } from "@/lib/scroll-lock";

/**
 * The last line of defence against a frozen page.
 *
 * Everything that can stop the page from scrolling or taking a tap is a state that something is supposed to undo:
 * the scroll lock of a drawer, the route curtain, Lenis being stopped, a payment window's `overflow: hidden`. Each
 * of those has its own owner that undoes it, and its own timer that undoes it if the owner fails. This component is
 * the net under both: it looks at the page itself, not at anyone's bookkeeping, and if the page is locked with
 * nothing on it that justifies the lock, it unlocks it.
 *
 * "Justified" means: a dialog / modal is open, the curtain or a picture flight is running, or a payment window
 * is up. Otherwise nothing may hold the page. It looks on the moments a frozen page shows itself (a tap, coming
 * back to the tab, a route change, the page restored from the back/forward cache) and every 2s while the tab is
 * visible. A healthy page costs a handful of DOM reads per check.
 */

/** the payment window's own container: while it is up the page behind it is meant to be locked */
const PAYMENT_WINDOW = ".razorpay-container, iframe.razorpay-checkout-frame";

function pageIsHeldLegitimately(): boolean {
  if (overlayOpen()) return true;
  if (document.querySelector(".rh-curtain[data-open]")) return true;
  if (document.documentElement.hasAttribute("data-flight")) return true;
  if (document.querySelector(PAYMENT_WINDOW)) return true;
  return false;
}

export function PageHealth() {
  const lenis = useLenis();
  const { sweep } = useRouteTransition();
  const lenisRef = useRef(lenis);
  const sweepRef = useRef(sweep);
  useEffect(() => {
    lenisRef.current = lenis;
    sweepRef.current = sweep;
  });

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;

      // the bookkeeping first: a holder with no overlay behind it is dropped
      reconcileScrollLock();
      // a curtain with no transition behind it comes down
      sweepRef.current();

      if (pageIsHeldLegitimately()) return;

      const { body, documentElement: html } = document;
      // a lock class left over (the curtain's, or the drawers' if the bookkeeping above could not clear it)
      if (body.classList.contains("route-locked")) body.classList.remove("route-locked");
      if (body.classList.contains("is-locked")) body.classList.remove("is-locked");
      // Lenis stopped by a drawer / the curtain and never started again (`html.lenis-stopped { overflow: hidden }`)
      const l = lenisRef.current;
      if (l?.isStopped) l.start();
      // a script (a payment window that closed abnormally, a third-party tag) that left the page unscrollable
      for (const el of [html, body]) {
        if (el.style.overflow === "hidden" || el.style.overflowY === "hidden") {
          el.style.removeProperty("overflow");
          el.style.removeProperty("overflow-y");
        }
        if (el.style.touchAction === "none") el.style.removeProperty("touch-action");
        if (el.style.pointerEvents === "none") el.style.removeProperty("pointer-events");
      }
      if (body.style.position === "fixed") {
        // a body-fix scroll lock that was not undone: put the page back where it was (`top` holds the scroll offset)
        const y = -parseInt(body.style.top || "0", 10) || 0;
        for (const p of ["position", "top", "left", "right", "width"]) body.style.removeProperty(p);
        window.scrollTo(0, y);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    // a tap is the moment a frozen page shows itself; checking on it means the next swipe already works
    document.addEventListener("pointerdown", check, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", check);
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 2000);
    return () => {
      document.removeEventListener("pointerdown", check, true);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("focus", check);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
