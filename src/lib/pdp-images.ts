import { PDP_GALLERY, pdpPhotoSrc } from "@/config/pdp-gallery";
import {
  cloudinaryVariant,
  type FragranceImages,
  type FragranceSlug,
} from "@/lib/catalog";

/**
 * The product pictures of a PDP, in the order the gallery shows them, and the
 * ONE place that order is decided: the official photographs first
 * (`@/config/pdp-gallery`, six per extrait, the packshot leading), then any
 * photograph uploaded in the admin catalogue (`flat`, `hero`, `box`).
 *
 * `PdpGallery` renders `pdpSlides()`; every other surface that shows "the
 * product's picture" (the You-might-also-like cards, the bag drawer, the sticky
 * bag bar, the campaign note) renders `pdpCover()`, the first of those slides, so
 * they can never drift from what the product page opens with.
 *
 * Isomorphic: no server-only imports, safe in client components.
 */
interface PdpSlide {
  key: string;
  /** the large file (the gallery's main frame) */
  full: string;
  /** the small file: a 640 px WebP for the official photographs, a 200 px Cloudinary variant for uploads */
  thumb: string;
  /** the gallery strip's file (shown ~50 px square): 160 px WebP for the official photographs, else `thumb` */
  tiny: string;
  /** `thumb` and `full` as a responsive set (official photographs only) */
  srcSet?: string;
  alt: string;
  /** natural size of `thumb`, when it is known (official photographs only) */
  thumbWidth?: number;
  thumbHeight?: number;
}

export function pdpSlides(
  slug: FragranceSlug,
  images: FragranceImages,
  name: string,
): PdpSlide[] {
  const official = (PDP_GALLERY[slug] ?? []).map(
    (p, i): PdpSlide => ({
      key: `official-${i}`,
      full: pdpPhotoSrc(slug, p, "full"),
      thumb: pdpPhotoSrc(slug, p, "small"),
      tiny: pdpPhotoSrc(slug, p, "tiny"),
      srcSet: `${pdpPhotoSrc(slug, p, "small")} ${p.small}w, ${pdpPhotoSrc(slug, p, "full")} ${p.width}w`,
      alt: p.alt,
      thumbWidth: p.small,
      thumbHeight: Math.round((p.small * p.height) / p.width),
    }),
  );

  const uploaded = (["flat", "hero", "box"] as const)
    .map((k) => images[k])
    .filter((url): url is string => Boolean(url))
    .map((url, i): PdpSlide => {
      const thumb = cloudinaryVariant(url, { w: 200 }) ?? url;
      return {
        key: `photo-${i}`,
        full: cloudinaryVariant(url, { w: 1000 }) ?? url,
        thumb,
        tiny: thumb,
        alt: name,
      };
    });

  return [...official, ...uploaded];
}

/** The picture the PDP opens with, or null when the product has none (callers then draw the vector flacon). */
export function pdpCover(
  slug: FragranceSlug,
  images: FragranceImages,
  name: string,
): PdpSlide | null {
  return pdpSlides(slug, images, name)[0] ?? null;
}
