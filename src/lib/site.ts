/**
 * Site-wide constants. Canonical URL lives here so metadata, sitemap and
 * JSON-LD all read from one place — set NEXT_PUBLIC_SITE_URL in the env to
 * override the default domain.
 */
// Canonical host is `www` — it is the host the previous site was indexed under
// (the bare domain 308s to it), so keeping it means no canonical change for Google.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.therareskin.com"
).replace(/\/+$/, "");

export const SITE = {
  name: "THE RARESKIN",
  shortName: "RARESKIN",
  tagline: "Scents that stay with you.",
  description:
    "THE RARESKIN. Three Extrait de Parfum, made to become part of how people remember you. Different by design.",
  url: SITE_URL,
  locale: "en_IN",
  currency: "INR",
  region: "India",
  legalName: "Velocity Ventures Group",
} as const;

/**
 * The wordmark as the screen paints it (`<Logo>`, a CSS mask): a 640 px lossless WebP derived from
 * `public/brand/rareskin-wordmark.png` by `scripts/brand-assets/make_brand_assets.py`. The 1487 px
 * PNG stays for the invoice, the emails and the share cards, which draw rasters at full size.
 */
export const WORDMARK_WEB_SRC = "/brand/rareskin-wordmark-web.webp";

/** The founder, as named on the Our Story page (a note from founder Vijay More). */
export const FOUNDER = { name: "Vijay More" } as const;

/** Real support + registered contact details. */
export const CONTACT = {
  email: "therareskinsupport@velocityventuresgroup.in",
  phone: "+91 77439 31331",
  phoneHref: "+917743931331",
  address:
    "Shop No. 04, Jija Mata Bachat Bhavan, Near S.T. Stand, Roha, Dist. Raigad – 402109",
  locality: "Roha",
  region: "Maharashtra",
  postalCode: "402109",
  country: "IN",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Jija%20Mata%20Bachat%20Bhavan%20Near%20S.T.%20Stand%20Roha%20Raigad%20402109",
} as const;

/** Absolute URL helper for canonical / OG tags. */
export function absoluteUrl(path = "/"): string {
  const base = SITE.url.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
