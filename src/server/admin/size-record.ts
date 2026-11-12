/**
 * The product record of one size (10 ml, 100 ml …) of a fragrance.
 *
 * A size is a product of its own (own SKU, price, stock, status, picture gallery) linked to its fragrance by
 * `variantOf`, so the bag, checkout, stock ledger and orders need nothing special. It is built from the
 * fragrance's own record (copy, notes, colours, HSN) with an empty gallery and no stock.
 *
 * Pure: shared by the admin "Add size" action and by `scripts/variants.ts`, and free of Next.js imports so the
 * script can use it too.
 */

export interface SizeInput {
  volumeMl: number;
  /** paise */
  price: number;
  /** paise */
  mrp: number;
  /** listed on the page, not on sale yet */
  soon: boolean;
  /** what the chip / button says while `soon` ("Available soon", "Launching soon") */
  soonLabel: string;
}

/** Fields that belong to a record, not to the product, so a size never inherits them. */
const NOT_CARRIED = new Set([
  "_id",
  "__v",
  "id",
  "slug",
  "variantOf",
  "launch",
  "status",
  "inventory",
  "media",
  "ratings",
  "seo",
  "pricing",
  "volumeMl",
  "order",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
]);

export function sizeSlug(parentSlug: string, volumeMl: number): string {
  return `${parentSlug}-${volumeMl}ml`;
}

/** RRS-EXT-AUREVAN-50 -> RRS-EXT-AUREVAN-10 */
export function sizeSku(parentSku: string, volumeMl: number): string {
  return `${parentSku.replace(/-\d+$/, "")}-${volumeMl}`;
}

export function sizeRecord(
  parent: Record<string, unknown> & {
    slug: string;
    order: number;
    inventory: { sku: string; lowStockThreshold: number };
  },
  input: SizeInput,
): Record<string, unknown> {
  const carried: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parent)) {
    if (!NOT_CARRIED.has(k)) carried[k] = v;
  }
  return {
    ...carried,
    slug: sizeSlug(parent.slug, input.volumeMl),
    variantOf: parent.slug,
    launch: { soon: input.soon, label: input.soonLabel },
    volumeMl: input.volumeMl,
    pricing: { price: input.price, mrp: input.mrp, currency: "INR" },
    // visible on the page (as "soon", when it is); it does not sell until the admin says so and adds stock
    status: "active",
    inventory: {
      sku: sizeSku(parent.inventory.sku, input.volumeMl),
      stock: 0,
      lowStockThreshold: parent.inventory.lowStockThreshold,
      trackInventory: true,
      allowBackorder: false,
    },
    media: { gallery: [] },
    seo: {},
    ratings: { average: 0, count: 0 },
    order: parent.order,
  };
}
