import type { FragranceSlug } from "@/lib/catalog";
import manifestJson from "../../public/images/assets-manifest.json";

/**
 * Cache key of every product picture: the same number as the homepage pictures (`public/images/assets-manifest.json` -> `assetVersion`). These are plain <img>
 * files, so a visitor's browser may hold the old copy of a picture that was replaced in place; bump the number whenever a file in `public/images/pdp` is replaced.
 */
export const PDP_ASSET_VERSION = (manifestJson as { assetVersion: number }).assetVersion;

/**
 * The official product photographs of each extrait, in the order of the three
 * "Official_<NAME>.pdf" sets (2026-11-07): the packshot, the product scene, the
 * editorial card, the lifestyle scene, the everyday-carry flat lay and the pack
 * beside its carton. They are the finished images of the packaging work, converted to
 * WebP at two widths (640 px for thumbnails and phones, the original width up to
 * 1600 px for the large view) in `public/images/pdp/<slug>/`.
 *
 * `PdpGallery` shows these first; any photograph uploaded in the admin catalogue
 * (`images.flat | hero | box`) follows them. The bottle is the approved flacon
 * (label `ESSENTIALS | 50ml`); nothing here is generated at runtime.
 */
interface PdpPhoto {
  /** file stem under /images/pdp/<slug>/ (`<stem>-<width>.webp`) */
  stem: string;
  /** width of the large file; its height is `height` */
  width: number;
  height: number;
  /** width of the small file */
  small: number;
  alt: string;
  /** folder under /images/pdp/ when it is not the fragrance's slug (a size's own set, `aurevan-10ml`) */
  dir?: string;
}

/** width of the `tiny` file: the gallery's strip thumbnails (`scripts/brand-assets/make_pdp_tiny.py`) */
export const PDP_TINY_WIDTH = 160;

export function pdpPhotoSrc(
  slug: FragranceSlug | string,
  p: PdpPhoto,
  size: "full" | "small" | "tiny",
): string {
  const w = size === "full" ? p.width : size === "small" ? p.small : PDP_TINY_WIDTH;
  return `/images/pdp/${p.dir ?? slug}/${p.stem}-${w}.webp?v=${PDP_ASSET_VERSION}`;
}

export const PDP_GALLERY: Record<FragranceSlug, PdpPhoto[]> = {
  aurevan: [
    { stem: "01-packshot", width: 1000, height: 1150, small: 640, alt: "AUREVAN extrait, 50 ml, on a plain studio background" },
    { stem: "02-marble-bergamot-gardenia", width: 1600, height: 1600, small: 640, alt: "AUREVAN on a white marble block beside a halved bergamot and a white gardenia" },
    { stem: "03-editorial-quiet-confidence", width: 1600, height: 1600, small: 640, alt: "AUREVAN editorial card, “The Quiet Confidence”: the extrait on a marble shelf with a lime half and a gardenia" },
    { stem: "04-lifestyle-marble-table", width: 1600, height: 1600, small: 640, alt: "AUREVAN on a round marble table, a hand with a shirt cuff resting beside it, bergamot and gardenia behind" },
    { stem: "05-everyday-carry-flatlay", width: 1600, height: 1600, small: 640, alt: "AUREVAN laid flat on a wooden board with a watch, glasses, a leather wallet, a shirt and a bergamot" },
    { stem: "06-with-carton", width: 1254, height: 1085, small: 640, alt: "AUREVAN beside its carton on a marble ledge, with gardenia and raspberries" },
  ],
  orvelis: [
    { stem: "01-packshot", width: 1000, height: 1150, small: 640, alt: "ORVELIS extrait, 50 ml, on a plain studio background" },
    { stem: "02-amber-vanilla-spice", width: 1600, height: 1600, small: 640, alt: "ORVELIS on a travertine ledge in low sun with cinnamon, star anise, vanilla and amber resin" },
    { stem: "03-editorial-lasting-impression", width: 1600, height: 1600, small: 640, alt: "ORVELIS editorial card, “The Lasting Impression”: the extrait on a marble shelf with star anise" },
    { stem: "04-lifestyle-lamp-table", width: 1600, height: 1600, small: 640, alt: "ORVELIS on a marble desk under a brass lamp, a hand with a watch beside it, cinnamon and star anise" },
    { stem: "05-everyday-carry-flatlay", width: 1600, height: 1600, small: 640, alt: "ORVELIS laid flat on terracotta fabric with a leather watch, a belt, walnuts and cinnamon" },
    { stem: "06-with-carton", width: 1254, height: 1150, small: 640, alt: "ORVELIS beside its carton on a wooden shelf with a blood orange" },
  ],
  vayren: [
    { stem: "01-packshot", width: 1000, height: 1150, small: 640, alt: "VAYREN extrait, 50 ml, on a plain studio background" },
    { stem: "02-leather-oud-smoke", width: 1600, height: 1600, small: 640, alt: "VAYREN on a black stone block with a thread of smoke, leather and oud" },
    { stem: "03-editorial-unexplained-attraction", width: 1600, height: 1600, small: 640, alt: "VAYREN editorial card, “The Unexplained Attraction”: the extrait on a dark shelf with a piece of oud" },
    { stem: "04-lifestyle-leather-library", width: 1600, height: 1600, small: 640, alt: "VAYREN on a dark wooden table, a hand with a watch beside it, peppercorns and oud wood" },
    { stem: "05-everyday-carry-flatlay", width: 1600, height: 1600, small: 640, alt: "VAYREN laid flat among a leather wallet, gloves, cufflinks and a watch" },
    { stem: "06-with-carton", width: 1254, height: 1040, small: 640, alt: "VAYREN beside its carton on a pale shelf" },
  ],
};

/**
 * The product pictures of a fragrance's smaller sizes (2026-11-12): the 10 ml of each extrait, made from the approved 10 ml
 * flacon (slim cylinder, black leather-grain cap, silver collar, clear liquid, `ESSENTIALS | 10ml` label). Files:
 * `public/images/pdp/<slug>-10ml/<stem>-<width>.webp`. The packshot leads, like the 50 ml's. Pictures uploaded to the
 * size's own record in the admin follow these.
 */
function tenMl(slug: FragranceSlug, name: string, notes: string): PdpPhoto[] {
  const dir = `${slug}-10ml`;
  return [
    { dir, stem: "01-packshot", width: 1000, height: 1150, small: 640, alt: `${name} extrait, 10 ml, on a plain studio background` },
    { dir, stem: "02-dark-studio", width: 1600, height: 1600, small: 640, alt: `${name} 10 ml standing on a dark polished surface, lit from behind` },
    { dir, stem: "03-label-detail", width: 1600, height: 1600, small: 640, alt: `Close-up of the ${name} 10 ml label: THE RARESKIN®, ${name}, ESSENTIALS | 10ml` },
    { dir, stem: "04-notes", width: 1600, height: 1600, small: 640, alt: `${name} 10 ml beside its notes: ${notes}` },
  ];
}

export const PDP_SIZE_GALLERY: Partial<Record<FragranceSlug, Record<number, PdpPhoto[]>>> = {
  aurevan: { 10: tenMl("aurevan", "AUREVAN", "citrus, bergamot, white florals, musk, cedar") },
  orvelis: { 10: tenMl("orvelis", "ORVELIS", "spices, amber, woods, vanilla, patchouli") },
  vayren: { 10: tenMl("vayren", "VAYREN", "spices, leather, oud, smoke, amber") },
};

/** The Discovery Set's pictures (the set page): the three 10 ml extraits together. `public/images/pdp/discovery-set/`. */
export const DISCOVERY_SET_GALLERY: PdpPhoto[] = [
  { dir: "discovery-set", stem: "01-trio-packshot", width: 1000, height: 1150, small: 640, alt: "The three 10 ml extraits, AUREVAN, ORVELIS and VAYREN, side by side on a plain studio background" },
  { dir: "discovery-set", stem: "02-trio-dark-studio", width: 1600, height: 1600, small: 640, alt: "The three 10 ml extraits standing on a dark polished surface, lit from behind" },
  { dir: "discovery-set", stem: "03-meet-all-three", width: 1600, height: 1600, small: 640, alt: "Meet all three: AUREVAN fresh and elegant, ORVELIS warm and sophisticated, VAYREN bold and intense, with their notes" },
  { dir: "discovery-set", stem: "04-how-it-works", width: 1600, height: 1600, small: 640, alt: "The Discovery Set in three steps: meet them, choose yours, the set price credited back toward your first 50 ml" },  { dir: "discovery-set", stem: "05-golden-hour-steps", width: 1600, height: 1600, small: 640, alt: "The three 10 ml extraits on stepped travertine blocks in low afternoon sun, a gentle ascent from AUREVAN through ORVELIS to VAYREN" },
];

/**
 * The small transparent picture of a size, for the size chooser (`components/product/pdp-sizes.tsx`): the real bottle, 260 px tall, shown at ~60-76 px.
 * 50 ml: `/images/pdp/<slug>/chip-50.webp`; 10 ml: `/images/pdp/<slug>-10ml/chip-10.webp` (only where that size has pictures). A size without
 * one (the 100 ml) returns null: the chooser draws its dark "Coming soon" card instead. Built by `design-explorations/section-images/build_chips.py`.
 */
export function pdpSizeChip(slug: FragranceSlug, volumeMl: number): { src: string; width: number; height: number } | null {
  if (volumeMl === 50) return { src: `/images/pdp/${slug}/chip-50.webp?v=${PDP_ASSET_VERSION}`, width: 146, height: 260 };
  if (volumeMl === 10 && PDP_SIZE_GALLERY[slug]?.[10]) return { src: `/images/pdp/${slug}-10ml/chip-10.webp?v=${PDP_ASSET_VERSION}`, width: 56, height: 260 };
  return null;
}
