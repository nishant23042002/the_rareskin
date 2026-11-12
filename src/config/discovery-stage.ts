/**
 * The Discovery Set stage: where the three 10 ml bottles stand in each background, as a share of it
 * (`design-explorations/discovery-set/scenes_stage.py` writes these numbers and the files in
 * `public/images/homepage/stage/`: `<tone>-<layout>.webp` backgrounds without bottles, `bottle-<slug>.webp` transparent bottles).
 * `desktop` is the wide picture of the split layout (from 900px), `mobile` the 4:3 band below it.
 * Plain data: no imports of components.
 */
export type StageTone = "light" | "dark";
export type StageLayout = "desktop" | "mobile";

export const STAGE_VERSION = 12; // bump when a file in public/images/homepage/stage changes (plain files, browser cache)
export const STAGE_BASE = "/images/homepage/stage";
/** the transparent bottle files are this tall (px); width follows the ratio below */
export const STAGE_BOTTLE = { w: 236, h: 1100 } as const;

export const STAGE_LAYOUT: Record<
  StageLayout,
  { w: number; h: number; bottles: { slug: "aurevan" | "orvelis" | "vayren"; left: number; top: number; width: number }[] }
> = {
  desktop: {
    w: 2000,
    h: 1560,
    bottles: [
      { slug: "aurevan", left: 26.475, top: 18.59, width: 10.85 },
      { slug: "orvelis", left: 44.15, top: 15.385, width: 11.7 },
      { slug: "vayren", left: 62.675, top: 18.59, width: 10.85 },
    ],
  },
  mobile: {
    w: 1600,
    h: 1200,
    bottles: [
      { slug: "aurevan", left: 28.406, top: 18.333, width: 10.438 },
      { slug: "orvelis", left: 44.375, top: 15, width: 11.25 },
      { slug: "vayren", left: 61.156, top: 18.333, width: 10.438 },
    ],
  },
};

/** the colour each bottle's light takes on hover: the fragrance's accent, lifted on the dark stage */
export const STAGE_TINT: Record<StageTone, Record<"aurevan" | "orvelis" | "vayren", string>> = {
  dark: { aurevan: "#c4b492", orvelis: "#d6923a", vayren: "#9e6440" },
  light: { aurevan: "#b9a97f", orvelis: "#d49a3c", vayren: "#8a5a3a" },
};

export function stageSrc(file: string): string {
  return `${STAGE_BASE}/${file}?v=${STAGE_VERSION}`;
}
