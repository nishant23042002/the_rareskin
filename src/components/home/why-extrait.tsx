"use client";

import { useEffect, useRef, useState } from "react";

import { RhIcon } from "@/components/ui/rh-icon";

const POINTS = [
  {
    h: "Higher concentration",
    p: "Extrait carries more perfume oil than eau de parfum. A little does the work of a lot.",
  },
  {
    h: "Closer, for longer",
    p: "It sits near the skin and releases slowly through the day, into a long dry-down.",
  },
  {
    h: "50 ml is plenty",
    p: "Two or three sprays. One bottle lasts, part of why the price works.",
  },
];

/**
 * Relative concentration, no invented numbers — extrait simply carries more.
 * The two bars draw in once, the first time the block scrolls into view.
 */
function ConcentrationBars() {
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setFilled(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFilled(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    // never leave the bars empty if the observer is slow to fire
    const safety = window.setTimeout(() => setFilled(true), 4000);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);

  return (
    <div className="rh-why__bar" ref={ref} aria-hidden="true">
      <div className="rh-why__row">
        <p>Eau de Parfum</p>
        <span className="rh-why__track">
          <i style={{ width: filled ? "44%" : 0 }} />
        </span>
      </div>
      <div className="rh-why__row rh-why__row--on">
        <p>Extrait de Parfum</p>
        <span className="rh-why__track">
          <i style={{ width: filled ? "88%" : 0 }} />
        </span>
      </div>
    </div>
  );
}

export function WhyExtrait() {
  return (
    <section className="rh-why" id="why" aria-labelledby="why-h">
      <div className="rh-wrap">
        <div className="rh-why__rule" />
        <div className="rh-why__in">
          <svg
            viewBox="0 0 90 156"
            width="78"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: "var(--ink)" }}
          >
            <rect x="33" y="3" width="24" height="26" rx="2" />
            <rect x="29" y="29" width="32" height="8" />
            <rect x="6" y="37" width="78" height="112" rx="5" />
            <path d="M33 118h24" strokeWidth="1" />
            <text
              x="45"
              y="94"
              textAnchor="middle"
              fontFamily="Newsreader,Georgia,serif"
              fontStyle="italic"
              fontSize="15"
              fill="currentColor"
              stroke="none"
            >
              extrait
            </text>
            <text
              x="45"
              y="76"
              textAnchor="middle"
              fontFamily="Jost,sans-serif"
              fontSize="5.5"
              letterSpacing="1.6"
              fill="currentColor"
              stroke="none"
            >
              THE RARESKIN
            </text>
            <text
              x="45"
              y="132"
              textAnchor="middle"
              fontFamily="Jost,sans-serif"
              fontSize="4.6"
              letterSpacing="1.2"
              fill="currentColor"
              stroke="none"
            >
              50 ml
            </text>
          </svg>
          <p className="rh-why__tag">
            <span className="rh-why__chip">Extrait</span>
            <span className="rh-eyebrow">Concentration, not volume</span>
          </p>
          <h2 className="rh-h2 rh-h2--sentence" id="why-h">
            Why we only make extrait.
          </h2>
          <p className="rh-lede">
            Extrait carries more perfume oil than eau de parfum. A little does
            the work of a lot.
          </p>
          <ConcentrationBars />
          <p className="rh-why__note">
            More perfume oil, less alcohol. The reason two sprays hold all day.
          </p>
        </div>
        <div className="rh-why__pts">
          {POINTS.map((pt) => (
            <div key={pt.h}>
              <h3>{pt.h}</h3>
              <p>{pt.p}</p>
            </div>
          ))}
        </div>
        <div className="rh-why__cta">
          <a className="rh-btn rh-btn--solid" href="#quiz">
            Find your match <RhIcon name="arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}
