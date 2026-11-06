"use client";

import { useEffect, useState } from "react";

/**
 * `true` once the page has scrolled past `threshold` pixels. A passive scroll
 * listener read once per frame (no GSAP, no ScrollTrigger: it used to create a
 * ScrollTrigger just to flip a boolean), so it costs nothing while the page is
 * still and one `scrollY` read per frame while it moves; React only re-renders
 * when the value actually changes. Works with Lenis (which scrolls the real
 * window) and with native scrolling. Shared by the announcement bar (collapse)
 * and the header (condense).
 */
export function useScrolled(threshold = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // seed the initial value on the next frame (deferred, not a sync setState)
    raf = requestAnimationFrame(read);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return scrolled;
}
