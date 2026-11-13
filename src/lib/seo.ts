import type { Metadata } from "next";
import { SITE, CONTACT, FOUNDER, absoluteUrl } from "./site";

/**
 * One place to build page metadata so every route gets a canonical URL and
 * matching OpenGraph / Twitter tags. `path` is the route ("/shipping"); the
 * title runs through the layout's `%s — THE RARESKIN` template.
 */
export function pageMeta({
  title,
  description,
  path,
  noindex,
}: {
  title: string;
  description?: string;
  path: string;
  /** keep the page out of search — order pages, checkout, account */
  noindex?: boolean;
}): Metadata {
  const desc = description ?? SITE.description;
  const url = absoluteUrl(path);
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description: desc,
      url,
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

/** BreadcrumbList for a leaf page — helps answer engines place the page. */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Home", path: "/" },
      ...trail,
    ].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** Site-wide Organization schema, emitted once in the root layout. */
export const ORGANIZATION_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url,
  description: SITE.description,
  slogan: SITE.tagline,
  logo: absoluteUrl("/brand/rareskin-wordmark.png"),
  email: CONTACT.email,
  telephone: CONTACT.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT.address,
    addressLocality: CONTACT.locality,
    addressRegion: CONTACT.region,
    postalCode: CONTACT.postalCode,
    addressCountry: CONTACT.country,
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: CONTACT.email,
    telephone: CONTACT.phone,
    areaServed: "IN",
    availableLanguage: ["en", "hi", "mr"],
  },
  areaServed: { "@type": "Country", name: SITE.region },
  founder: { "@type": "Person", name: FOUNDER.name },
  // the 7-day return of unopened bottles the Returns page promises (src/app/(store)/returns)
  hasMerchantReturnPolicy: {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    url: absoluteUrl("/returns"),
  },
} as const;

/** The site itself, so an answer engine can tie the pages to one named publisher. Emitted on the homepage. */
export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  inLanguage: "en-IN",
  publisher: { "@id": ORGANIZATION_ID },
} as const;

/** `sameAs` for the Organization: the brand's own profiles, from Site Settings → Social (empty ones are dropped). */
export function organizationSameAs(social: Record<string, string | undefined | null>) {
  const urls = Object.values(social).filter(
    (u): u is string => typeof u === "string" && /^https?:\/\//.test(u),
  );
  return urls.length
    ? { "@context": "https://schema.org", "@type": "Organization", "@id": ORGANIZATION_ID, sameAs: urls }
    : null;
}

/** An image path from the catalogue (a file under /public, or a full Cloudinary URL) as an absolute URL. */
export function absoluteImage(src: string): string {
  return /^https?:\/\//.test(src) ? src : absoluteUrl(src);
}

/**
 * What delivery costs for an order of `amount` rupees, per the store's own shipping settings (free from
 * `freeAbove`, a flat fee below it), as the `shippingDetails` of a Product offer. Handling and transit
 * times are the ones the Shipping page states (ships in 24-48 hours; 2-10 working days by pincode).
 */
export function shippingDetailsJsonLd(amount: number, freeAbove: number, flatRate: number) {
  const rate = freeAbove > 0 && amount < freeAbove ? flatRate : 0;
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: String(rate), currency: SITE.currency },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 10, unitCode: "DAY" },
    },
  };
}
