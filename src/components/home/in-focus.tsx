"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";

import { BagButton } from "@/components/cart/bag-button";
import { Flacon } from "@/components/ui/flacon";
import { useDragX } from "@/hooks/use-drag-x";
import { FOCUS_SCENES } from "@/config/focus-scenes";
import { FocusScene } from "./focus-scene";
import {
  cloudinaryVariant,
  formatINR,
  type Fragrance,
  type FragranceSlug,
} from "@/lib/catalog";

/**
 * "In focus" — a dark spotlight on one fragrance at a time, with a ghost word
 * behind a large flacon, the poem, the notes and a way to buy. Pick with the
 * tabs (top on a phone, bottom on desktop), the arrow keys, a swipe, or a mouse
 * drag. Below 900px the copy is a centred stack ending in one full-width
 * champagne bar; from 900px it is a three-column composition.
 */

// The room each fragrance sits in: always the site's one dark (the announcement bar's obsidian, `--onyx`), with
// the scent's own colour as a faint glow behind the bottle (home.css mixes it down to about a third). The rooms
// used to have their own brown bases, so In Focus read as a different dark from the rest of the page.
const TONE: Record<FragranceSlug, { base: string; glow: string }> = {
  aurevan: { base: "var(--onyx)", glow: "#8c8466" },
  orvelis: { base: "var(--onyx)", glow: "#9a7c4e" },
  vayren: { base: "var(--onyx)", glow: "#7a5638" },
};

export function InFocus({ fragrances }: { fragrances: Fragrance[] }) {
  const n = fragrances.length;
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const grabbed = useRef<HTMLDivElement | null>(null);

  // drag the scene to bring the next / previous fragrance in
  useDragX(sectionRef, {
    skip: (e) => {
      const t = e.target as Element;
      // controls are not drag handles, but the picture (a link) is: a drag that starts on it swipes to the next fragrance
      return !!t.closest("button, a, [role=tab]") && !t.closest(".rh-fscene__link");
    },
    start: () => {
      grabbed.current = wrapRefs.current[active] ?? null;
    },
    move: (dx) => {
      const el = grabbed.current;
      if (!el) return;
      const w = sectionRef.current?.clientWidth || 1;
      el.style.transition = "none";
      el.style.transform = `translateX(${dx * 0.55}px)`;
      el.style.opacity = String(1 - Math.min(0.55, Math.abs(dx) / (w * 0.9)));
    },
    end: (dx, v) => {
      const el = grabbed.current;
      const w = sectionRef.current?.clientWidth || 1;
      const go = Math.abs(dx) > w * 0.12 || Math.abs(v) > 0.45;
      const d = dx < 0 ? 1 : -1;
      if (el) {
        el.style.transition =
          "transform .6s var(--ease), opacity .6s var(--ease)";
        el.style.transform = "";
        el.style.opacity = "";
      }
      if (go) {
        const next = (active + d + n) % n;
        setActive(next);
        // the incoming slide glides in from the side the drag came from
        requestAnimationFrame(() => {
          const nw = wrapRefs.current[next];
          if (!nw || nw === el) return;
          nw.style.transition = "none";
          nw.style.transform = `translateX(${d * 56}px)`;
          void nw.offsetWidth;
          nw.style.transition = "transform .9s var(--ease)";
          nw.style.transform = "";
        });
      }
      window.setTimeout(() => {
        wrapRefs.current.forEach((x) => {
          if (x) x.style.transition = "";
        });
      }, 1000);
    },
    cancel: () => {
      const el = grabbed.current;
      if (!el) return;
      el.style.transform = "";
      el.style.opacity = "";
      el.style.transition = "";
    },
  });

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = active;
    let to = -1;
    if (e.key === "ArrowRight") to = (i + 1) % n;
    else if (e.key === "ArrowLeft") to = (i + n - 1) % n;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = n - 1;
    if (to < 0) return;
    e.preventDefault();
    setActive(to);
    tabRefs.current[to]?.focus();
  }

  return (
    <section
      ref={sectionRef}
      className="rh-focus rh-dark"
      id="focus"
      aria-label="In focus"
    >
      <div className="rh-fslides">
        {fragrances.map((f, i) => {
          const photo = cloudinaryVariant(f.images.flat ?? f.images.hero, {
            w: 900,
          });
          const price = (
            <>
              {formatINR(f.price)}
              {f.mrp > f.price && <s>{formatINR(f.mrp)}</s>}
            </>
          );
          const line = {
            sku: f.sku,
            name: f.name,
            price: f.price,
            mrp: f.mrp,
            fragrance: f.slug,
            href: `/fragrances/${f.slug}`,
            meta: `Extrait · ${f.volumeMl} ml`,
          };
          const tone = TONE[f.slug];
          const scene = FOCUS_SCENES[f.slug];
          return (
            <div
              key={f.slug}
              id={`fs-${f.slug}`}
              role="tabpanel"
              aria-labelledby={`ftab-${f.slug}`}
              aria-hidden={active !== i}
              className={`rh-fslide${active === i ? " is-active" : ""}`}
              style={
                { "--base": tone.base, "--glow": tone.glow } as CSSProperties
              }
            >
              <div className="rh-fslide__bg" />
              <span className="rh-fslide__ghost" aria-hidden="true">
                {f.name}
              </span>
              <div
                className="rh-wrap rh-fslide__wrap"
                ref={(el) => {
                  wrapRefs.current[i] = el;
                }}
              >
                <div className="rh-fslide__in">
                  <div className={`rh-fslide__bottle${scene ? " rh-fslide__bottle--scene" : ""}`}>
                    {scene ? (
                      <FocusScene scene={scene} name={f.name} active={active === i} href={`/fragrances/${f.slug}`} />
                    ) : photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={f.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Flacon fragrance={f.slug} label volume />
                    )}
                  </div>
                  <div className="rh-fslide__copy">
                    <p className="rh-eyebrow">In focus</p>
                    <h2 className="rh-fslide__name">
                      <Link
                        href={`/fragrances/${f.slug}`}
                        tabIndex={active === i ? 0 : -1}
                      >
                        {f.name}
                      </Link>
                    </h2>
                    <p className="rh-fslide__title rh-serif">{f.title}</p>
                    <p className="rh-fslide__poem">{f.poem}</p>
                    <p className="rh-fslide__notes">
                      <span className="rh-fslide__mood">
                        {f.mood.join(" · ")}
                      </span>
                      <span className="rh-fslide__nl">
                        {f.notes.join(" · ")}
                      </span>
                    </p>
                    <div className="rh-fslide__buy">
                      <span className="rh-fslide__price rh-tnum">{price}</span>
                      <BagButton line={line} className="rh-link-u">
                        Add to bag
                      </BagButton>
                    </div>
                    <BagButton line={line} className="rh-fslide__cta">
                      <span>Add to bag</span>
                      <span className="rh-tnum">{price}</span>
                    </BagButton>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="rh-focus__tabs"
        role="tablist"
        aria-label="Choose a fragrance"
        onKeyDown={onTabKey}
      >
        {fragrances.map((f, i) => (
          <button
            key={f.slug}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`ftab-${f.slug}`}
            aria-controls={`fs-${f.slug}`}
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {f.name}
          </button>
        ))}
      </div>
    </section>
  );
}
