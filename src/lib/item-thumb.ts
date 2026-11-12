import { familySlug, isFragranceSlug } from "@/lib/catalog";

/**
 * The picture of an ordered item — checkout review, order confirmation, account
 * order history, the invoice PDF and the order emails all use this ONE file, so
 * the product looks the same everywhere.
 *
 * It is the official packshot (`01-packshot` of `@/config/pdp-gallery`) cut square
 * and tight around the flacon: `public/images/pdp/<slug>/item-thumb.jpg`, 480 × 480.
 * JPEG on purpose — react-pdf cannot draw WebP and Outlook cannot show it in email,
 * and one raster works on every surface. The Discovery Set has no single bottle, so
 * it returns `null` and callers keep their own treatment.
 *
 * Isomorphic (no server-only imports): safe in client components.
 */
export function itemThumbPath(slug: string): string | null {
  const family = familySlug(slug);
  return isFragranceSlug(family) ? `/images/pdp/${family}/item-thumb.jpg` : null;
}
