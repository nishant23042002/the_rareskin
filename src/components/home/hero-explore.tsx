"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { RhIcon } from "@/components/ui/rh-icon";
import { HERO_COLUMNS } from "@/config/hero-spots";
import { formatINR, type FragranceSlug } from "@/lib/catalog";
import { useHero } from "./hero-frame";

/**
 * The two halves of exploring the hero, joined by the hero's shared `hot` fragrance:
 *
 *  - `HeroIndex`: the numbered list under the button. Pointing at (or tabbing to) a row lights that
 *    flacon in the picture.
 *  - `HeroSpots`: one column over each flacon and its pedestal, drawn inside the picture's own box
 *    (see `HeroMedia`), so it is pinned to the bottle at every size. Pointing at it (or tabbing to
 *    it) lights the matching index row. A dot pulses on the glass; on a mouse a focus frame (four
 *    brackets, the rest of the scene dimmed) and a plaque (`HeroPlaques`: name, launch price, "View")
 *    appear. Clicking anywhere on the column opens the fragrance's page.
 *
 * Pointing never moves or scales the picture: hover only changes light and opacity, so the hero
 * cannot shift under the cursor. The frame and plaque exist from 1024px with a mouse
 * (`app/hero.css`); a phone gets the dots.
 */

export interface HeroExploreItem {
  slug: FragranceSlug;
  name: string;
  /** "The Quiet Confidence" */
  title: string;
  /** the first notes, for the index */
  notes: string[];
}

export function HeroIndex({ items }: { items: HeroExploreItem[] }) {
  const { hot, setHot } = useHero();
  return (
    <ol className="rh-hero__index" aria-label="The three extraits">
      {items.map((f, i) => (
        <li key={f.slug} style={{ "--i": i } as CSSProperties}>
          <Link
            href={`/fragrances/${f.slug}`}
            className={hot === f.slug ? "is-hot" : undefined}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHot(f.slug)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHot(null)}
            onFocus={() => setHot(f.slug)}
            onBlur={() => setHot(null)}
          >
            <span className="rh-hero__no rh-tnum" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <b>{f.name}</b>
            <em>{f.notes.slice(0, 2).join(" · ")}</em>
            <RhIcon name="arrow" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function HeroSpots({ items, price }: { items: HeroExploreItem[]; /** launch price, rupees (for the accessible name) */ price: number }) {
  const { hot, setHot } = useHero();

  return (
    <>
      {items.map((f, i) => {
        const w = HERO_COLUMNS.wide[f.slug];
        const t = HERO_COLUMNS.tall[f.slug];
        return (
          <Link
            key={f.slug}
            href={`/fragrances/${f.slug}`}
            className={`rh-col${hot === f.slug ? " is-hot" : ""}`}
            aria-label={`${f.name}, ${f.title}. ${formatINR(price)}`}
            data-f={f.slug}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHot(f.slug)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHot(null)}
            onFocus={() => setHot(f.slug)}
            onBlur={() => setHot(null)}
            style={
              {
                "--i": i,
                "--wl": `${w.l}%`,
                "--wt": `${w.t}%`,
                "--ww": `${w.w}%`,
                "--wh": `${w.h}%`,
                "--wdy": `${w.dy}%`,
                "--tl": `${t.l}%`,
                "--tt": `${t.t}%`,
                "--tw": `${t.w}%`,
                "--th": `${t.h}%`,
                "--tdy": `${t.dy}%`,
              } as CSSProperties
            }
          >
            <span className="rh-col__frame" aria-hidden="true" />
            <span className="rh-col__glow" aria-hidden="true" />
            <span className="rh-col__dot" aria-hidden="true" />
          </Link>
        );
      })}
    </>
  );
}

/**
 * The plaques: one per flacon, centred on its pedestal but pinned to the BOTTOM of the visible hero, just
 * above where the launch pass overlaps it, so they always stand clear of the pass however tall or wide the
 * window is (the picture is cropped differently at every size; the bottom of the hero never is). They sit in
 * a layer beside the picture (see `HeroMedia`) and are placed with the same container-unit arithmetic as the
 * picture's own box, so each stays under its bottle. Shown on a mouse from 1024px; purely visual (the
 * columns carry the link and the accessible name).
 */
export function HeroPlaques({
  items,
  price,
  mrp,
}: {
  items: HeroExploreItem[];
  price: number;
  mrp: number;
}) {
  const { hot } = useHero();
  return (
    <div className="rh-plaques" aria-hidden="true">
      {items.map((f) => {
        const w = HERO_COLUMNS.wide[f.slug];
        return (
          <div
            key={f.slug}
            className={`rh-plaque${hot === f.slug ? " is-hot" : ""}`}
            style={{ "--cx": (w.l + w.w / 2) / 100 } as CSSProperties}
          >
            <b>{f.name}</b>
            <em>{f.title}</em>
            <span className="rh-plaque__p rh-tnum">
              {formatINR(price)}
              {mrp > price && <s>{formatINR(mrp)}</s>}
            </span>
            <span className="rh-plaque__go">
              View <RhIcon name="arrow" />
            </span>
          </div>
        );
      })}
    </div>
  );
}
