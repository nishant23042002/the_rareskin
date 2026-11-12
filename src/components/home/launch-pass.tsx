"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { RhIcon } from "@/components/ui/rh-icon";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatINR } from "@/lib/catalog";

/**
 * The launch pass: the one place on the page that says, in so many words, "this price is exclusive to
 * the launch and it will not last". It is the site's single dark card on the light page, so the eye
 * lands on it, and everything on it is true:
 *
 *  - a slow belt along the top repeats what the price is (launch price, limited time, exclusive);
 *  - the figure DROPS from the list price to the launch price when the pass scrolls into view (a count,
 *    not a loop), the list price is struck through by a line that is drawn after it, the seal turns,
 *    a meter fills to the real discount, and the three fragrances appear as links, each at the price;
 *  - a brass light follows the pointer over the card, and the seal's ring of words keeps turning;
 *  - an end date appears ONLY when the store has set one (Site Settings → Campaign → Ends): "Ends 30 Nov
 *    · 12 days left". With none, it says plainly that the price returns to the list price when the
 *    launch ends. No countdown that restarts, no stock claim, nothing made up: every number is the
 *    catalogue's own.
 *
 * On a phone it is deliberately quiet: the kicker, the figure with the struck list price and a small
 * "−47%" pill, one sentence, and one link. The belt, the turning seal, the meter and the chips are for
 * wider screens.
 *
 * Without JavaScript, or with reduced motion, it shows its final state; the server markup is the
 * final state too, so there is no flash. Styles: `.rh-pass*` in `app/hero.css`.
 */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface PassItem {
  slug: string;
  name: string;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** "Ends 30 Nov · 12 days left", or null when there is no (future) end date */
function endsLine(iso: string | null): string | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - Date.now();
  if (ms < 0) return null;
  const days = Math.ceil(ms / 86_400_000);
  const date = end.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (days <= 0) return "Ends today";
  if (days === 1) return `Ends ${date} · last day`;
  return `Ends ${date} · ${days} days left`;
}

const noopSubscribe = () => () => {};

export function LaunchPass({
  price,
  mrp,
  volumeMl,
  items,
  endsAt = null,
}: {
  price: number;
  mrp: number;
  volumeMl: number;
  items: PassItem[];
  /** ISO date the launch pricing ends (Site Settings → Campaign), when one is set */
  endsAt?: string | null;
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
  // the end line depends on today's date, so it is read on the client only (null while rendering on the server)
  const ends = useSyncExternalStore(
    noopSubscribe,
    () => endsLine(endsAt),
    () => null,
  );

  // before paint: if motion is allowed, rewind to the list price so the sequence has somewhere to go
  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("pre");
    setShown(mrp);
  }, [mrp]);

  // play once, when at least 40% of the pass is on screen
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
      const DUR = 1250;
      const tick = (now: number) => {
        const p = Math.min((now - t0 - 300) / DUR, 1); // 300 ms of calm before the drop
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
      { threshold: 0.4 },
    );
    io.observe(el);
    // not cancelling the count here: this effect re-runs (and cleans up) the moment play() flips `state`
    return () => io.disconnect();
  }, [state, reduced, mrp, price]);

  // the count is cancelled only when the pass goes away
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
  const belt = ["Launch price", "Limited time", "Exclusive to launch"];

  return (
    <aside
      ref={ref}
      className="rh-pass rh-dark"
      aria-label="Launch offer"
      data-state={st}
      onPointerMove={onMove}
      style={{ "--p": String(pct / 100) } as React.CSSProperties}
    >
      <div className="rh-pass__belt" aria-hidden="true">
        <div className="rh-pass__belt-in">
          {[0, 1].map((n) => (
            <span key={n} className="rh-pass__belt-set">
              {belt.map((t) => (
                <span key={t}>
                  {t}
                  <i />
                </span>
              ))}
              {belt.map((t) => (
                <span key={`${t}-2`}>
                  {t}
                  <i />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="rh-pass__body">
        <div className="rh-pass__lead">
          <p className="rh-pass__kicker">
            <i className="rh-pass__dot" aria-hidden="true" />
            Exclusive launch pricing
            {ends && <em className="rh-pass__ends">{ends}</em>}
          </p>
          <p className="rh-pass__price">
            <span className="sr-only">
              {formatINR(price)}, was {formatINR(mrp)}
            </span>
            {/* as wide as the list price from the first frame, so the figure never pushes its neighbours while it counts down */}
            <b className="rh-tnum" aria-hidden="true" style={{ minWidth: `${formatINR(mrp).length}ch` }}>
              {formatINR(value)}
            </b>
            <span className="rh-pass__was rh-tnum" aria-hidden="true">
              <s>{formatINR(mrp)}</s>
              <small>list price</small>
            </span>
          </p>
          <p className="rh-pass__save">
            Save <b className="rh-tnum">{formatINR(mrp - price)}</b> on every {volumeMl}&nbsp;ml extrait, for as
            long as the launch lasts.
          </p>
        </div>

        <div className="rh-pass__seal" aria-hidden="true">
          <svg viewBox="0 0 120 120" className="rh-pass__ring">
            <defs>
              <path id="rh-pass-ring" d="M60 60m-49 0a49 49 0 1 1 98 0a49 49 0 1 1-98 0" />
            </defs>
            <text>
              <textPath href="#rh-pass-ring" startOffset="0">
                LAUNCH PRICE · LIMITED TIME · LAUNCH PRICE · LIMITED TIME ·
              </textPath>
            </text>
          </svg>
          <span className="rh-pass__pct rh-tnum">
            &minus;{pct}
            <small>%</small>
          </span>
        </div>

        <div className="rh-pass__side">
          <div className="rh-pass__meter" role="img" aria-label={`${pct}% off the list price`}>
            <i />
          </div>
          <p className="rh-pass__scale rh-tnum" aria-hidden="true">
            <span>
              Launch <b>{formatINR(price)}</b>
            </span>
            <span>
              List <s>{formatINR(mrp)}</s>
            </span>
          </p>
          {/* a phone gets one quiet line instead of the meter and the chips (see app/hero.css) */}
          <a className="rh-pass__go" href="#collection">
            See the three extraits <RhIcon name="arrow" />
          </a>
          {items.length > 0 && (
            <ul className="rh-pass__chips" aria-label="The launch price applies to all three">
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
        </div>
      </div>

      <p className="rh-pass__fine">
        <span>All-inclusive price</span>
        <span>
          When the launch ends, each extrait returns to {formatINR(mrp)}.
        </span>
      </p>
    </aside>
  );
}
