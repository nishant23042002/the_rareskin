import "./_bootstrap";

import { dbConnect, dbDisconnect, Product, recordAudit } from "@/server/db";
import { getEnv } from "@/server/env";
import { toPaise } from "@/lib/money";
import { sizeRecord, sizeSlug, type SizeInput } from "@/server/admin/size-record";

/**
 * Creates the 10 ml and 100 ml size records of the three extraits (idempotent: a size that exists is left alone).
 *
 *   pnpm variants            create what is missing
 *   pnpm variants --list     show every size and its state
 *
 * 50 ml is the fragrance's own record and is on sale. The other two are listed on the product page but not
 * sellable yet:
 *
 *   10 ml   ₹399, "Available soon"     — switch it on in /admin/catalogue (open the 10 ml size → untick "Not on sale
 *                                         yet", add stock, upload its pictures)
 *   100 ml  price announced at launch, "Launching soon"
 *
 * Afterwards run `pnpm catalog revalidate` (or save anything in the admin) so the storefront shows them.
 */

const FRAGRANCES = ["aurevan", "orvelis", "vayren"] as const;

const SIZES: SizeInput[] = [
  { volumeMl: 10, price: toPaise(399), mrp: toPaise(399), soon: true, soonLabel: "Available soon" },
  // the 100 ml price is not announced: 0 reads as "price at launch" on the page
  { volumeMl: 100, price: 0, mrp: 0, soon: true, soonLabel: "Launching soon" },
];

async function main() {
  const env = getEnv();
  await dbConnect();
  console.log(`sizes in ${env.MONGODB_DB}`);

  if (process.argv.includes("--list")) {
    const docs = await Product.find({ kind: "fragrance" })
      .sort({ order: 1, volumeMl: 1 })
      .select("slug variantOf volumeMl status launch pricing inventory")
      .lean();
    for (const d of docs) {
      console.log(
        `${d.slug.padEnd(16)} ${String(d.volumeMl).padStart(3)} ml  ${d.status.padEnd(8)} ` +
          `${d.launch?.soon ? `soon (${d.launch.label || "—"})` : "on sale"}`.padEnd(30) +
          `₹${d.pricing.price / 100}  stock=${d.inventory.stock}  ${d.inventory.sku}`,
      );
    }
    await dbDisconnect();
    return;
  }

  let created = 0;
  for (const slug of FRAGRANCES) {
    const parent = await Product.findOne({ slug, variantOf: null }).lean();
    if (!parent) {
      console.log(`  ! ${slug} not found — run pnpm db:seed first`);
      continue;
    }
    for (const size of SIZES) {
      const target = sizeSlug(slug, size.volumeMl);
      if (await Product.exists({ slug: target })) {
        console.log(`  = ${target} exists, left as-is`);
        continue;
      }
      const doc = await Product.create(
        sizeRecord(parent as unknown as Parameters<typeof sizeRecord>[0], size),
      );
      created += 1;
      console.log(`  + ${doc.slug} (${doc.inventory.sku}) — ${size.soonLabel}`);
    }
  }

  if (created > 0) {
    await recordAudit({
      actorId: null,
      actorRole: "system",
      action: "product.add_size",
      targetType: "System",
      targetId: null,
      after: { created },
      ip: null,
      userAgent: null,
      note: "scripts/variants.ts",
    });
  }

  console.log(`\ndone — ${created} created. Now: pnpm catalog revalidate`);
  await dbDisconnect();
}

main().catch(async (err) => {
  console.error("\nvariants failed\n", err);
  await dbDisconnect().catch(() => {});
  process.exitCode = 1;
});
