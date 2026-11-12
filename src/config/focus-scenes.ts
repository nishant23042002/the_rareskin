import type { FragranceSlug } from "@/lib/catalog";

/**
 * "In focus" scenes: the dark still-life each fragrance stands in, in the bottle slot of the In Focus section
 * (`src/components/home/in-focus.tsx`, `focus-scene.tsx`). Each is ONE picture (3:4) of the approved flacon with the
 * ingredients of its notes on black; it is laid on the section with `mix-blend-mode: screen`, so the black is the section's
 * own onyx and the glass shows the section's glow through it. Files: `public/images/focus/<slug>-<width>.webp` (1500 + 750 px);
 * source + build: `design-explorations/section-images/focus/` (one Kling generation per fragrance, the approved packshot as the reference).
 *
 * `hotspots` are the notes, pinned to what they are made of (x / y as a share of the picture): the dot lights, the name of the note
 * slides out beside it on hover / focus / tap. A fragrance without a scene here keeps the photograph from the catalogue, else the drawn flacon.
 */
export interface FocusHotspot {
  /** share of the picture, 0-100 */
  x: number;
  y: number;
  label: string;
  /** which side the name slides out to */
  side: "left" | "right";
}

export interface FocusScene {
  /** file stem under /images/focus/ (`<stem>-1500.webp`, `<stem>-750.webp`) */
  stem: string;
  width: number;
  height: number;
  alt: string;
  hotspots: FocusHotspot[];
}

/** bump when a file in public/images/focus changes (plain files: the browser cache) */
export const FOCUS_VERSION = 5;

export const FOCUS_SCENES: Partial<Record<FragranceSlug, FocusScene>> = {
  aurevan: {
    stem: "aurevan",
    width: 1500,
    height: 2000,
    alt: "AUREVAN 50 ml on black glass, backlit, with halved bergamot, a white gardenia and a sliver of cedar at its foot",
    hotspots: [
      { x: 16.1, y: 61.3, label: "Citrus · Bergamot", side: "left" },
      { x: 70.3, y: 70.6, label: "White florals", side: "right" },
      { x: 89.5, y: 73.8, label: "Cedar", side: "right" },
      { x: 48.7, y: 75, label: "Musk", side: "left" },
    ],
  },
  orvelis: {
    stem: "orvelis",
    width: 1500,
    height: 2000,
    alt: "ORVELIS 50 ml on black glass, backlit in amber, with cinnamon, star anise, amber resin, a vanilla pod, a slab of dark wood and patchouli leaves at its foot",
    hotspots: [
      { x: 21.3, y: 75.5, label: "Spices", side: "left" },
      { x: 72, y: 77, label: "Amber", side: "left" },
      { x: 76, y: 47.5, label: "Vanilla", side: "right" },
      { x: 87.5, y: 64, label: "Woods", side: "right" },
      { x: 92.5, y: 80, label: "Patchouli", side: "left" },
    ],
  },
  vayren: {
    stem: "vayren",
    width: 1500,
    height: 2000,
    alt: "VAYREN 50 ml on black glass with a roll of leather, black peppercorns, oud wood, a nutmeg, amber resin and a ribbon of smoke at its foot",
    hotspots: [
      { x: 10, y: 70.5, label: "Leather", side: "right" },
      { x: 13.5, y: 83.5, label: "Spices", side: "right" },
      { x: 83.3, y: 68.5, label: "Oud", side: "right" },
      { x: 92, y: 80, label: "Amber", side: "left" },
      { x: 80.7, y: 17.5, label: "Smoke", side: "left" },
    ],
  },
};

export function focusSceneSrc(scene: FocusScene, width: 750 | 1500): string {
  return `/images/focus/${scene.stem}-${width}.webp?v=${FOCUS_VERSION}`;
}
