import { familySlug, isFragranceSlug } from "@/lib/catalog";

/**
 * The picture of an ordered item — checkout review, order confirmation, account
 * order history, the invoice PDF and the order emails all use this ONE file, so
 * the product looks the same everywhere.
 *
 * It is the official packshot (`01-packshot` of `@/config/pdp-gallery`) cut square
 * and tight around the flacon: `public/images/pdp/<slug>/item-thumb.jpg`, 480 × 480.
 * JPEG on purpose — react-pdf cannot draw WebP and Outlook cannot show it in email,
 * and one raster works on every surface. The Discovery Set (no single bottle) has its own: the three 10 ml bottles side by side.
 *
 * Isomorphic (no server-only imports): safe in client components.
 */
export function itemThumbPath(slug: string): string | null {
  // the Discovery Set: its own picture, the three 10 ml bottles together (`design-explorations/discovery-set/build_set_thumb.py`)
  if (slug === "discovery-set") return DISCOVERY_SET_THUMB;
  const family = familySlug(slug);
  return isFragranceSlug(family) ? `/images/pdp/${family}/item-thumb.jpg` : null;
}

export const DISCOVERY_SET_THUMB = "/images/pdp/discovery-set/item-thumb.jpg";
