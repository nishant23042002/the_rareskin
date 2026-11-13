import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/layout/page-intro";
import { DiscoverySet } from "@/components/home/discovery-set";
import { DiscoverySetGallery } from "@/components/product/discovery-set-gallery";
import { ViewItem } from "@/components/analytics/view-item";
import { itemFromProduct } from "@/lib/analytics";
import { formatINR, DISCOVERY_SET_SLUG } from "@/lib/catalog";
import { DISCOVERY_SET_GALLERY, pdpPhotoSrc } from "@/config/pdp-gallery";
import { SITE, absoluteUrl } from "@/lib/site";
import { absoluteImage, pageMeta, shippingDetailsJsonLd } from "@/lib/seo";
import { getFragrances, getDiscoverySet } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/settings";

export async function generateMetadata(): Promise<Metadata> {
  const set = await getDiscoverySet();
  return pageMeta({
    title: "The Discovery Set",
    description:
      set?.seo.metaDescription ??
      set?.detail ??
      "Three 10 ml extraits, credited back in full toward your first bottle.",
    path: "/discovery-set",
  });
}

export default async function DiscoverySetPage() {
  const [set, fragrances, settings] = await Promise.all([
    getDiscoverySet(),
    getFragrances(),
    getSiteSettings(),
  ]);
  if (!set) notFound();

  // Product schema for the set: its own photographs, the price, and what delivery costs (from Site Settings)
  const url = absoluteUrl("/discovery-set");
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: set.name,
    description: set.detail,
    sku: set.sku,
    brand: { "@type": "Brand", name: SITE.name },
    category: "Fragrance > Extrait de Parfum > Discovery Set",
    image: DISCOVERY_SET_GALLERY.map((p) => absoluteImage(pdpPhotoSrc(DISCOVERY_SET_SLUG, p, "full"))),
    url,
    isRelatedTo: fragrances.map((f) => ({
      "@type": "Product",
      name: `${f.name} Extrait de Parfum`,
      url: absoluteUrl(`/fragrances/${f.slug}`),
    })),
    offers: {
      "@type": "Offer",
      sku: set.sku,
      price: String(set.price),
      priceCurrency: SITE.currency,
      availability: set.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
      priceValidUntil: "2027-03-31",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE.legalName },
      shippingDetails: shippingDetailsJsonLd(
        set.price,
        settings.shipping.freeAbovePaise / 100,
        settings.shipping.flatRatePaise / 100,
      ),
    },
  };

  const steps = [
    {
      n: "01",
      h: "Order the set",
      p: `Three ${set.perVialMl} ml extraits — ${formatINR(
        set.price,
      )}, the full-size formula, not a diluted sample.`,
    },
    {
      n: "02",
      h: "Live with all three",
      p: "A week or two each. Notice which one you reach for without thinking about it.",
    },
    {
      n: "03",
      h: "Buy your 50 ml",
      p: `The ${formatINR(
        set.creditRupees,
      )} comes off in full — your first full bottle is effectively the set for free.`,
    },
  ];

  return (
    <main id="main" data-reveal>
      <ViewItem
        item={itemFromProduct({
          sku: set.sku,
          name: set.name,
          volumeMl: set.perVialMl,
          price: set.price,
          mrp: set.mrp,
          isSet: true,
          meta: `${set.vialCount} × ${set.perVialMl} ml`,
        })}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <PageIntro
        eyebrow="The set"
        crumb={{ name: "Discovery Set", path: "/discovery-set" }}
        title="The Discovery Set"
        lede={`Three ${set.perVialMl} ml extraits, credited back in full toward your first bottle.`}
      />

      <DiscoverySet set={set} fragrances={fragrances} variant="page" />

      <DiscoverySetGallery />

      <Container className="max-w-[980px] py-[clamp(48px,9vw,110px)]">
        <h2 data-rv className="eyebrow mb-[clamp(24px,4vw,40px)]">
          How the credit works
        </h2>
        <ol className="grid gap-9 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} data-rv className="pg-step">
              <p className="serif text-[1.5rem] leading-none text-ink-3">
                {s.n}
              </p>
              <h3 className="mt-2.5 text-[1.05rem]">{s.h}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.65] text-ink-2">
                {s.p}
              </p>
            </li>
          ))}
        </ol>
        <p data-rv className="mt-9 text-[11px] leading-[1.7] tracking-[0.03em] text-ink-3">
          One credit per customer, applied automatically to your first 50 ml
          purchase and not combinable with other offers. The Discovery Set is
          non-refundable once any vial is opened. See{" "}
          <a
            href="/returns"
            className="underline decoration-line-2 underline-offset-2 hover:text-ink"
          >
            Returns
          </a>{" "}
          for full details.
        </p>
      </Container>
    </main>
  );
}
