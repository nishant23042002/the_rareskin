/**
 * Homepage "The Three" card pictures: which art direction the tiles show.
 *
 * The first set of cards stood the flacon on a pedestal with the ingredients
 * scattered on the floor below, which shrank the bottle and cluttered the frame.
 * The alternatives stand it directly on the ground (see `public/images/prompt-manifest.json`
 * for the plate prompts, `public/images/assets-manifest.json` for the files):
 *
 *   grounded_stone      honed limestone / raw oak / basalt, ingredients beside the base
 *   chiaroscuro_studio  off-white plaster sweep, window-frame shadows, merges with the page
 *   mineral_bed         low-angle macro, base set into marble dust / crushed spice / volcanic sand
 *   liquid_caustics     shallow water or an optical-glass plate, golden caustics beside the bottle
 *
 * FINALIZED (2026-11-12): the founder chose STONE (`grounded_stone`). It is the default
 * below, `CARD_SWITCHER_PUBLIC` is off, and the hero follows the cards (see
 * `HERO_FOLLOWS_CARD_CONCEPT` in `hero.config.ts`), so everyone sees the Stone cards and the Stone hero.
 * The other directions (the pedestal set, Studio light, Mineral bed, Liquid light), their pictures and
 * their manifest entries are all KEPT, untouched: nothing was deleted. They are one line away: change
 * `DEFAULT_CARD_CONCEPT`, or preview them in development (see below).
 *
 * HOW TO CHOOSE: change `DEFAULT_CARD_CONCEPT` below. Until a concept's picture is
 * `final` in the manifest, its tile falls back to the current picture, so a
 * half-generated set never shows a grey placeholder.
 *
 * HOW TO COMPARE: a slim "Preview" tab on the left edge of the homepage opens a
 * panel that switches concepts live, and `/?concept=<id>` opens the page on one. It is on in
 * development, in a build made with NEXT_PUBLIC_CARD_SWITCHER=1, and in every build while
 * `CARD_SWITCHER_PUBLIC` below is true. It is now false, so in production the bar and the URL
 * parameter are inert.
 *
 * This file is plain data (no imports), so the library and the components can
 * both read it.
 */

export const CARD_SLUGS = ["aurevan", "orvelis", "vayren"] as const;
export type CardSlug = (typeof CARD_SLUGS)[number];

export const CARD_CONCEPTS = [
  {
    id: "current",
    label: "Pedestal (v2)",
    blurb: "The pictures shipped first: the flacon on a pedestal. Kept, no longer the default.",
  },
  {
    id: "grounded_stone",
    label: "Stone",
    blurb: "Direct earth and stone: limestone, raw oak, basalt, the ingredients beside the base. The finalized direction.",
  },
  {
    id: "chiaroscuro_studio",
    label: "Studio light",
    blurb: "Plaster sweep and window-frame shadows; blends into the page.",
  },
  {
    id: "mineral_bed",
    label: "Mineral bed",
    blurb: "Low-angle macro, the base set into marble dust, spice or volcanic sand.",
  },
  {
    id: "liquid_caustics",
    label: "Liquid light",
    blurb: "A water film or optical glass, golden caustics beside the bottle.",
  },
] as const;

export type CardConceptId = (typeof CARD_CONCEPTS)[number]["id"];
export type PlateConceptId = Exclude<CardConceptId, "current">;

/** the direction the tiles show to everyone: STONE, finalized 2026-11-12 (the other directions are kept, see above) */
export const DEFAULT_CARD_CONCEPT: CardConceptId = "grounded_stone";

/** SHOWCASE switch: true keeps the preview bar and `?concept=` on the deployed site. Off now that Stone is chosen. */
export const CARD_SWITCHER_PUBLIC = false;

/** the preview bar and the `?concept=` parameter */
export const CARD_SWITCHER_ENABLED =
  CARD_SWITCHER_PUBLIC ||
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_CARD_SWITCHER === "1";

/** manifest ids: `<slug>-product` is the current pedestal picture, `<slug>-card-<concept>` the alternatives */
export type CardAssetId = `${CardSlug}-product` | `${CardSlug}-card-${PlateConceptId}`;

export function cardAssetId(concept: CardConceptId, slug: CardSlug): CardAssetId {
  return concept === "current" ? `${slug}-product` : `${slug}-card-${concept}`;
}

export function isCardConcept(value: string | null | undefined): value is CardConceptId {
  return CARD_CONCEPTS.some((c) => c.id === value);
}
