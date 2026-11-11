import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { LaunchOffer } from "@/components/home/launch-offer";
import { InFocus } from "@/components/home/in-focus";
import { Collection } from "@/components/home/collection";
import { StaffConceptSwitcher } from "@/components/auth/staff-tools";
import { Quiz } from "@/components/home/quiz";
import { DiscoverySet } from "@/components/home/discovery-set";
import { WhyExtrait } from "@/components/home/why-extrait";
import { UnboxingRitual } from "@/components/home/unboxing-ritual";
import { MadeDeliberately } from "@/components/home/made-deliberately";
import { FounderNote } from "@/components/home/founder-note";
import { InstagramStrip } from "@/components/home/instagram-strip";
import { SHOW_ON_THE_SKIN } from "@/config/homepage-sections";
import { cloudinaryVariant } from "@/lib/catalog";
import { getStorefrontCatalog } from "@/server/data/catalog";
import {
  getReviewShowcasePhotos,
  type ShowcasePhoto,
} from "@/server/data/reviews";
import { getSiteSettings } from "@/server/data/settings";

/**
 * Homepage. Catalogue data is read once from the database here (cached, tagged
 * `catalog`) and passed down to the section components as props — the client
 * sections never import the catalogue directly.
 *
 * Order: hero → launch ticket + promises → In Focus → the three → quiz →
 * Discovery Set → why extrait (+ atomizer macro) → founder → the ritual
 * (unboxing) → made deliberately (→ on the skin, when switched on in
 * `config/homepage-sections.ts`).
 * Every picture comes from `public/images/assets-manifest.json`
 * (`@/lib/home-images`): ratio, `sizes`, focal point and alt live there.
 * (Customer reviews live on the product pages and in the account area; the
 * homepage no longer carries a reviews section.)
 */
export default async function HomePage() {
  const [{ fragrances, discoverySet }, settings] = await Promise.all([
    getStorefrontCatalog(),
    getSiteSettings(),
  ]);

  // The store can't render its homepage without a catalogue — treat an empty
  // result as a misconfiguration rather than shipping a blank page.
  if (fragrances.length === 0 || !discoverySet) notFound();

  // "On the skin" (the @therareskin strip) is switched off until there are real
  // posts (`config/homepage-sections.ts`); while it is off its photos are not read.
  const strip = SHOW_ON_THE_SKIN ? await buildSkinStrip(fragrances) : [];

  // The launch price is the first fragrance's — all three share one price today.
  const lead = fragrances[0];

  // The pass shows an end date only when the store has set one for a running campaign (Site Settings →
  // Campaign); the pass itself drops it once it has passed (it reads today's date in the browser).
  // Otherwise it says the price returns to the list price when the launch ends, and nothing about a date.
  const { campaign } = settings;
  const endsAt = campaign.active && campaign.endsAt ? campaign.endsAt : null;

  return (
    <main id="main" className="rh-main">
      <Hero photo={settings.heroImage} price={lead.price} mrp={lead.mrp} fragrances={fragrances} />
      <LaunchOffer
        price={lead.price}
        mrp={lead.mrp}
        volumeMl={lead.volumeMl}
        items={fragrances.map((f) => ({ slug: f.slug, name: f.name }))}
        freeShippingAbove={settings.shipping.freeAbovePaise / 100}
        endsAt={endsAt}
      />
      <InFocus fragrances={fragrances} />
      <Collection fragrances={fragrances} />
      {/* "Preview" tab for the card art directions (src/config/homepage-assets.ts) — signed-in staff only */}
      <StaffConceptSwitcher />
      <Quiz fragrances={fragrances} />
      <DiscoverySet set={discoverySet} fragrances={fragrances} />
      <WhyExtrait />
      <FounderNote portrait={settings.founderPortrait} />
      <UnboxingRitual />
      <MadeDeliberately />
      {SHOW_ON_THE_SKIN && (
        <InstagramStrip
          photos={strip}
          profileHref={settings.social.instagram}
        />
      )}
    </main>
  );
}

/**
 * The "@THERARESKIN" strip's photos: real customer photos first, then real
 * product packshots. Whatever slots are still empty, the strip fills itself with
 * illustrated flacon placeholders (shot from different angles), so the band is
 * always full and on-brand until a real feed is wired in (see README).
 */
async function buildSkinStrip(
  fragrances: Awaited<ReturnType<typeof getStorefrontCatalog>>["fragrances"],
): Promise<ShowcasePhoto[]> {
  const showcasePhotos = await getReviewShowcasePhotos(12);
  const packshots: ShowcasePhoto[] = fragrances
    .map((f): ShowcasePhoto | null => {
      const url = cloudinaryVariant(f.images.flat ?? f.images.hero, { w: 560 });
      return url ? { url, alt: f.name, href: `/fragrances/${f.slug}` } : null;
    })
    .filter((p): p is ShowcasePhoto => p !== null);
  const strip: ShowcasePhoto[] = [];
  const seen = new Set<string>();
  for (const p of [...showcasePhotos, ...packshots]) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    strip.push(p);
  }
  return strip;
}
