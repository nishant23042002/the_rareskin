"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import { GsapLenisBridge } from "./gsap-lenis-bridge";

/**
 * Lenis smooth scroll, only where it helps.
 *
 * - Fine pointer + hover (a mouse wheel or trackpad on a desktop / laptop): Lenis
 *   eases the wheel. It runs on its own rAF (`autoRaf`) with a tight `lerp`, so
 *   the page follows the wheel closely instead of gliding behind it.
 * - Phones and tablets (coarse pointer): native momentum scrolling. Nothing
 *   JavaScript does on a touch screen is smoother than the OS, and Lenis would
 *   only add a per-frame callback.
 * - `prefers-reduced-motion`: native scrolling, as before (every ScrollTrigger
 *   still fires, it has its own scroll listener).
 *
 * The GSAP <-> Lenis sync lives in <GsapLenisBridge>, which reads the instance
 * via `useLenis()`.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  // null = not yet resolved; render plainly until we know, so reduced-motion
  // and touch users never get a frame of smooth scroll.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setEnabled(!reduced.matches && fine.matches);
    sync();
    reduced.addEventListener("change", sync);
    fine.addEventListener("change", sync);
    return () => {
      reduced.removeEventListener("change", sync);
      fine.removeEventListener("change", sync);
    };
  }, []);

  if (!enabled) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: 0.14,
        wheelMultiplier: 1,
        syncTouch: false,
      }}
    >
      <GsapLenisBridge />
      {children}
    </ReactLenis>
  );
}
