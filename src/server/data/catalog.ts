import "server-only";

import { unstable_cache } from "next/cache";

import { dbConnect } from "@/server/db";
import { Product, type ProductDoc } from "@/server/models";
import { toRupees } from "@/lib/money";
import { pdpCover } from "@/lib/pdp-images";
import {
  DISCOVERY_SET_SLUG,
  cloudinaryVariant,
  isFragranceSlug,
  type BagSuggestion,
  type FragranceVariant,
  type CatalogNavItem,
  type DiscoverySetInfo,
  type Fragrance,
  type FragranceImages,
  type StorefrontCatalog,
} from "@/lib/catalog";

/**
 * Catalogue Data Access Layer.
 *
 * The only place the storefront reads products from. Every query is wrapped in
 * `unstable_cache` with tags so the pages render from a static cache and an
 * admin edit (or `pnpm revalidate`) refreshes them within seconds — no deploy.
 *
 * Tags:
 *   catalog            every catalogue read
 *   product:<slug>     one product
 */

const CATALOG_TAG = "catalog";
const productTag = (slug: string) => `product:${slug}`;
// Long TTL — content changes come through on-demand revalidation, not the clock.
const REVALIDATE_SECONDS = 60 * 60 * 24;

/** A stored media URL, but only if it's a real (Cloudinary) URL — a leftover
 *  local placeholder path resolves to null so the vector treatment shows. */
function realPackshot(url: string | undefined): string | null {
  return url && /^https?:\/\//.test(url) ? url : null;
}

function imagesFor(doc: ProductDoc): FragranceImages {
  return {
    hero: realPackshot(doc.media?.hero?.url),
    heroPortrait: realPackshot(doc.media?.heroPortrait?.url),
    flat: realPackshot(doc.media?.flat?.url),
    box: realPackshot(doc.media?.box?.url),
  };
}

function isBuyable(doc: ProductDoc): boolean {
  if (doc.status !== "active") return false;
  // a size that is shown but not on sale yet (launch.soon) can never be bought
  if (doc.launch?.soon) return false;
  const inv = doc.inventory;
  return !inv.trackInventory || inv.allowBackorder || inv.stock > 0;
}

function toVariant(doc: ProductDoc, isMain: boolean): FragranceVariant {
  const soon = Boolean(doc.launch?.soon);
  return {
    slug: doc.slug,
    sku: doc.inventory.sku,
    volumeMl: doc.volumeMl,
    price: toRupees(doc.pricing.price),
    mrp: toRupees(doc.pricing.mrp),
    state: soon ? "soon" : isBuyable(doc) ? "available" : "soldout",
    soonLabel: doc.launch?.label ?? "",
    // only real (Cloudinary) pictures: a leftover local placeholder path is never shown
    gallery: (doc.media?.gallery ?? [])
      .filter((m) => /^https?:\/\//.test(m.url))
      .map((m) => ({ url: m.url, alt: m.alt ?? "" })),
    isMain,
  };
}

/** the fragrance's own record plus its size records, smallest first */
function variantsOf(doc: ProductDoc, sizes: ProductDoc[]): FragranceVariant[] {
  return [toVariant(doc, true), ...sizes.map((d) => toVariant(d, false))].sort(
    (a, b) => a.volumeMl - b.volumeMl,
  );
}

function toFragrance(doc: ProductDoc, sizes: ProductDoc[] = []): Fragrance {
  return {
    id: String(doc._id),
    slug: isFragranceSlug(doc.slug) ? doc.slug : "aurevan",
    sku: doc.inventory.sku,
    name: doc.name,
    pronunciation: doc.pronunciation ?? "",
    title: doc.title,
    poem: doc.poem,
    impression: doc.impression,
    mood: doc.mood,
    notes: doc.notes,
    notesByPhase: {
      arrive: doc.notesByPhase.arrive,
      linger: doc.notesByPhase.linger,
      stay: doc.notesByPhase.stay,
    },
    longevity: doc.longevity,
    sillage: doc.sillage,
    wearOccasion: doc.wearOccasion,
    juice: doc.colour.juiceHex,
    accent: doc.colour.accent,
    ground: doc.colour.ground,
    onGround: doc.colour.onGround,
    onGroundInverse: doc.colour.onGroundInverse,
    price: toRupees(doc.pricing.price),
    mrp: toRupees(doc.pricing.mrp),
    volumeMl: doc.volumeMl,
    images: imagesFor(doc),
    stock: doc.inventory.stock,
    available: isBuyable(doc),
    rating: {
      average: doc.ratings?.average ?? 0,
      count: doc.ratings?.count ?? 0,
    },
    seo: {
      metaTitle: doc.seo?.metaTitle ?? null,
      metaDescription: doc.seo?.metaDescription ?? null,
    },
    variants: variantsOf(doc, sizes),
  };
}

/** the active size records of these fragrances, keyed by fragrance slug */
async function sizesBySlug(slugs: string[]): Promise<Map<string, ProductDoc[]>> {
  const map = new Map<string, ProductDoc[]>();
  if (slugs.length === 0) return map;
  const docs = await Product.find({
    kind: "fragrance",
    status: "active",
    variantOf: { $in: slugs },
  }).lean<ProductDoc[]>();
  for (const d of docs) {
    const key = d.variantOf as string;
    map.set(key, [...(map.get(key) ?? []), d]);
  }
  return map;
}

function toDiscoverySet(doc: ProductDoc): DiscoverySetInfo {
  const components = (doc.components ?? [])
    .filter((c) => isFragranceSlug(c.productSlug))
    .map((c) => ({
      slug: c.productSlug as DiscoverySetInfo["components"][number]["slug"],
      volumeMl: c.volumeMl,
    }));
  return {
    id: String(doc._id),
    slug: DISCOVERY_SET_SLUG,
    sku: doc.inventory.sku,
    name: doc.name,
    headline: doc.title,
    detail: doc.poem,
    price: toRupees(doc.pricing.price),
    mrp: toRupees(doc.pricing.mrp),
    perVialMl: components[0]?.volumeMl ?? 10,
    vialCount: components.length || 3,
    creditRupees: doc.credit ? toRupees(doc.credit.amount) : toRupees(doc.pricing.price),
    components,
    image:
      realPackshot(doc.media?.flat?.url) ?? realPackshot(doc.media?.hero?.url),
    available: doc.status === "active",
    seo: {
      metaTitle: doc.seo?.metaTitle ?? null,
      metaDescription: doc.seo?.metaDescription ?? null,
    },
  };
}

// ── Queries (cached) ─────────────────────────────────────────────────────

export const getFragrances = unstable_cache(
  async (): Promise<Fragrance[]> => {
    await dbConnect();
    // the fragrances themselves: size records (variantOf) are not listed on their own
    const docs = await Product.find({ kind: "fragrance", status: "active", variantOf: null })
      .sort({ order: 1 })
      .lean<ProductDoc[]>();
    const sizes = await sizesBySlug(docs.map((d) => d.slug));
    return docs.map((d) => toFragrance(d, sizes.get(d.slug) ?? []));
  },
  ["catalog:fragrances"],
  { tags: [CATALOG_TAG], revalidate: REVALIDATE_SECONDS },
);

export function getFragranceBySlug(slug: string): Promise<Fragrance | null> {
  return unstable_cache(
    async (): Promise<Fragrance | null> => {
      if (!isFragranceSlug(slug)) return null;
      await dbConnect();
      const doc = await Product.findOne({
        slug,
        kind: "fragrance",
        status: "active",
        variantOf: null,
      }).lean<ProductDoc | null>();
      if (!doc) return null;
      const sizes = await sizesBySlug([doc.slug]);
      return toFragrance(doc, sizes.get(doc.slug) ?? []);
    },
    ["catalog:fragrance", slug],
    { tags: [CATALOG_TAG, productTag(slug)], revalidate: REVALIDATE_SECONDS },
  )();
}

export const getDiscoverySet = unstable_cache(
  async (): Promise<DiscoverySetInfo | null> => {
    await dbConnect();
    const doc = await Product.findOne({
      slug: DISCOVERY_SET_SLUG,
      kind: "set",
      status: "active",
    }).lean<ProductDoc | null>();
    return doc ? toDiscoverySet(doc) : null;
  },
  ["catalog:discovery-set"],
  {
    tags: [CATALOG_TAG, productTag(DISCOVERY_SET_SLUG)],
    revalidate: REVALIDATE_SECONDS,
  },
);

export async function getStorefrontCatalog(): Promise<StorefrontCatalog> {
  const [fragrances, discoverySet] = await Promise.all([
    getFragrances(),
    getDiscoverySet(),
  ]);
  return { fragrances, discoverySet };
}

export async function getCatalogNav(): Promise<CatalogNavItem[]> {
  const fragrances = await getFragrances();
  return fragrances.map((f) => ({
    slug: f.slug,
    name: f.name,
    accent: f.accent,
    title: f.title,
    mood: f.mood,
    ground: f.ground,
    onGround: f.onGround,
    price: f.price,
    mrp: f.mrp,
    volumeMl: f.volumeMl,
  }));
}

/**
 * The whole range as one-tap cross-sell cards for the bag drawer. The drawer
 * filters out whatever is already in the bag, so a shopper always sees a way to
 * complete the set. `f.images.*` is already real-or-null (see `imagesFor`).
 */
export async function getBagSuggestions(): Promise<BagSuggestion[]> {
  const { fragrances, discoverySet } = await getStorefrontCatalog();

  const out: BagSuggestion[] = fragrances
    .filter((f) => f.available)
    .map((f) => ({
      sku: f.sku,
      slug: f.slug,
      name: f.name,
      fragrance: f.slug,
      // the PDP's first picture (lib/pdp-images), so the bag, the sticky bar and
      // the product page always agree
      image: pdpCover(f.slug, f.images, f.name)?.thumb ?? null,
      meta: `Extrait · ${f.volumeMl} ml`,
      price: f.price,
      mrp: f.mrp,
      href: `/fragrances/${f.slug}`,
    }));

  if (discoverySet?.available) {
    out.push({
      sku: discoverySet.sku,
      slug: discoverySet.slug,
      name: discoverySet.name,
      // the set's own page opens with its catalogue photograph when it has one;
      // without it the bag draws the three flacons
      image: cloudinaryVariant(discoverySet.image, { w: 400 }),
      meta: `${discoverySet.vialCount} × ${discoverySet.perVialMl} ml`,
      price: discoverySet.price,
      mrp: discoverySet.mrp,
      href: "/discovery-set",
    });
  }

  return out;
}

/** Related products for a PDP — the other fragrances, in catalogue order. */
export async function getRelatedFragrances(
  slug: string,
): Promise<Fragrance[]> {
  const fragrances = await getFragrances();
  return fragrances.filter((f) => f.slug !== slug);
}

/** Active slugs for `generateStaticParams`. */
export async function getFragranceSlugs(): Promise<string[]> {
  const fragrances = await getFragrances();
  return fragrances.map((f) => f.slug);
}
