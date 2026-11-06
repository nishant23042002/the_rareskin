import manifestJson from "../../public/images/assets-manifest.json";

/**
 * Homepage image system — typed access to `public/images/assets-manifest.json`,
 * the single source of truth for every homepage picture: file, pixel size,
 * aspect ratio, `sizes`, focal point, alt text and whether the file is still a
 * tonal placeholder or the final photograph (`status`).
 *
 * To ship a real image, replace the WebP at the same path (same aspect ratio)
 * and flip `status` to "final" in the manifest. Nothing else changes: the
 * components below read size, ratio and alt from here, so layout never shifts.
 */

import {
  CARD_CONCEPT_FALLBACK,
  cardAssetId,
  type CardAssetId,
  type CardConceptId,
  type CardSlug,
} from "@/config/homepage-assets";

export type HomeAssetId =
  | "hero"
  | CardAssetId
  | "extrait-atomizer-craft"
  | "atelier-story"
  | "unboxing-experience"
  | "discovery-set-10ml"
  | "scent-on-skin";

export interface HomeVariant {
  key: string;
  file: string;
  width: number;
  height: number;
  aspect: string;
  /** media query the variant is meant for (art direction), if any */
  media?: string;
}

export interface HomeAsset {
  id: HomeAssetId;
  status: "placeholder" | "final";
  variants: HomeVariant[];
  sizes: string;
  objectPosition: Record<string, string>;
  /** describes the FINAL photograph; never exposed while the file is a placeholder */
  alt: string;
  /**
   * tile pictures only: the colour of the chevron and dots drawn over the picture
   * ("light" = the picture is dark there). Absent = use the fragrance's own `onGround`.
   */
  overlayTone?: "light" | "dark";
  /** tile pictures only: the colour of the two dots at the bottom when it must differ from the chevron's (a picture that is dark at the bottom and bright at the right edge, or the reverse); defaults to `overlayTone` */
  dotsTone?: "light" | "dark";
}

const BASE = (manifestJson as { basePath: string }).basePath;
const VERSION = (manifestJson as { assetVersion: number }).assetVersion;
const ASSETS = manifestJson.assets as unknown as HomeAsset[];

export function getHomeAsset(id: HomeAssetId): HomeAsset {
  const a = ASSETS.find((x) => x.id === id);
  // the ids are a closed union and `scripts/home-images.ts check` verifies the
  // manifest has all of them, so a miss is a build-time mistake, not a runtime case
  if (!a) throw new Error(`home image "${id}" is missing from assets-manifest.json`);
  return a;
}

/** like getHomeAsset, but undefined instead of an error: an alternative direction may exist for some fragrances only */
export function findHomeAsset(id: HomeAssetId): HomeAsset | undefined {
  return ASSETS.find((x) => x.id === id);
}

export function getVariant(asset: HomeAsset, key = "default"): HomeVariant {
  const v = asset.variants.find((x) => x.key === key) ?? asset.variants[0];
  if (!v) throw new Error(`home image "${asset.id}" has no variant "${key}"`);
  return v;
}

/**
 * public URL of a manifest file, with the manifest's `assetVersion` as a cache
 * buster: Next's image optimizer caches by URL and cannot be invalidated, so a
 * replaced file must get a new URL (bump `assetVersion` in the manifest;
 * next.config.ts allows exactly this query string in `images.localPatterns`).
 */
export function homeImageSrc(file: string): string {
  return `${BASE}/${file}?v=${VERSION}`;
}

export function isFinal(asset: HomeAsset): boolean {
  return asset.status === "final";
}

/**
 * The picture a product tile shows for the chosen art direction (`@/config/homepage-assets`).
 * A direction whose file for this fragrance is still a placeholder falls back to the
 * current pedestal picture, and when that is not final either, to null (the tile then
 * draws the catalogue packshot / illustrated flacon): a tonal plate is never shown.
 */
export function resolveCardAsset(slug: CardSlug, concept: CardConceptId): HomeAsset | null {
  // the chosen direction, then the direction it falls back to (an alternative plate that
  // exists for some fragrances only), then the current pedestal picture
  const chain: CardConceptId[] = [concept];
  const fallback = CARD_CONCEPT_FALLBACK[concept];
  if (fallback) chain.push(fallback);
  if (!chain.includes("current")) chain.push("current");
  for (const c of chain) {
    const a = findHomeAsset(cardAssetId(c, slug));
    if (a && isFinal(a)) return a;
  }
  return null;
}

/** alt text: the real description once the photograph is final, empty (decorative) while it is a placeholder */
export function homeAlt(asset: HomeAsset): string {
  return isFinal(asset) ? asset.alt : "";
}
