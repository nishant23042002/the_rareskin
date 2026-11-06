"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Rendered inside <ReactLenis>. `useLenis()` hands us the instance reactively
 * (the imperative ref lands a render too late). Lenis runs its own rAF loop
 * (`autoRaf` in <SmoothScroll>), so GSAP's ticker is NOT hooked into it any more:
 * the old coupling kept GSAP's ticker running on every frame, forever, with lag
 * smoothing switched off. ScrollTrigger only needs to hear about Lenis' scroll
 * position, which is what the listener below does.
 */
export function GsapLenisBridge() {
  const lenis = useLenis();
  const pathname = usePathname();

  useEffect(() => {
    if (!lenis) return;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onScroll);
    };
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;
    lenis.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
  }, [pathname, lenis]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !lenis) return;
    Object.assign(window as unknown as Record<string, unknown>, {
      __lenis: lenis,
      __gsap: gsap,
      __ScrollTrigger: ScrollTrigger,
    });
  }, [lenis]);

  return null;
}
