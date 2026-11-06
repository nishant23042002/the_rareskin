import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { LaunchOffer } from "@/components/home/launch-offer";
import { InFocus } from "@/components/home/in-focus";
import { Collection } from "@/components/home/collection";
import { ConceptSwitcher } from "@/components/home/concept-switcher";
import { Quiz } from "@/components/home/quiz";
import { DiscoverySet } from "@/components/home/discovery-set";
import { WhyExtrait } from "@/components/home/why-extrait";
import { AtelierStory } from "@/components/home/atelier-story";
import { UnboxingRitual } from "@/components/home/unboxing-ritual";
import { ScentOnSkin } from "@/components/home/scent-on-skin";
import { MadeDeliberately } from "@/components/home/made-deliberately";
import { FounderNote } from "@/components/home/founder-note";
import { InstagramStrip } from "@/components/home/instagram-strip";
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
 * Discovery Set → why extrait (+ atomizer macro) → atelier → founder → the
 * ritual (unboxing) → on skin → made deliberately → @therareskin.
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

  const showcasePhotos = await getReviewShowcasePhotos(12);

  // The launch price is the first fragrance's — all three share one price today.
  const lead = fragrances[0];

  // "@THERARESKIN" strip: real customer photos first, then real product
  // packshots. Whatever slots are still empty, the strip fills itself with
  // illustrated flacon placeholders (shot from different angles), so the band is
  // always full and on-brand until a real feed is wired in (see README).
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

  return (
    <main id="main" className="rh-main">
      <Hero photo={settings.heroImage} price={lead.price} mrp={lead.mrp} />
      <LaunchOffer
        price={lead.price}
        mrp={lead.mrp}
        volumeMl={lead.volumeMl}
      />
      <InFocus fragrances={fragrances} />
      <Collection fragrances={fragrances} />
      {/* preview bar for the card art directions: renders nothing in production (src/config/homepage-assets.ts) */}
      <ConceptSwitcher />
      <Quiz fragrances={fragrances} />
      <DiscoverySet set={discoverySet} fragrances={fragrances} />
      <WhyExtrait />
      <AtelierStory />
      <FounderNote portrait={settings.founderPortrait} />
      <UnboxingRitual />
      <ScentOnSkin />
      <MadeDeliberately />
      <InstagramStrip
        photos={strip}
        profileHref={settings.social.instagram}
      />
    </main>
  );
}
