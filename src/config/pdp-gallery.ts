import type { FragranceSlug } from "@/lib/catalog";

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
}

export function pdpPhotoSrc(slug: FragranceSlug, p: PdpPhoto, size: "full" | "small"): string {
  return `/images/pdp/${slug}/${p.stem}-${size === "full" ? p.width : p.small}.webp`;
}

export const PDP_GALLERY: Record<FragranceSlug, PdpPhoto[]> = {
  aurevan: [
    { stem: "01-packshot", width: 1000, height: 1150, small: 640, alt: "AURÉVAN extrait, 50 ml, on a plain studio background" },
    { stem: "02-marble-bergamot-gardenia", width: 1600, height: 1600, small: 640, alt: "AURÉVAN on a white marble block beside a halved bergamot and a white gardenia" },
    { stem: "03-editorial-quiet-confidence", width: 1600, height: 1600, small: 640, alt: "AURÉVAN editorial card, “The Quiet Confidence”: the extrait on a marble shelf with a lime half and a gardenia" },
    { stem: "04-lifestyle-marble-table", width: 1600, height: 1600, small: 640, alt: "AURÉVAN on a round marble table, a hand with a shirt cuff resting beside it, bergamot and gardenia behind" },
    { stem: "05-everyday-carry-flatlay", width: 1600, height: 1600, small: 640, alt: "AURÉVAN laid flat on a wooden board with a watch, glasses, a leather wallet, a shirt and a bergamot" },
    { stem: "06-with-carton", width: 1254, height: 1085, small: 640, alt: "AURÉVAN beside its carton on a marble ledge, with gardenia and raspberries" },
  ],
  orvelis: [
    { stem: "01-packshot", width: 1000, height: 1150, small: 640, alt: "ORVÉLIS extrait, 50 ml, on a plain studio background" },
    { stem: "02-amber-vanilla-spice", width: 1600, height: 1600, small: 640, alt: "ORVÉLIS on a travertine ledge in low sun with cinnamon, star anise, vanilla and amber resin" },
    { stem: "03-editorial-lasting-impression", width: 1600, height: 1600, small: 640, alt: "ORVÉLIS editorial card, “The Lasting Impression”: the extrait on a marble shelf with star anise" },
    { stem: "04-lifestyle-lamp-table", width: 1600, height: 1600, small: 640, alt: "ORVÉLIS on a marble desk under a brass lamp, a hand with a watch beside it, cinnamon and star anise" },
    { stem: "05-everyday-carry-flatlay", width: 1600, height: 1600, small: 640, alt: "ORVÉLIS laid flat on terracotta fabric with a leather watch, a belt, walnuts and cinnamon" },
    { stem: "06-with-carton", width: 1254, height: 1150, small: 640, alt: "ORVÉLIS beside its carton on a wooden shelf with a blood orange" },
  ],
  vayren: [
    { stem: "01-packshot", width: 1000, height: 1150, small: 640, alt: "VAYRÉN extrait, 50 ml, on a plain studio background" },
    { stem: "02-leather-oud-smoke", width: 1600, height: 1600, small: 640, alt: "VAYRÉN on a black stone block with a thread of smoke, leather and oud" },
    { stem: "03-editorial-unexplained-attraction", width: 1600, height: 1600, small: 640, alt: "VAYRÉN editorial card, “The Unexplained Attraction”: the extrait on a dark shelf with a piece of oud" },
    { stem: "04-lifestyle-leather-library", width: 1600, height: 1600, small: 640, alt: "VAYRÉN on a dark wooden table, a hand with a watch beside it, peppercorns and oud wood" },
    { stem: "05-everyday-carry-flatlay", width: 1600, height: 1600, small: 640, alt: "VAYRÉN laid flat among a leather wallet, gloves, cufflinks and a watch" },
    { stem: "06-with-carton", width: 1254, height: 1040, small: 640, alt: "VAYRÉN beside its carton on a pale shelf" },
  ],
};
