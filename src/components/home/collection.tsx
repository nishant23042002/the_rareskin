"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";

import { BagButton } from "@/components/cart/bag-button";
import { Flacon } from "@/components/ui/flacon";
import { RhIcon } from "@/components/ui/rh-icon";
import { useDragX } from "@/hooks/use-drag-x";
import { useFlight } from "@/components/providers/pdp-flight";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cloudinaryVariant, formatINR, type Fragrance } from "@/lib/catalog";
import { resolveCardAsset } from "@/lib/home-images";
import { useCardConcept } from "./card-concept";
import { HomeImage } from "./home-image";

/**
 * "The Three" — three tall tiles. Each tile's picture has two faces: the
 * packshot, and a "How it unfolds" face with the notes (flip with the chevron, or
 * drag the picture sideways with a mouse on desktop). The picture itself links to
 * the product page. From 900px the tiles are a 3-up grid; below that they are a
 * scroll-snap rail with a "1 / 3" counter (a phone swipes it; a mouse can drag it).
 */

const GAP = 8; // px — must match `.rh-rail` gap in home.css

/** `onGround` is the text colour: a light value means the ground is dark. */
function groundIsDark(onGround: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(onGround.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lum = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return lum > 150;
}

function Dots({ n }: { n: number }) {
  return (
    <span className="rh-dots" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={i < n ? "rh-on" : undefined} />
      ))}
    </span>
  );
}

function ProductTile({ f }: { f: Fragrance }) {
  const [flipped, setFlipped] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLAnchorElement>(null);
  const flight = useFlight();
  const trackRef = useRef<HTMLDivElement>(null);
  const base = useRef(0);
  const w = useRef(1);
  const photo = cloudinaryVariant(f.images.flat ?? f.images.hero, { w: 640 });
  // the 4:5 card picture of the chosen art direction (src/config/homepage-assets.ts)
  // fills the whole packshot face once it is final, and falls back to the current
  // picture, then to the catalogue packshot / vector flacon (never a grey plate)
  const concept = useCardConcept();
  const card = resolveCardAsset(f.slug, concept);

  // wide screens only, mouse only: drag the picture to flip between its faces
  useDragX(mediaRef, {
    mouseOnly: true,
    enabled: () => window.matchMedia("(min-width: 900px)").matches,
    skip: (e) => !!(e.target as Element).closest(".rh-tile__nav"),
    start: () => {
      const media = mediaRef.current;
      const track = trackRef.current;
      if (!media || !track) return;
      w.current = media.clientWidth || 1;
      base.current = flipped ? -w.current : 0;
      track.style.transition = "none";
    },
    move: (dx) => {
      const track = trackRef.current;
      if (!track) return;
      let x = base.current + dx;
      if (x > 0) x *= 0.3;
      else if (x < -w.current) x = -w.current + (x + w.current) * 0.3;
      track.style.transform = `translateX(${x}px)`;
    },
    end: (dx) => {
      const track = trackRef.current;
      if (track) {
        track.style.transition = "";
        track.style.transform = "";
      }
      if (dx < -w.current * 0.16 && !flipped) setFlipped(true);
      else if (dx > w.current * 0.16 && flipped) setFlipped(false);
    },
    cancel: () => {
      const track = trackRef.current;
      if (!track) return;
      track.style.transition = "";
      track.style.transform = "";
    },
  });

  useEffect(() => {
    hitRef.current?.toggleAttribute("data-no-transition", flight.canFly());
  }, [flight]);

  const dark = groundIsDark(f.onGround);
  const line = {
    sku: f.sku,
    name: f.name,
    price: f.price,
    mrp: f.mrp,
    fragrance: f.slug,
    href: `/fragrances/${f.slug}`,
    meta: `Extrait · ${f.volumeMl} ml`,
  };

  return (
    <article
      className="rh-tile"
      data-i={flipped ? "1" : "0"}
      data-dark={dark || undefined}
      data-tone={card?.overlayTone}
      data-dots={card?.dotsTone}
      style={
        {
          "--ground": f.ground,
          "--on": f.onGround,
          "--stripe": dark ? "rgba(216,154,77,.17)" : "rgba(255,255,255,.46)",
        } as CSSProperties
      }
    >
      <div className="rh-tile__media rh-grain" ref={mediaRef} data-flight-tile={f.slug}>
        <div className="rh-tile__slides" ref={trackRef}>
          <div
            className={`rh-tile__slide rh-tile__slide--shot${card ? " rh-tile__slide--photo" : ""}`}
          >
            {card ? (
              <HomeImage key={card.id} asset={card} fill className="rh-tile__photo" />
            ) : (
              <>
                <span className="rh-tile__ground" aria-hidden="true" />
                <span
                  className="rh-tile__bottle rh-bt"
                  style={{ filter: `drop-shadow(0 24px 22px ${f.juice}66)` }}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="block w-full"
                    />
                  ) : (
                    <Flacon fragrance={f.slug} label volume />
                  )}
                </span>
              </>
            )}
          </div>
          <div className="rh-tile__slide" aria-hidden={!flipped}>
            <div className="rh-notes">
              <p className="rh-notes__eye">How it unfolds</p>
              <p className="rh-notes__line rh-serif">{f.impression}</p>
              <dl>
                <div>
                  <dt>Arrive</dt>
                  <dd>{f.notesByPhase.arrive}</dd>
                </div>
                <div>
                  <dt>Linger</dt>
                  <dd>{f.notesByPhase.linger}</dd>
                </div>
                <div>
                  <dt>Stay</dt>
                  <dd>{f.notesByPhase.stay}</dd>
                </div>
              </dl>
              <p className="rh-notes__foot">
                <span>
                  <Dots n={f.longevity} />
                  Longevity
                </span>
                <span>{f.wearOccasion}</span>
              </p>
            </div>
          </div>
        </div>
        <Link
          ref={hitRef}
          className="rh-tile__hit"
          href={`/fragrances/${f.slug}`}
          aria-label={`Open ${f.name}`}
          onClick={(e) => {
            // the picture flies into the product page (providers/pdp-flight.tsx); a modified click opens as usual
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const tile = mediaRef.current;
            if (tile && flight.open(f.slug, `/fragrances/${f.slug}`, tile)) e.preventDefault();
          }}
        />
        <button
          type="button"
          className="rh-tile__nav"
          aria-label={flipped ? `Show packshot for ${f.name}` : `Show notes for ${f.name}`}
          aria-pressed={flipped}
          onClick={() => setFlipped((v) => !v)}
        >
          <RhIcon name="chevR" />
        </button>
        <span className="rh-tile__dots" aria-hidden="true">
          <i />
          <i />
        </span>
      </div>

      <div className="rh-tile__body">
        <h3 className="rh-tile__name">{f.name}</h3>
        <p className="rh-tile__title">{f.title}</p>
        <p className="rh-tile__mood">{f.mood.join(" · ")}</p>
        <span className="rh-tile__rule" />
        <p className="rh-tile__price rh-tnum">
          {formatINR(f.price)}
          {f.mrp > f.price && <s>{formatINR(f.mrp)}</s>}
        </p>
        <BagButton line={line} className="rh-btn rh-btn--ghost rh-btn--sm">
          Add to bag <RhIcon name="arrow" />
        </BagButton>
      </div>
    </article>
  );
}

export function Collection({ fragrances }: { fragrances: Fragrance[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const n = fragrances.length;
  const [idx, setIdx] = useState(0);
  const from = useRef(0);
  const step = useRef(1);

  const stepWidth = () => {
    const t = railRef.current?.children[0] as HTMLElement | undefined;
    return t ? t.getBoundingClientRect().width + GAP : 1;
  };
  const indexNow = () => {
    const rail = railRef.current;
    if (!rail) return 0;
    return Math.max(0, Math.min(n - 1, Math.round(rail.scrollLeft / stepWidth())));
  };

  // the "1 / 3" counter follows the scroll position
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      setIdx(indexNow());
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      rail.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  function go(d: number) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTo({
      left: (indexNow() + d) * stepWidth(),
      behavior: reduced ? "auto" : "smooth",
    });
  }

  // the row, when it scrolls sideways (narrower windows): a mouse drags it like a phone
  useDragX(railRef, {
    mouseOnly: true,
    enabled: () => {
      const r = railRef.current;
      return !!r && r.scrollWidth > r.clientWidth + 2;
    },
    start: () => {
      const rail = railRef.current;
      if (!rail) return;
      step.current = stepWidth();
      from.current = rail.scrollLeft;
      rail.style.scrollSnapType = "none";
      rail.style.scrollBehavior = "auto";
    },
    move: (dx) => {
      const rail = railRef.current;
      if (rail) rail.scrollLeft = from.current - dx;
    },
    end: (dx, v) => {
      const rail = railRef.current;
      if (!rail) return;
      const i0 = Math.round(from.current / step.current);
      let i = i0;
      if (dx < -step.current * 0.12 || v < -0.4) i = i0 + 1;
      else if (dx > step.current * 0.12 || v > 0.4) i = i0 - 1;
      i = Math.max(0, Math.min(n - 1, i));
      rail.style.scrollBehavior = "";
      rail.scrollTo({
        left: i * step.current,
        behavior: reduced ? "auto" : "smooth",
      });
      window.setTimeout(() => {
        rail.style.scrollSnapType = "";
      }, 650);
    },
    cancel: () => {
      const rail = railRef.current;
      if (!rail) return;
      rail.style.scrollSnapType = "";
      rail.style.scrollBehavior = "";
    },
  });

  return (
    <section
      className="rh-collection"
      id="collection"
      aria-labelledby="col-h"
    >
      <div className="rh-wrap">
        <div className="rh-sec-head">
          <p className="rh-eyebrow">The Collection</p>
          <h2 className="rh-h2" id="col-h">
            The Three
          </h2>
          <p className="rh-sub">Three extraits, three ways to be remembered.</p>
          <a className="rh-link-u" href="#quiz">
            Not sure? Take the quiz <RhIcon name="arrow" small />
          </a>
        </div>
      </div>

      <div className="rh-rail" ref={railRef} tabIndex={-1}>
        {fragrances.map((f) => (
          <ProductTile key={f.slug} f={f} />
        ))}
      </div>

      <div className="rh-railctl" aria-label="Browse fragrances">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={idx === 0}
          aria-label="Previous fragrance"
        >
          <RhIcon name="chevL" />
        </button>
        <span className="rh-tnum" aria-live="polite">
          {idx + 1} / {n}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={idx >= n - 1}
          aria-label="Next fragrance"
        >
          <RhIcon name="chevR" />
        </button>
      </div>
    </section>
  );
}
