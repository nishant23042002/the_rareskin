"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatINR } from "@/lib/catalog";

/**
 * A slow, seamless promo band pinned to the very top of the bag drawer — the
 * counter's ticker. One track holds the phrase group twice; GSAP slides it
 * exactly one group width, forever (`ease: "none"`, `repeat: -1`), so there is
 * no jump at the seam. Decorative (`aria-hidden`) — every line is stated plainly
 * elsewhere in the flow. Frozen under reduced motion and while the tab is hidden
 * (rAF stops for free).
 */

const OTHER_NOTES = [
  "Cash on delivery available",
  "Dispatched within 24–48 hours",
  "Discovery Set — all three for ₹799",
  "Extrait de Parfum · nothing lighter",
];

function Group({ notes }: { notes: string[] }) {
  return (
    <div className="flex h-full flex-none items-center">
      {notes.map((note) => (
        <span key={note} className="flex flex-none items-center">
          <span className="px-5 text-[10.5px] leading-none font-light tracking-[0.16em] whitespace-nowrap uppercase">
            {note}
          </span>
          <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-gilt/70" />
        </span>
      ))}
    </div>
  );
}

export function CartMarquee({
  freeShippingAbove = 0,
}: {
  /** order value (rupees) from which delivery is free; 0 = every order ships free */
  freeShippingAbove?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const notes = [
    freeShippingAbove > 0
      ? `Free delivery above ${formatINR(freeShippingAbove)}`
      : "Free shipping across India",
    ...OTHER_NOTES,
  ];

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || reduced) return;
      gsap.set(track, { xPercent: 0 });
      const tween = gsap.to(track, {
        xPercent: -50,
        duration: 26,
        ease: "none",
        repeat: -1,
      });
      return () => {
        tween.kill();
      };
    },
    { dependencies: [reduced], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="rh-dark shrink-0 overflow-hidden border-b border-brass/20 bg-[var(--onyx)] text-champagne"
      style={{ height: "var(--announce-h)" }}
    >
      <div
        ref={trackRef}
        className="flex h-full w-max items-center will-change-transform"
      >
        <Group notes={notes} />
        <Group notes={notes} />
      </div>
    </div>
  );
}
