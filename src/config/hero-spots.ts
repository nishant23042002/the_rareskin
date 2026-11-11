/**
 * Where each flacon stands in a SHIPPED hero picture, so the hero can be explored: a pulsing dot on every
 * bottle, a focus frame and a plaque on hover, and a hover / tap target over the bottle that goes to that
 * fragrance's page.
 *
 * One set per hero picture (its manifest id, `public/images/assets-manifest.json`):
 *
 *   hero                  the baseline pedestal picture. FORM "overlay": the picture fills the hero from 1024px
 *                         and the headline stands on its empty wall.
 *   hero-grounded_stone   STONE, the finalized hero (the cards follow it too). FORM "split": the headline on
 *                         the panel tinted from the picture's own edge, the picture beside it (the lime and
 *                         the empty floor on its left leave no clean wall for text).
 *
 * A picture with no set here (the other directions, the reference variants, a photograph uploaded in Site
 * Settings) simply has no hotspots and keeps the plain split layout.
 *
 * Every number is a percentage of the picture (not of the screen), measured on the two art-directed crops:
 * `wide` = the 16:9 master (from 768px up), `tall` = the 4:5 crop (a phone). The hero draws the picture in a
 * box that behaves exactly like `object-fit: cover` (see `.rh-hero__stage` in app/hero.css) and these boxes
 * live inside it, so they stay on the bottles at every screen size.
 *
 *   l / t / w / h   the column: from the top of the cap to the foot of the bottle (or its pedestal)
 *   dy              where the dot sits, as a % of the column's height (on the glass, under the label)
 *   pos             the picture's object position in its box from 1024px (0..1): which part a crop keeps
 *
 * Replace a hero picture and its numbers must be re-measured.
 */
import type { FragranceSlug } from "@/lib/catalog";

export interface HeroColumn {
  l: number;
  t: number;
  w: number;
  h: number;
  dy: number;
}

export interface HeroSpotSet {
  /** overlay: the headline stands on the picture; split: a text panel beside it */
  form: "overlay" | "split";
  pos: { ox: number; oy: number };
  columns: Record<"wide" | "tall", Record<FragranceSlug, HeroColumn>>;
}

export const HERO_SPOTS: Record<string, HeroSpotSet> = {
  hero: {
    form: "overlay",
    // a short window crops the foot of the picture (the floor), never the caps
    pos: { ox: 0.5, oy: 0.12 },
    columns: {
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
    },
  },
  "hero-grounded_stone": {
    form: "split",
    // the three bottles stand in the right two thirds of the wide picture (39-84%): 0.7 keeps all three whole in a half-width box
    pos: { ox: 0.7, oy: 0.5 },
    columns: {
      wide: {
        aurevan: { l: 38.8, t: 35, w: 13.4, h: 43.5, dy: 86 },
        orvelis: { l: 55.4, t: 32.9, w: 12.3, h: 41.4, dy: 86 },
        vayren: { l: 71, t: 34.9, w: 13, h: 43.5, dy: 86 },
      },
      tall: {
        aurevan: { l: 6.8, t: 38.3, w: 26.6, h: 40.1, dy: 85 },
        orvelis: { l: 37.8, t: 36.3, w: 24.5, h: 38.7, dy: 85 },
        vayren: { l: 66.4, t: 38.3, w: 26.8, h: 40.1, dy: 85 },
      },
    },
  },
};

/** the breakpoint where the hero art switches from the 4:5 crop to the 16:9 master (px) */
export const HERO_WIDE_FROM = 768;
