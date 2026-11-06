"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR } from "@/lib/motion";

/**
 * Scroll-in reveal: fade + rise, once, when the element enters the viewport.
 * `blur` is OFF by default: animating `filter: blur()` re-rasterises the element
 * on every frame (opacity and transform stay on the compositor). Under `prefers-reduced-motion` it renders plainly with
 * no transform. Built on ScrollTrigger so there is no scroll listener.
 */
export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
  blur = false,
  start = "top 88%",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  blur?: boolean;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(el, blur ? { opacity: 0, y, filter: "blur(4px)" } : { opacity: 0, y });
        gsap.to(el, {
          opacity: 1,
          y: 0,
          ...(blur ? { filter: "blur(0px)" } : {}),
          duration: DUR.reveal,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start, once: true },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { clearProps: "all" });
      });
    },
    { scope: ref, dependencies: [y, delay, blur, start] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
