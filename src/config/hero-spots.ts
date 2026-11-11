/**
 * Where each flacon stands in the SHIPPED hero picture (manifest id `hero`,
 * `public/images/assets-manifest.json`), so the hero can be explored: a pulsing dot on every bottle, and a
 * hover / tap target over the bottle and its pedestal that goes to that fragrance's page.
 *
 * Every number is a percentage of the picture (not of the screen), measured on the two art-directed
 * crops: `wide` = the 16:9 master (from 768px up), `tall` = the 4:5 crop (a phone). The hero draws the
 * picture in a box that behaves exactly like `object-fit: cover` (see `.rh-hero__stage` in app/hero.css)
 * and these boxes live inside it, so they stay on the bottles at every screen size.
 *
 *   l / t / w / h   the column: from the top of the cap to the foot of the pedestal
 *   dy              where the dot sits, as a % of the column's height (on the glass, under the label)
 *
 * These coordinates belong to THAT picture only. Replace the hero art and re-measure them; the other
 * hero directions (the preview bar's concepts, the reference variants) and any photograph uploaded in
 * Site Settings carry no hotspots, and the hero then falls back to the plain split layout.
 */
import type { FragranceSlug } from "@/lib/catalog";

export interface HeroColumn {
  l: number;
  t: number;
  w: number;
  h: number;
  dy: number;
}

export const HERO_COLUMNS: Record<"wide" | "tall", Record<FragranceSlug, HeroColumn>> = {
  wide: {
    aurevan: { l: 34.8, t: 33.8, w: 16.2, h: 62, dy: 49 },
    vayren: { l: 53, t: 20.8, w: 16.9, h: 75, dy: 41 },
    orvelis: { l: 70.9, t: 6, w: 18.6, h: 89.8, dy: 34 },
  },
  tall: {
    aurevan: { l: 11.2, t: 40.9, w: 22.4, h: 52.6, dy: 46 },
    vayren: { l: 39.8, t: 32.3, w: 20.7, h: 61.2, dy: 40 },
    orvelis: { l: 67.2, t: 24.1, w: 21.8, h: 69.4, dy: 35 },
  },
};

/** the picture's id that these coordinates were measured on */
export const HERO_SPOTS_ASSET_ID = "hero";

/** the breakpoint where the hero art switches from the 4:5 crop to the 16:9 master (px) */
export const HERO_WIDE_FROM = 768;
