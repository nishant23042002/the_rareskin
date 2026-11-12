"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * A nav that follows the section in view: a table of contents beside a policy page (a vertical list
 * with one brass bar that slides to the current entry), or a row of chips above the FAQ (the current
 * one fills, and the strip scrolls it into view on a phone). One IntersectionObserver over the page's
 * sections, one state change per section crossed, no scroll listener; the bar moves by `transform`.
 *
 * Links are plain `#id` anchors, so it works without script (the sections carry `scroll-mt`).
 * Styles: `.pg-toc` / `.pg-chips` in `app/pages.css`.
 */
export function SectionNav({
  items,
  variant,
  label,
}: {
  items: { id: string; label: string }[];
  variant: "toc" | "chips";
  label: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const seen = useRef(new Map<string, boolean>());
  const strip = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length || !("IntersectionObserver" in window)) return;
    const map = seen.current;
    // a section counts as "current" while it crosses the band just under the header
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) map.set(e.target.id, e.isIntersecting);
        const first = items.find((i) => map.get(i.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-22% 0px -68% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  // the chips' strip keeps the current chip in view (horizontal only: the page never moves)
  useEffect(() => {
    if (variant !== "chips") return;
    const ol = strip.current;
    const a = ol?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!ol || !a) return;
    const target = a.offsetLeft - (ol.clientWidth - a.offsetWidth) / 2;
    ol.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active, variant]);

  const at = Math.max(0, items.findIndex((i) => i.id === active));

  if (variant === "chips") {
    return (
      <nav className="pg-chips" aria-label={label}>
        <ol ref={strip}>
          {items.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`} aria-current={i.id === active}>
                {i.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  return (
    <nav className="pg-toc" aria-label={label}>
      <p className="pg-toc__h">{label}</p>
      <ol style={{ "--at": at } as CSSProperties}>
        <li aria-hidden="true" className="pg-toc__bar" />
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={i.id === active} title={i.label}>
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
