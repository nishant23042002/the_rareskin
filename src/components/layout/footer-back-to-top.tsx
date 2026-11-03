"use client";

import { useLenis } from "lenis/react";

import { Icon } from "@/components/ui/icon";

/**
 * Return-to-top, styled for the dark block. Rides Lenis when it's running (so
 * it eases like every other scroll on the site), else the native smooth scroll
 * — instant under `prefers-reduced-motion`, when Lenis is off.
 */
export function FooterBackToTop() {
  const lenis = useLenis();

  function toTop() {
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.4 });
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className="group grid size-12 shrink-0 place-items-center rounded-full border border-champagne/25 text-champagne transition-colors duration-300 hover:border-champagne hover:bg-champagne hover:text-onyx"
    >
      <Icon
        name="arrowLeft"
        className="size-5 rotate-90 transition-transform duration-300 ease-[var(--ease-out-strong)] group-hover:-translate-y-0.5"
      />
    </button>
  );
}
