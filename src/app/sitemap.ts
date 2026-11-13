import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { absoluteImage } from "@/lib/seo";
import { DISCOVERY_SET_GALLERY, PDP_GALLERY, pdpPhotoSrc } from "@/config/pdp-gallery";
import { DISCOVERY_SET_SLUG, type FragranceSlug } from "@/lib/catalog";
import { getFragranceSlugs } from "@/server/data/catalog";

/**
 * When the storefront's own content (copy, prices, photographs) last changed. Bump it with the change:
 * Google trusts `lastmod` only while it is honest, so it is not "now" on every request.
 * The policy pages carry no date at all.
 */
const CONTENT_UPDATED = new Date("2026-11-13");

/** The official photographs of a product page, as absolute URLs for the image sitemap. */
const photos = (slug: string, list = PDP_GALLERY[slug as FragranceSlug] ?? []) =>
  list.map((p) => absoluteImage(pdpPhotoSrc(slug, p, "full")));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const secondary = ["/the-idea", "/faq", "/contact"];
  const legal = ["/shipping", "/returns", "/privacy", "/terms"];
  const slugs = await getFragranceSlugs();

  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    extra: Partial<MetadataRoute.Sitemap[number]> = {},
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
    ...extra,
  });

  return [
    // the homepage shows all three packshots, so it offers them to Google Images too
    entry("/", 1, "weekly", {
      lastModified: CONTENT_UPDATED,
      images: slugs.flatMap((s) => photos(s).slice(0, 1)),
    }),
    ...slugs.map((slug) =>
      entry(`/fragrances/${slug}`, 0.9, "weekly", {
        lastModified: CONTENT_UPDATED,
        images: photos(slug),
      }),
    ),
    entry("/discovery-set", 0.8, "monthly", {
      lastModified: CONTENT_UPDATED,
      images: photos(DISCOVERY_SET_SLUG, DISCOVERY_SET_GALLERY),
    }),
    ...secondary.map((p) => entry(p, 0.5, "monthly")),
    ...legal.map((p) => entry(p, 0.3, "yearly")),
  ];
}
