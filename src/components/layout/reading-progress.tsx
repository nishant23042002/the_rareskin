"use client";

import { useEffect } from "react";

/**
 * Turns on the fine brass reading line at the bottom edge of the header while this page is mounted.
 * The line itself lives in the header (`.rh-hdr__read`, `components/layout/header.tsx`) so it is always
 * attached to it, even after the announcement bar above has slid away; this only flips a flag on <html>
 * (`data-reading`) and removes it again on the way out. The line is pure CSS, a scroll-driven animation on
 * the compositor (`app/pages.css`): no scroll listener, and a browser without `animation-timeline`, or a
 * visitor who prefers reduced motion, simply does not get it.
 */
export function ReadingProgress() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-reading", "");
    return () => root.removeAttribute("data-reading");
  }, []);
  return null;
}
