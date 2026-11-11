"use client";

import { useEffect, useRef, type ReactNode } from "react";


/**
 * "Made deliberately" — what is actually in the bottle, as four plain claims
 * (RARESKIN's answer to the certification row every Indian fragrance brand runs,
 * written as claims rather than badges). Sits after the ritual so it reads as the
 * substance behind everything above it.
 *
 * Layout: a centred heading over a 2 x 2 (one column on a phone) of paper cards;
 * from 1100px an editorial split: the heading sticks on the left, under it a
 * small seal of the place, and the cards stagger on the right. Each card fills
 * with the site's obsidian: on hover for a mouse (a soft brass light follows the
 * pointer), and as it passes through the middle of the screen on a touch device,
 * so a phone scrolls through the four in turn. Styles: `.rh-vow*` in `home.css`.
 *
 * NOTE (pre-launch): confirm every line here with the perfumer / QA before the
 * store goes live — "no added phthalates" and IFRA compliance in particular.
 * The animal-testing position is deliberately left off until it's decided
 * (see the pre-launch checklist in README.md). No percentages either: the README
 * bars a printed concentration figure.
 */

const CLAIMS: { label: string; sub: string; icon: ReactNode }[] = [
  {
    label: "Extrait concentration",
    sub: "More perfume oil, less alcohol. Two sprays hold the day.",
    // a drop with its highlight
    icon: (
      <>
        <path d="M18 3.5s-9.5 10.2-9.5 17.2a9.5 9.5 0 0 0 19 0C27.5 13.7 18 3.5 18 3.5z" />
        <path d="M12.8 22.2a5.4 5.4 0 0 0 5.2 5.3" />
      </>
    ),
  },
  {
    label: "IFRA-compliant",
    sub: "Every composition made to the fragrance industry’s safety standard.",
    // a shield with a tick
    icon: (
      <>
        <path d="M18 3.8 29 8v9.2c0 6.9-4.8 11.8-11 14.4C11.8 29 7 24.1 7 17.2V8z" />
        <path d="m12.6 17.4 4 4 7-8" />
      </>
    ),
  },
  {
    label: "No added phthalates",
    sub: "Or synthetic colourants. The juice is the colour you see.",
    // a clear flask with its liquid line
    icon: (
      <>
        <path d="M14 4.5h8M15.2 4.5v9.6L8.6 26.4a2.4 2.4 0 0 0 2.1 3.6h14.6a2.4 2.4 0 0 0 2.1-3.6L20.8 14.1V4.5" />
        <path d="M11.4 22.2h13.2" />
      </>
    ),
  },
  {
    label: "Bottled in India",
    sub: "Composed, filled and finished in Roha, Maharashtra.",
    // a place marker
    icon: (
      <>
        <path d="M18 31.5s9-8.1 9-15.1a9 9 0 1 0-18 0c0 7 9 15.1 9 15.1z" />
        <circle cx="18" cy="16.4" r="3.2" />
      </>
    ),
  },
];

export function MadeDeliberately() {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const cards = Array.from(list.querySelectorAll<HTMLElement>(".rh-vow__card"));
    const undo: Array<() => void> = [];

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      // a mouse: the light under the pointer, one write per frame
      let raf = 0;
      let target: HTMLElement | null = null;
      let px = 0;
      let py = 0;
      const frame = () => {
        raf = 0;
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${(px - r.left).toFixed(1)}px`);
        target.style.setProperty("--my", `${(py - r.top).toFixed(1)}px`);
      };
      const onMove = (e: PointerEvent) => {
        const el = e.target instanceof Element ? e.target : null;
        const card = el ? el.closest<HTMLElement>(".rh-vow__card") : null;
        if (!card) return;
        target = card;
        px = e.clientX;
        py = e.clientY;
        if (!raf) raf = requestAnimationFrame(frame);
      };
      list.addEventListener("pointermove", onMove, { passive: true });
      undo.push(() => {
        list.removeEventListener("pointermove", onMove);
        cancelAnimationFrame(raf);
      });
    } else if (
      "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // a finger: the card in the middle band of the screen takes the fill, so the four light up in turn as you scroll
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => e.target.classList.toggle("is-live", e.isIntersecting)),
        { rootMargin: "-38% 0px -38% 0px", threshold: 0 },
      );
      cards.forEach((c) => io.observe(c));
      undo.push(() => {
        io.disconnect();
        cards.forEach((c) => c.classList.remove("is-live"));
      });
    }

    return () => undo.forEach((f) => f());
  }, []);

  return (
    <section className="rh-vow" aria-labelledby="trust-h">
      <div className="rh-wrap rh-vow__in">
        <header className="rh-vow__head">
          <p className="rh-eyebrow">Made deliberately</p>
          <h2 className="rh-vow__h" id="trust-h" data-rv>
            Nothing in the bottle that doesn&rsquo;t need to be there.
          </h2>
          <div className="rh-vow__seal" aria-hidden="true" data-rv>
            <svg className="rh-vow__ring" viewBox="0 0 120 120">
              <defs>
                <path id="rh-vow-ring" d="M60 60m-47 0a47 47 0 1 1 94 0a47 47 0 1 1-94 0" />
              </defs>
              <text>
                <textPath href="#rh-vow-ring" textLength="291" lengthAdjust="spacing">
                  MADE DELIBERATELY · ROHA · MAHARASHTRA · INDIA ·
                </textPath>
              </text>
            </svg>
            <i className="rh-vow__mark" />
          </div>
        </header>

        <ol className="rh-vow__list" ref={listRef}>
          {CLAIMS.map((c, i) => (
            <li key={c.label} className="rh-vow__card" data-rv>
              <i className="rh-vow__glow" aria-hidden="true" />
              <div className="rh-vow__top">
                <svg className="rh-vow__ico" viewBox="0 0 36 36" aria-hidden="true">
                  {c.icon}
                </svg>
                <span className="rh-vow__n" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3>{c.label}</h3>
              <p>{c.sub}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
