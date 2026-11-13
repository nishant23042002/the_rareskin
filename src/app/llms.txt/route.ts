import { CONTACT, FOUNDER, SITE, absoluteUrl } from "@/lib/site";
import { formatINR } from "@/lib/catalog";
import { getStorefrontCatalog } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/settings";

/**
 * /llms.txt: a plain-text brief of the brand for answer engines (ChatGPT, Perplexity, Gemini, Claude ...): who
 * the brand is, the range with its notes and prices, and the policies, each with the page that is the
 * source. Built from the live catalogue and settings, so it can never disagree with the storefront.
 */
export const revalidate = 3600;

export async function GET() {
  const [{ fragrances, discoverySet }, settings] = await Promise.all([
    getStorefrontCatalog(),
    getSiteSettings(),
  ]);
  const freeAbove = settings.shipping.freeAbovePaise / 100;
  const flat = settings.shipping.flatRatePaise / 100;

  const lines: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description} An Indian fragrance house in ${CONTACT.locality}, ${CONTACT.region}, founded by ${FOUNDER.name} and operated by ${SITE.legalName}. Concentrated Extrait de Parfum, shipped across India.`,
    "",
    "## The range",
    ...fragrances.map(
      (f) =>
        `- [${f.name}](${absoluteUrl(`/fragrances/${f.slug}`)}): ${f.title}. Extrait de Parfum, ${f.volumeMl} ml, ${formatINR(f.price)} (list price ${formatINR(f.mrp)}). Notes: ${f.notes.join(", ")}.`,
    ),
    ...(discoverySet
      ? [
          `- [${discoverySet.name}](${absoluteUrl("/discovery-set")}): ${discoverySet.vialCount} x ${discoverySet.perVialMl} ml extraits, one of each, ${formatINR(discoverySet.price)}; ${formatINR(discoverySet.creditRupees)} is credited toward a first full-size bottle.`,
        ]
      : []),
    "",
    "## About",
    `- [Our Story](${absoluteUrl("/the-idea")}): the founder's note and the philosophy behind the brand`,
    `- [FAQ](${absoluteUrl("/faq")}): longevity, who the fragrances are for, ordering and delivery`,
    "",
    "## Policies",
    `- [Shipping](${absoluteUrl("/shipping")}): ${freeAbove > 0 && flat > 0 ? `free delivery above ${formatINR(freeAbove)}, ${formatINR(flat)} below that` : "free delivery on every order"}; dispatched within 24-48 hours; 2-10 working days by pincode${settings.cod.enabled ? "; cash on delivery available" : ""}`,
    `- [Returns](${absoluteUrl("/returns")}): 7 days for unopened bottles`,
    `- [Privacy](${absoluteUrl("/privacy")}) and [Terms](${absoluteUrl("/terms")})`,
    "",
    "## Contact",
    `- [Contact](${absoluteUrl("/contact")}): ${CONTACT.email}, ${CONTACT.phone}, ${CONTACT.address}`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
