import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Flacon } from "@/components/ui/flacon";
import { Icon, type IconName } from "@/components/ui/icon";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { PdpGallery } from "@/components/product/pdp-gallery";
import { PdpBuyBox } from "@/components/product/pdp-buybox";
import { PdpBack } from "@/components/product/pdp-back";
import { PdpSizeLine, PdpVariantsProvider } from "@/components/product/pdp-variants";
import { PdpScent } from "@/components/product/pdp-scent";
import { PdpStickyBar } from "@/components/product/pdp-sticky-bar";
import { Accordion } from "@/components/ui/accordion";
import { Stars } from "@/components/ui/stars";
import { PdpReviews } from "@/components/product/pdp-reviews";
import { FAQ_GROUPS } from "@/lib/faq";
import { FRAGRANCE_PALETTE, formatINR, type Fragrance, type FragranceVariant } from "@/lib/catalog";
import { pdpCover } from "@/lib/pdp-images";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd } from "@/lib/seo";
import {
  getFragranceBySlug,
  getFragranceSlugs,
  getRelatedFragrances,
  getStorefrontCatalog,
} from "@/server/data/catalog";
import { getProductReviews } from "@/server/data/reviews";
import { getSiteSettings } from "@/server/data/settings";

// A newly-activated product renders on first request; unknown slugs 404.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getFragranceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/fragrances/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFragranceBySlug(slug);
  if (!f) return {};
  const title = f.seo.metaTitle ?? `${f.name} — ${f.title}`;
  const description =
    f.seo.metaDescription ?? `${f.name} Extrait de Parfum. ${f.poem}`;
  return {
    title,
    description,
    alternates: { canonical: `/fragrances/${slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/fragrances/${slug}`),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** An answer from the FAQ, so the page and /faq say the same thing in the same words. */
const faqAnswer = (q: string): string | undefined =>
  FAQ_GROUPS.flatMap((g) => g.items).find((i) => i.q === q)?.a;

export default async function FragrancePage({
  params,
  searchParams,
}: PageProps<"/fragrances/[slug]">) {
  const { slug } = await params;
  const f = await getFragranceBySlug(slug);
  if (!f) notFound();

  // `?size=10` opens on that size (a shared link, the bag's "view" link); anything else opens on the fragrance's own
  const asked = Number((await searchParams).size);
  const initialMl = f.variants.find((v) => v.volumeMl === asked)?.volumeMl ?? f.volumeMl;

  const [related, reviews, settings, catalog] = await Promise.all([
    getRelatedFragrances(slug),
    getProductReviews(slug),
    getSiteSettings(),
    getStorefrontCatalog(),
  ]);
  const reviewsEnabled = settings.flags.reviewsEnabled;

  // Delivery and payment facts come from the admin settings, so the page can never promise
  // something the checkout does not do.
  const freeAbove = settings.shipping.freeAbovePaise / 100;
  const flatRate = settings.shipping.flatRatePaise / 100;
  const codOn = settings.cod.enabled;
  const deliveryTitle =
    freeAbove > 0 ? `Free delivery above ${formatINR(freeAbove)}` : "Free delivery on every order";
  const deliverySub = freeAbove > 0 && flatRate > 0 ? `${formatINR(flatRate)} below that` : "Across India";
  const trust: { icon: IconName; title: string; sub: string }[] = [
    { icon: "truck", title: deliveryTitle, sub: deliverySub },
    { icon: "clock", title: "Ships in 24–48 hrs", sub: "Packed by hand in Roha" },
    ...(codOn ? [{ icon: "banknote" as const, title: "Cash on delivery", sub: "Pay when it arrives" }] : []),
    { icon: "returns", title: "7-day returns", sub: "For unopened bottles" },
  ];

  const set = settings.flags.discoverySetEnabled ? catalog.discoverySet : null;
  const cover = pdpCover(f.slug, f.images, f.name);

  const details = [
    {
      q: "How to wear",
      a: "Two or three sprays to pulse points, from about 15 cm. Don’t rub — extrait sits close, so let it settle rather than reapplying.",
    },
    { q: "How long does it last?", a: faqAnswer("How long does the fragrance last?") },
    { q: "Is it for men or women?", a: faqAnswer("Are the fragrances for men or women?") },
    {
      q: "What’s in the box",
      a: "One Extrait de Parfum, in the size you choose, in the THE RARESKIN flacon, inside a recyclable outer carton with a short card on how to wear it.",
    },
    {
      q: "Shipping & returns",
      a: `${
        freeAbove > 0
          ? `Delivery is free above ${formatINR(freeAbove)}${flatRate > 0 ? ` and ${formatINR(flatRate)} below that` : ""}`
          : "Delivery is free across India"
      }, dispatched within 24–48 hours${codOn ? ", and cash on delivery is available" : ""}. Unopened bottles can be returned within 7 days; opened bottles only if faulty or damaged. Full detail on the Shipping and Returns pages.`,
    },
  ].filter((d): d is { q: string; a: string } => typeof d.a === "string");

  const url = absoluteUrl(`/fragrances/${slug}`);
  const availability = f.available
    ? f.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/PreOrder"
    : "https://schema.org/OutOfStock";
  // one offer per size that can be bought or is sold out; a size that is only announced is not an offer yet
  const offerOf = (v: FragranceVariant) => ({
    "@type": "Offer",
    sku: v.sku,
    price: String(v.price),
    priceCurrency: SITE.currency,
    availability: v.isMain
      ? availability
      : v.state === "available"
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    url: v.isMain ? url : `${url}?size=${v.volumeMl}`,
    priceValidUntil: "2027-03-31",
    seller: { "@type": "Organization", name: SITE.legalName },
  });
  const offers = f.variants
    .filter((v) => v.isMain || (v.state !== "soon" && v.price > 0))
    .map(offerOf);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${f.name} Extrait de Parfum`,
    description: `${f.name} — ${f.title}. ${f.poem}`,
    sku: slug,
    brand: { "@type": "Brand", name: SITE.name, logo: absoluteUrl("/icon") },
    category: "Fragrance > Extrait de Parfum",
    image: `${url}/opengraph-image`,
    url,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Concentration", value: "Extrait de Parfum" },
      { "@type": "PropertyValue", name: "Volume", value: `${f.volumeMl} ml` },
      { "@type": "PropertyValue", name: "Notes", value: f.notes.join(", ") },
    ],
    offers: offers.length === 1 ? offers[0] : offers,
    ...(reviewsEnabled && reviews.summary.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviews.summary.average.toFixed(1),
            reviewCount: String(reviews.summary.count),
            bestRating: "5",
            worstRating: "1",
          },
          review: reviews.items.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.authorName },
            datePublished: r.publishedAt.slice(0, 10),
            name: r.title,
            reviewBody: r.body,
            ...(r.photos.length > 0
              ? { image: r.photos.map((p) => p.url) }
              : {}),
            reviewRating: {
              "@type": "Rating",
              ratingValue: String(r.rating),
              bestRating: "5",
              worstRating: "1",
            },
          })),
        }
      : {}),
  };

  const breadcrumbJson = breadcrumbJsonLd([
    { name: "Fragrances", path: "/#shop" },
    { name: f.name, path: `/fragrances/${slug}` },
  ]);

  return (
    <main
      id="main"
      className="pt-[calc(var(--announce-h)+var(--header-h)+clamp(20px,3vw,34px))]"
      style={{ "--frag": f.accent } as CSSProperties}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }}
      />

      <PdpVariantsProvider variants={f.variants} initialMl={initialMl}>
      <Container className="max-w-[1280px]">
        <div className="flex items-center gap-3">
          <PdpBack />
          <nav
            aria-label="Breadcrumb"
            className="text-[11px] tracking-[0.06em] text-ink-3 uppercase"
          >
            <Link href="/" className="transition-colors hover:text-ink">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/#collection" className="transition-colors hover:text-ink">
              Fragrances
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink-2">{f.name}</span>
          </nav>
        </div>

        <div className="mt-[clamp(20px,3vw,34px)] grid gap-[clamp(28px,4vw,64px)] pb-[clamp(48px,8vw,96px)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:items-start">
          <PdpGallery slug={f.slug} name={f.name} images={f.images} />

          <div>
            <p className="text-[10.5px] tracking-[0.24em] text-ink-3 uppercase">
              <PdpSizeLine prefix="Extrait de Parfum · " />
            </p>
            <h1 className="mt-3 text-[clamp(2.1rem,4.6vw,3.1rem)] leading-[1.04] font-light tracking-[0.1em]">
              {f.name}
            </h1>
            <p className="mt-2 text-[11.5px] tracking-[0.04em] text-ink-3">
              {f.pronunciation}
            </p>
            {reviewsEnabled && f.rating.count > 0 && (
              <a
                href="#reviews"
                className="mt-3 inline-flex items-center gap-2 text-[11px] text-ink-3 hover:text-ink"
              >
                <Stars value={f.rating.average} starClassName="size-3.5" />
                <span className="tabular-nums">
                  {f.rating.average.toFixed(1)} · {f.rating.count} review
                  {f.rating.count === 1 ? "" : "s"}
                </span>
              </a>
            )}
            <p className="mt-5 inline-flex items-center gap-2.5 text-[11px] tracking-[0.18em] text-ink-2 uppercase">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: f.accent }}
              />
              {f.title}
            </p>
            <p className="serif-italic mt-3 max-w-[42ch] text-[1.15rem] leading-[1.55] text-ink-2">
              {f.poem}
            </p>

            {/* buy box — the page's conversion focus: the size, its price, one button, four reassurances */}
            <PdpBuyBox name={f.name} slug={f.slug} juice={f.juice}>
              <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-line pt-5">
                {trust.map((t) => (
                  <li key={t.title} className="flex items-start gap-2.5">
                    <Icon name={t.icon} className="mt-px size-[17px] shrink-0 text-ink-2" />
                    <span className="min-w-0">
                      <b className="block text-[11.5px] leading-snug font-normal text-ink">
                        {t.title}
                      </b>
                      <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-3">
                        {t.sub}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </PdpBuyBox>

            {/* the soft alternative for someone who is not ready for 50 ml */}
            {set && (
              <Link
                href="/discovery-set"
                className="group mt-3 flex items-center gap-3.5 rounded-[3px] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-ink"
              >
                <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                  {catalog.fragrances.map((x) => (
                    <i
                      key={x.slug}
                      className="size-4 rounded-full ring-2 ring-surface"
                      style={{ background: FRAGRANCE_PALETTE[x.slug].juice }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] text-ink">
                    Not sure yet? Try all three in {set.perVialMl} ml
                  </span>
                  <span className="block text-[11px] text-ink-3">
                    {formatINR(set.price)} · credited back toward your first {f.volumeMl} ml
                  </span>
                </span>
                <Icon
                  name="arrowRight"
                  className="size-4 shrink-0 text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink"
                />
              </Link>
            )}

            <div className="mt-8">
              <Accordion items={details} defaultOpen={0} />
            </div>
          </div>
        </div>
      </Container>

      {/* the scent in three acts, and the facts of how it wears */}
      <PdpScent
        name={f.name}
        impression={f.impression}
        mood={f.mood}
        notesByPhase={f.notesByPhase}
        longevity={f.longevity}
        sillage={f.sillage}
        wearOccasion={f.wearOccasion}
        volumeMl={f.volumeMl}
      />

      <Container className="max-w-[1280px]">
        <PdpReviews
          enabled={reviewsEnabled}
          productName={f.name}
          reviews={reviews}
        />
      </Container>

      {set && (
        <section className="pdp-set rh-dark" aria-labelledby="pdp-set-h">
          <Container className="max-w-[1280px]">
            <div className="pdp-set__in">
              <div>
                <p className="rh-eyebrow">Not sure which one?</p>
                <h2 className="pdp-set__h mt-3.5" id="pdp-set-h">
                  Try all three before you choose.
                </h2>
                <p className="pdp-set__p mt-4">
                  {set.vialCount} × {set.perVialMl} ml, in the exact full-size formula, not a diluted
                  sample. The {formatINR(set.price)} is credited in full toward your first {f.volumeMl} ml
                  bottle.
                </p>
                <div className="pdp-set__cta">
                  <Button href="/discovery-set" variant="solidLight" size="md">
                    Explore the Discovery Set
                  </Button>
                  <span className="pdp-set__price">{formatINR(set.price)}</span>
                </div>
                <p className="mt-4 max-w-[46ch] text-[11px] leading-relaxed text-champagne/60">
                  One credit per customer, applied to a first {f.volumeMl} ml purchase. Non-refundable once
                  any vial is opened.
                </p>
              </div>
              <ul className="pdp-set__vials">
                {catalog.fragrances.map((x) => (
                  <li key={x.slug}>
                    <b>{x.name}</b>
                    <span>{x.mood[0]}</span>
                    <span>{set.perVialMl} ml</span>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      )}

      <Container className="max-w-[1280px]">
        <section className="py-[clamp(40px,6vw,72px)]">
          <h2 className="mb-5 text-[10.5px] font-normal tracking-[0.16em] text-ink-3 uppercase">
            You might also like
          </h2>
          <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0">
            {related.map((r) => (
              <article
                key={r.slug}
                className="w-[76%] shrink-0 snap-start overflow-hidden rounded-[3px] border border-line bg-surface [box-shadow:var(--sh-card)] sm:w-auto sm:shrink"
              >
                <RelatedMedia r={r} />
                <div className="p-3.5">
                  <p className="text-[1.15rem] tracking-[0.1em]">{r.name}</p>
                  <p className="mt-1 text-[10px] tracking-[0.14em] text-ink-3 uppercase">
                    {r.title}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[13px]">
                      {formatINR(r.price)}
                      <s className="ml-1 text-[11px] text-ink-3">
                        {formatINR(r.mrp)}
                      </s>
                    </span>
                    <AddToBagButton
                      sku={r.sku}
                      name={r.name}
                      price={r.price}
                      mrp={r.mrp}
                      fragrance={r.slug}
                      href={`/fragrances/${r.slug}`}
                      meta={`Extrait · ${r.volumeMl} ml`}
                      label="Add"
                      variant="onDark"
                      size="sm"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </Container>

      <PdpStickyBar name={f.name} slug={f.slug} image={cover ? cover.tiny : null} />
      </PdpVariantsProvider>
    </main>
  );
}

/**
 * The picture of a "You might also like" card: the product page's own first
 * photograph (`pdpCover`, the same one that page opens with), in a square frame
 * that keeps the whole flacon in view. Without a photograph, the vector flacon.
 */
function RelatedMedia({ r }: { r: Fragrance }) {
  const cover = pdpCover(r.slug, r.images, r.name);
  return (
    <Link
      href={`/fragrances/${r.slug}`}
      aria-label={`Open ${r.name}`}
      data-tilt
      className="group relative grid aspect-square place-items-center overflow-hidden border-b border-line"
      style={{
        background: "linear-gradient(165deg, var(--color-w0), var(--color-w1))",
      }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.thumb}
          srcSet={cover.srcSet}
          sizes={cover.srcSet ? "(min-width: 640px) 45vw, 76vw" : undefined}
          alt={cover.alt}
          width={cover.thumbWidth}
          height={cover.thumbHeight}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-[50%_55%] transition-transform duration-[900ms] ease-[var(--ease-out-strong)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <span className="block w-[34%]">
          <Flacon fragrance={r.slug} />
        </span>
      )}
      <span
        aria-hidden
        className="absolute top-3 right-3 size-2.5 rounded-full ring-[3px] ring-w1"
        style={{ background: r.juice }}
      />
    </Link>
  );
}
