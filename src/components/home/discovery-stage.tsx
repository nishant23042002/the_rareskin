"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";

import { isPlainClick, useCanFly, useFlight } from "@/components/providers/pdp-flight";
import { STAGE_BOTTLE, STAGE_LAYOUT, STAGE_TINT, stageSrc, type StageLayout, type StageTone } from "@/config/discovery-stage";

/**
 * The Discovery Set stage: the three 10 ml bottles as separate layers over a background, so they can answer the pointer.
 *
 *  - HOVER a bottle: it lifts and swells a little, a pool of its fragrance's colour lights up behind it, a thin highlight runs
 *    down its glass, its name appears above it and its notes below it, and the other two step back. A sheen crosses the whole stage now and then.
 *  - POINTER (mouse only): the background, and each bottle by its depth, drift a few pixels against the pointer.
 *  - ARRIVAL: the bottles rise in, one after another, the first time the stage is on screen.
 *  - With `href` the whole stage is one link (the home section -> /discovery-set); with `linkBottles` each bottle links to its own
 *    10 ml page (the set page). Nothing moves under reduced motion; on a touch screen there is no hover, the link hint stays.
 *
 * Both layouts (wide, 4:3) are drawn and home.css shows one (`.rh-sc-d` / `.rh-sc-m`); each is a box that covers its frame the way
 * `object-fit: cover` would, so the bottles stay on the picture at every size. Styles: `.dset-*` in `app/home.css`.
 */
export interface StageFragrance {
  slug: "aurevan" | "orvelis" | "vayren";
  name: string;
  mood: string[];
  /** the notes: the first few are shown under the bottle on hover */
  notes: string[];
}

const DEPTH = { aurevan: 0.7, orvelis: 1, vayren: 0.7 } as const;

function Layout({
  layout,
  tone,
  fragrances,
  linkBottles,
}: {
  layout: StageLayout;
  tone: StageTone;
  fragrances: StageFragrance[];
  linkBottles: boolean;
}) {
  const L = STAGE_LAYOUT[layout];
  const by = new Map(fragrances.map((f) => [f.slug, f]));
  // the outer two first, the middle one in front
  const order = [...L.bottles].sort((a, b) => (a.slug === "orvelis" ? 1 : 0) - (b.slug === "orvelis" ? 1 : 0));
  return (
    <div className={layout === "desktop" ? "dset-cover rh-sc-d" : "dset-cover rh-sc-m"}>
      <div className="dset-stage" style={{ "--ar": L.w / L.h } as CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="dset-bg"
          src={stageSrc(`${tone}-${layout}.webp`)}
          alt=""
          width={L.w}
          height={L.h}
          decoding="async"
          loading={layout === "desktop" ? "eager" : "lazy"}
        />
        {order.map((b, i) => {
          const f = by.get(b.slug);
          if (!f) return null;
          const style = {
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.width}%`,
            "--d": DEPTH[b.slug],
            "--i": i,
            "--tint": STAGE_TINT[tone][b.slug],
          } as CSSProperties;
          const inner = (
            <>
              <span className="dset-bi">
                <i className="dset-glow" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="dset-img"
                  src={stageSrc(`bottle-${b.slug}.webp`)}
                  alt=""
                  width={STAGE_BOTTLE.w}
                  height={STAGE_BOTTLE.h}
                  decoding="async"
                  loading="lazy"
                />
                <i className="dset-rim" aria-hidden="true" />
              </span>
              <span className="dset-tag dset-tag--top" aria-hidden="true">
                <b>{f.name}</b>
              </span>
              <span className="dset-tag dset-tag--bot" aria-hidden="true">
                <small>{(f.notes ?? []).slice(0, 4).join(" · ")}</small>
              </span>
            </>
          );
          return linkBottles ? (
            <Link key={b.slug} href={`/fragrances/${b.slug}?size=10`} className="dset-b" style={style} aria-label={`${f.name}, 10 ml`}>
              {inner}
            </Link>
          ) : (
            <span key={b.slug} className="dset-b" style={style}>
              {inner}
            </span>
          );
        })}
        <i className="dset-sheen" aria-hidden="true" />
      </div>
    </div>
  );
}

export function DiscoveryStage({
  tone,
  fragrances,
  href,
  linkBottles = false,
  label,
  hint = "Explore the set",
  flight: fly,
}: {
  tone: StageTone;
  fragrances: StageFragrance[];
  /** make the whole stage a link */
  href?: string;
  /** make each bottle a link to its 10 ml page */
  linkBottles?: boolean;
  label: string;
  hint?: string;
  /** "from": the stage (a link) opens its page with the flight; "to": this stage is where that flight lands */
  flight?: "from" | "to";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const flight = useFlight();
  const canFly = useCanFly();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // arrival: hold the bottles back until the stage is on screen, then let them rise in
    el.dataset.state = "pre";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.state = "in";
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    if (fine) {
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
    }
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      delete el.dataset.state;
    };
  }, []);

  const cls = `dset-art dset-art--${tone}`; // not .rh-dset__art: motion.css would scale it on scroll
  const body = (
    <>
      <Layout layout="desktop" tone={tone} fragrances={fragrances} linkBottles={linkBottles} />
      <Layout layout="mobile" tone={tone} fragrances={fragrances} linkBottles={linkBottles} />
      {href && (
        <span className="dset-hint" aria-hidden="true">
          {hint}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 12h15m-5-5 5 5-5 5" />
          </svg>
        </span>
      )}
    </>
  );
  return href ? (
    <Link
      href={href}
      className={cls}
      aria-label={label}
      ref={(n) => void (ref.current = n)}
      data-no-transition={fly === "from" && canFly ? "" : undefined}
      onClick={(e) => {
        const el = ref.current;
        if (fly === "from" && el && isPlainClick(e) && flight.open("discovery-set", href, el, { id: "dset" })) e.preventDefault();
      }}
    >
      {body}
    </Link>
  ) : (
    <div className={cls} role="group" aria-label={label} ref={(n) => void (ref.current = n)} data-flight-frame={fly === "to" ? "discovery-set" : undefined}>
      {body}
    </div>
  );
}
