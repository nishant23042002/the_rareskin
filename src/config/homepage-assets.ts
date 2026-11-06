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
 * HOW TO CHOOSE: change `DEFAULT_CARD_CONCEPT` below. Until a concept's picture is
 * `final` in the manifest, its tile falls back to the current picture, so a
 * half-generated set never shows a grey placeholder.
 *
 * HOW TO COMPARE: a small bar at the bottom of the homepage switches concepts
 * live, and `/?concept=<id>` opens the page on one. It is on in development, in a
 * build made with NEXT_PUBLIC_CARD_SWITCHER=1, and (SHOWCASE) in every build while
 * `CARD_SWITCHER_PUBLIC` below is true, so the founder can pick a direction on the
 * deployed site. When a direction is chosen: set `DEFAULT_CARD_CONCEPT`, set
 * `CARD_SWITCHER_PUBLIC = false` and the bar and the URL parameter go inert in
 * production (then delete the losing pictures and the pedestal cards).
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
    blurb: "The pictures shipped first: the flacon on a pedestal. To be retired.",
  },
  {
    id: "grounded_stone",
    label: "Grounded stone",
    blurb: "Direct earth and stone: limestone, raw oak, basalt, the ingredients beside the base.",
  },
  {
    id: "grounded_stone_v2",
    label: "Stone v2",
    blurb: "An alternative plate for grounded stone (limestone table, bergamot front right). Only the pictures that exist replace the grounded-stone ones.",
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

/**
 * An alternative that only exists for some fragrances shows the direction it
 * belongs to on the others (so a row is never mixed with the old pedestal cards
 * just because one picture was tried on a second plate).
 */
export const CARD_CONCEPT_FALLBACK: Partial<Record<CardConceptId, CardConceptId>> = {
  grounded_stone_v2: "grounded_stone",
};

/** the direction the tiles show to everyone (switch to a concept once its pictures are final) */
export const DEFAULT_CARD_CONCEPT: CardConceptId = "current";

/** SHOWCASE: keep the preview bar on the deployed site so the founder can choose; set to false once a direction is chosen */
export const CARD_SWITCHER_PUBLIC = true;

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
