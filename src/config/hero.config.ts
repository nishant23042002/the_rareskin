/**
 * Homepage HERO picture: which art direction it shows.
 *
 * Baseline = the shipped hero (three flacons on stepped travertine pedestals,
 * manifest id `hero`). Alternatives (no pedestal, the trio standing on the ground,
 * plates + prompts in `public/images/hero-manifest.json`, files registered in
 * `public/images/assets-manifest.json` as `hero-<concept>`):
 *
 *   grounded_stone      pale limestone floor, bergamot / jasmine / cinnamon between the bottles
 *   chiaroscuro_studio  seamless plaster, window-frame shadows, melts into the white page
 *   mineral_bed         low in a bed of marble dust, spice and volcanic sand
 *   liquid_caustics     standing in a still sheet of water, reflections and caustic light
 *
 * The concept ids are the card directions of `src/config/homepage-assets.ts`, so by
 * default ONE preview bar drives the hero and "The Three" together
 * (`HERO_FOLLOWS_CARD_CONCEPT`). A direction whose hero pictures are still
 * placeholders shows the baseline hero (never a grey plate). When a direction is
 * chosen: set `DEFAULT_HERO_CONCEPT` (and `DEFAULT_CARD_CONCEPT`), set
 * `HERO_FOLLOWS_CARD_CONCEPT = false`.
 *
 * Plain data, no imports of components, so the library and the components can read it.
 */
import type { CardConceptId, PlateConceptId } from "./homepage-assets";

/**
 * Reference-benchmark hero variants (brief of 2026-11-07, prompts + production notes in
 * `public/images/hero-manifest.json` → `referenceVariants`, files registered in
 * `public/images/assets-manifest.json` as `hero-variant_<n>_<name>`):
 *
 *   1  uncapping  three flacons in a row, a manicured hand lifts the cap off the centre one
 *   2  spraying   three flacons in a row, a fingertip presses the right nozzle, its cap on the floor
 *   3  cylinders  three matte-white cylindrical plinths at staggered heights
 *   4  risers     geometric off-white steps, a cut bergamot and a vanilla pod at the lowest step
 *
 * `activeHeroVariant` is the one everybody sees (null = none: the hero follows the card
 * preview bar, see below). The preview bar's own choice (`?hero=1..4`) beats it while
 * `CARD_SWITCHER_PUBLIC` is on. A variant whose pictures are still placeholders is skipped
 * (the hero falls back), never shown as a grey plate.
 */
export const HERO_VARIANTS = [
  { n: 1, id: "variant_1_uncapping", label: "Uncapping", blurb: "A hand lifts the cap off the centre flacon" },
  { n: 2, id: "variant_2_spraying", label: "Spraying", blurb: "A fingertip presses the nozzle, the cap beside the base" },
  { n: 3, id: "variant_3_cylinders", label: "Cylinders", blurb: "Matte-white cylindrical plinths at staggered heights" },
  { n: 4, id: "variant_4_geometric_risers", label: "Risers", blurb: "Geometric steps, a bergamot slice and a vanilla pod" },
] as const;

export type HeroVariantNumber = (typeof HERO_VARIANTS)[number]["n"];
type HeroVariantId = (typeof HERO_VARIANTS)[number]["id"];

export const activeHeroVariant: HeroVariantNumber | null = null;

export function isHeroVariant(v: unknown): v is HeroVariantNumber {
  return HERO_VARIANTS.some((h) => h.n === v);
}

export function heroVariantAssetId(n: HeroVariantNumber): `hero-${HeroVariantId}` {
  const v = HERO_VARIANTS.find((h) => h.n === n)!;
  return `hero-${v.id}`;
}

export type HeroAssetId = "hero" | `hero-${PlateConceptId}` | `hero-${HeroVariantId}`;

/** the hero switches with the card-direction preview bar */
export const HERO_FOLLOWS_CARD_CONCEPT = true;

/** the direction everyone sees when the hero does not follow the bar */
export const DEFAULT_HERO_CONCEPT: CardConceptId = "current";

export function heroAssetId(concept: CardConceptId): HeroAssetId {
  return concept === "current" ? "hero" : `hero-${concept}`;
}
