"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatINR } from "@/lib/catalog";

/**
 * The launch-offer ticket. It is the one thing on the first screen that says
 * "this is cheaper than it looks", so it earns its attention honestly:
 *
 *  - the price DROPS from the list price to the launch price when the ticket scrolls
 *    into view (a count, not a loop), the struck-through list price is drawn after it,
 *    the round seal is stamped, and a meter fills to the real discount;
 *  - it shows WHERE the price applies: one link per fragrance (the offer covers all
 *    three), straight to its product page;
 *  - a brass glint travels along the top edge, and on a pointer device a soft light
 *    follows the cursor over the paper (the same light the pictures are lit with).
 *
 * Nothing here invents urgency (no countdown, no stock claim): every number is the
 * catalogue's own. Without JavaScript, or with reduced motion, the ticket simply shows
 * its final state. The server markup is the final state too, so there is no flash.
 */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface TicketItem {
  slug: string;
  name: string;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function LaunchTicket({
  price,
  mrp,
  volumeMl,
  items,
}: {
  price: number;
  mrp: number;
  volumeMl: number;
  items: TicketItem[];
}) {
  const pct = Math.round((1 - price / mrp) * 100);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const raf = useRef(0);
  const pointerRaf = useRef(0);
  // "idle" = the final state (server markup, no JS, reduced motion); "pre" = the start of the
  // sequence (set before the first paint, only when motion is allowed); "in" = playing / played
  const [state, setState] = useState<"idle" | "pre" | "in">("idle");
  const [shown, setShown] = useState(price);

  // before paint: if motion is allowed, rewind to the list price so the sequence has somewhere to go
  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("pre");
    setShown(mrp);
  }, [mrp]);

  // play once, when at least 45% of the ticket is on screen
  useEffect(() => {
    if (state !== "pre" || reduced) return;
    const el = ref.current;
    if (!el) return;
    let started = false;
    const play = () => {
      if (started) return;
      started = true;
      setState("in");
      const t0 = performance.now();
      const DUR = 1100;
      const tick = (now: number) => {
        const p = Math.min((now - t0 - 250) / DUR, 1); // 250 ms of calm before the drop
        if (p >= 0) setShown(Math.round(mrp - (mrp - price) * easeOutExpo(p)));
        if (p < 1) raf.current = requestAnimationFrame(tick);
        else setShown(price);
      };
      raf.current = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    // not cancelling the count here: this effect re-runs (and cleans up) the moment play() flips `state`
    return () => io.disconnect();
  }, [state, reduced, mrp, price]);

  // the count is cancelled only when the ticket goes away
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // the light that follows the pointer (no re-render: two CSS variables)
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(pointerRaf.current);
    const { clientX, clientY } = e;
    pointerRaf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((clientY - r.top) / r.height) * 100}%`);
    });
  };

  // reduced motion (also when it is switched on mid-sequence): the final state, derived, never animated
  const st = reduced ? "idle" : state;
  const value = reduced ? price : shown;

  return (
    <aside
      ref={ref}
      className="rh-ticket"
      aria-label="Launch offer"
      data-state={st}
      onPointerMove={onMove}
      style={{ "--p": String(pct / 100) } as React.CSSProperties}
    >
      <div className="rh-ticket__a">
        <p className="rh-eyebrow rh-ticket__eyebrow">
          <i className="rh-ticket__dot" aria-hidden="true" />
          Launch offer
        </p>
        <p className="rh-ticket__price">
          <span className="sr-only">{formatINR(price)}, was {formatINR(mrp)}</span>
          <b className="rh-tnum" aria-hidden="true">
            {formatINR(value)}
          </b>
          <s className="rh-tnum" aria-hidden="true">
            {formatINR(mrp)}
          </s>
        </p>
      </div>
      <span className="rh-ticket__perf" aria-hidden="true" />
      <div className="rh-ticket__b">
        <p className="rh-ticket__save">
          <span className="rh-pill rh-tnum">&minus;{pct}%</span>
          <span>
            Save {formatINR(mrp - price)} on every {volumeMl}&nbsp;ml extrait.
          </span>
        </p>
        <div className="rh-ticket__meter" role="img" aria-label={`${pct}% off the list price`}>
          <i />
        </div>
        {items.length > 0 && (
          <ul className="rh-ticket__chips" aria-label="The launch price applies to all three">
            {items.map((it, idx) => (
              <li key={it.slug} style={{ "--i": idx } as React.CSSProperties}>
                <Link href={`/fragrances/${it.slug}`}>
                  <span>{it.name}</span>
                  <em className="rh-tnum">{formatINR(price)}</em>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="rh-ticket__fine">
          <span>All-inclusive price</span>
          <span className="rh-ticket__fine-b">Free shipping across India</span>
        </p>
      </div>
    </aside>
  );
}
