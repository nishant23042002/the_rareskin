import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { LaunchOffer } from "@/components/home/launch-offer";
import { InFocus } from "@/components/home/in-focus";
import { Collection } from "@/components/home/collection";
import { Quiz } from "@/components/home/quiz";
import { DiscoverySet } from "@/components/home/discovery-set";
import { WhyExtrait } from "@/components/home/why-extrait";
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
 * Discovery Set → why extrait → founder → made deliberately → @therareskin.
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

  // "@THERARESKIN" strip: real customer photos first, then a set of placeholder
  // lifestyle shots, then packshots — so the band is always full while the real
  // feed fills in. DUMMY_INSTAGRAM is demo content; swap for a real feed / curated
  // set before launch (see README).
  const DUMMY_INSTAGRAM: ShowcasePhoto[] = [
    "rareskin-ig-a",
    "rareskin-ig-b",
    "rareskin-ig-c",
    "rareskin-ig-d",
    "rareskin-ig-e",
    "rareskin-ig-f",
  ].map((seed) => ({
    url: `https://picsum.photos/seed/${seed}/640/800`,
    alt: "THE RARESKIN, worn",
    href: null,
  }));
  const packshots: ShowcasePhoto[] = fragrances
    .map((f): ShowcasePhoto | null => {
      const url = cloudinaryVariant(f.images.flat ?? f.images.hero, { w: 560 });
      return url ? { url, alt: f.name, href: `/fragrances/${f.slug}` } : null;
    })
    .filter((p): p is ShowcasePhoto => p !== null);
  const strip: ShowcasePhoto[] = [];
  const seen = new Set<string>();
  for (const p of [...showcasePhotos, ...DUMMY_INSTAGRAM, ...packshots]) {
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
      <Quiz fragrances={fragrances} />
      <DiscoverySet set={discoverySet} fragrances={fragrances} />
      <WhyExtrait />
      <FounderNote portrait={settings.founderPortrait} />
      <MadeDeliberately />
      <InstagramStrip
        photos={strip}
        profileHref={settings.social.instagram}
      />
    </main>
  );
}
