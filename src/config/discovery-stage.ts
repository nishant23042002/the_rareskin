/**
 * The Discovery Set stage: where the three 10 ml bottles stand in each background, as a share of it
 * (`design-explorations/discovery-set/build_stage_final.py` writes these numbers and the files in
 * `public/images/homepage/stage/`: `dark-<layout>.webp` = the photograph with the bottles taken out, `bottle-<slug>.webp` = the clear, bright 10 ml bottle (the same one as on the light pictures: `bottle_light` in scenelib.py, built with LIGHT=1).
 * The light stage files (`light-*.webp`, drawn by the older scenes_stage.py) are retired: they no longer match these bottle layers.)
 * `desktop` is the wide picture of the split layout (from 900px), `mobile` the 4:3 band below it.
 * Plain data: no imports of components.
 */
export type StageTone = "light" | "dark";
export type StageLayout = "desktop" | "mobile";

export const STAGE_VERSION = 17; // bump when a file in public/images/homepage/stage changes (plain files, browser cache)
export const STAGE_BASE = "/images/homepage/stage";
/** the transparent bottle files are this tall (px); width follows the ratio below */
export const STAGE_BOTTLE = { w: 290, h: 1349 } as const;

export const STAGE_LAYOUT: Record<
  StageLayout,
  { w: number; h: number; bottles: { slug: "aurevan" | "orvelis" | "vayren"; left: number; top: number; width: number }[] }
> = {
  desktop: {
    w: 2000,
    h: 1560,
    bottles: [
      { slug: "aurevan", left: 21.319, top: 16.636, width: 11.824 },
      { slug: "orvelis", left: 43.947, top: 16.636, width: 11.824 },
      { slug: "vayren", left: 66.291, top: 16.636, width: 11.824 },
    ],
  },
  mobile: {
    w: 1600,
    h: 1200,
    bottles: [
      { slug: "aurevan", left: 19.863, top: 13.589, width: 12.414 },
      { slug: "orvelis", left: 43.622, top: 13.589, width: 12.414 },
      { slug: "vayren", left: 67.08, top: 13.589, width: 12.414 },
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
