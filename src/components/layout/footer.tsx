import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import { SITE } from "@/lib/site";
import { getCatalogNav } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/settings";

import { FooterBackToTop } from "./footer-back-to-top";
import { FooterColumn } from "./footer-column";
import {
  PaymentChips,
  SocialGlyph,
  WhatsAppGlyph,
  type SocialKey,
} from "./footer-icons";
import { FooterCredit } from "./footer-credit";
import { FooterNewsletter } from "./footer-newsletter";

/**
 * The storefront footer. Two layers:
 *
 *  - a dark block — brand line, Private Circle sign-up, link columns, concierge,
 *    legal links, payments, back-to-top — which is the footer proper; and
 *  - a light band holding only the wordmark and the copyright, which is
 *    `sticky bottom-0` *behind* the dark block. The wordmark therefore never
 *    moves: as you reach the end of the page the dark block slides up off it
 *    and uncovers the logo (the same reveal as the reference recording), with
 *    no JavaScript and no layout shift — the band still takes its own height.
 *
 * Server component — fragrance links, contact details, social profiles, the
 * shipping note and the COD chip follow the live catalogue + admin settings.
 * Only the newsletter, the mobile accordions and back-to-top are client code.
 * Link targets are real routes only; brief items with no page yet (gift sets,
 * sourcing, journal) are left unlinked rather than sent to a 404.
 */

type FooterLink = {
  label: string;
  href: string;
  /** quiet second line under the label */
  note?: string;
  /** a fragrance's accent colour — renders as an index dot + display type on phones */
  accent?: string;
  /** a hollow dot, so an unaccented link still lines up with the dotted ones */
  ring?: boolean;
};
type Group = {
  title: string;
  links: FooterLink[];
  /** fragrance accents → three small dots beside the title on phones */
  dots?: string[];
};

const SOCIALS: { key: SocialKey; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
];

const LEGAL: { label: string; short: string; href: string }[] = [
  { label: "Privacy Policy", short: "Privacy", href: "/privacy" },
  { label: "Terms of Service", short: "Terms", href: "/terms" },
  { label: "Refund Policy", short: "Refunds", href: "/returns" },
  { label: "Cookie Policy", short: "Cookies", href: "/privacy#cookies" },
];

/** `+917743931331` → `+91 77439 31331` (other formats pass through untouched) */
function formatPhone(e164: string) {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164.replace(/\s/g, ""));
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

export async function Footer() {
  const year = new Date().getFullYear();
  const [nav, settings] = await Promise.all([
    getCatalogNav(),
    getSiteSettings(),
  ]);

  const { contact, social, shipping, flags } = settings;

  const groups: Group[] = [
    {
      title: "The Collection",
      dots: nav.map((f) => f.accent),
      links: [
        ...nav.map((f) => ({
          label: f.name,
          href: `/fragrances/${f.slug}`,
          accent: f.accent,
        })),
        ...(flags.discoverySetEnabled
          ? [
              {
                label: "Discovery Set",
                href: "/discovery-set",
                note: "Three 10 ml travel companions",
                ring: true,
              },
            ]
          : []),
      ],
    },
    {
      title: "Client Services",
      links: [
        { label: "Track Your Order", href: "/account/orders" },
        {
          label: "Shipping Information",
          href: "/shipping",
          note:
            shipping.freeAbovePaise > 0
              ? `Complimentary over ${formatPaise(shipping.freeAbovePaise)}`
              : "Complimentary across India",
        },
        { label: "7-Day Hassle-Free Returns", href: "/returns" },
        { label: "Authenticity & FAQs", href: "/faq" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "The Maison",
      links: [
        { label: "The Brand Story", href: "/the-idea" },
        { label: "Founder’s Note", href: "/#founder" },
        { label: "Why Extrait", href: "/#why" },
        { label: "Find Your Match", href: "/#quiz" },
      ],
    },
  ];

  const phone = contact.whatsapp ?? contact.phone;
  const address = `${contact.addressLine}, ${contact.region}, ${SITE.region}`;
  const mapsUrl =
    contact.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const liveSocials = SOCIALS.filter((s) => social[s.key]);

  return (
    // bg-champagne: the dark block's rounded bottom corners are cut out of it, and what shows through them
    // must be the wordmark band's colour (the band starts below the block), not the page canvas: in the
    // themes the canvas is much lighter than the band, and the corners read as white
    <footer role="contentinfo" className="relative isolate bg-champagne">
      {/* ── the footer proper — slides up over the pinned wordmark ─────── */}
      <div className="rs-dark relative z-10 rounded-b-[clamp(28px,4vw,48px)] bg-onyx text-champagne">
        <Container className="pt-[clamp(56px,7vw,96px)] pb-[clamp(36px,5vw,64px)]">
          {/* brand line + sign-up */}
          <div className="rs-rise grid gap-10 md:grid-cols-2 md:items-end md:gap-x-16">
            <div>
              <p className="serif-italic max-w-[20ch] text-[1.55rem] leading-[1.15] text-champagne md:max-w-[22ch] md:text-[clamp(1.7rem,3vw,2.6rem)]">
                Luxury fragrances crafted to become enduring signatures.
              </p>
              {/* phones keep the line above and the sign-up; the blurb is for larger screens */}
              <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.7] text-champagne/60 max-md:hidden md:text-[13.5px]">
                Home to bespoke scents — Aurevan, Vayren and Orvelis —
                companion travel editions, and curated gift boxes.
              </p>
            </div>
            <div className="md:ml-auto md:w-full md:max-w-[460px]">
              <FooterNewsletter />
            </div>
          </div>

          {/* link columns + concierge */}
          <div className="mt-[clamp(32px,6vw,72px)] grid gap-x-12 md:border-t md:border-champagne/10 md:pt-12 lg:grid-cols-[3fr_1.4fr]">
            <nav
              aria-label="Footer Navigation"
              className="grid md:grid-cols-3 md:gap-x-8"
            >
              {groups.map((g, i) => (
                <FooterColumn
                  key={g.title}
                  title={g.title}
                  defaultOpen={i === 0}
                  hint={
                    g.dots ? (
                      <span aria-hidden className="inline-flex gap-[5px]">
                        {g.dots.map((c) => (
                          <i
                            key={c}
                            className="block size-1.5 rounded-full"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${c} 62%, var(--color-champagne))`,
                            }}
                          />
                        ))}
                      </span>
                    ) : undefined
                  }
                >
                  <ul className="pb-5 md:pb-0">
                    {g.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={l.href}
                          className="group flex min-h-12 items-center gap-3.5 py-1 md:min-h-0 md:gap-3 md:py-[5px]"
                        >
                          {l.accent ? (
                            <span
                              aria-hidden
                              className="rs-dot size-2 shrink-0 rounded-full md:size-[7px]"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${l.accent} 62%, var(--color-champagne))`,
                              }}
                            />
                          ) : l.ring ? (
                            <span
                              aria-hidden
                              className="rs-dot size-2 shrink-0 rounded-full border border-champagne/45 md:size-[7px]"
                            />
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "nav-underline inline-block text-[15px] leading-[1.45] text-champagne/80 transition-colors duration-300 [--underline-color:var(--color-brass)] group-hover:text-champagne group-focus-visible:text-champagne md:text-[13.5px] md:text-champagne/75",
                              )}
                            >
                              {l.label}
                            </span>
                            {l.note ? (
                              <span className="block text-[12px] leading-[1.4] text-champagne/60 md:text-[11px]">
                                {l.note}
                              </span>
                            ) : null}
                          </span>
                          <Icon
                            name="arrowRight"
                            className="size-4 shrink-0 text-champagne/30 md:hidden"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </FooterColumn>
              ))}
            </nav>

            <div className="border-b border-champagne/10 md:mt-12 md:border-b-0 lg:mt-0">
              <FooterColumn title="Concierge">
              <address className="not-italic max-md:pb-5">
                <ul>
                  <ContactRow
                    card
                    label="WhatsApp concierge"
                    glyph={<WhatsAppGlyph />}
                    href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                    external
                  >
                    {formatPhone(phone)}
                  </ContactRow>
                  <ContactRow
                    card
                    label="Write to us"
                    glyph={<Icon name="mail" className="size-5" />}
                    href={`mailto:${contact.email}`}
                  >
                    <EmailText email={contact.email} />
                  </ContactRow>
                  {liveSocials.map((s) => (
                    <ContactRow
                      key={s.key}
                      className="max-md:hidden"
                      glyph={<SocialGlyph name={s.key} />}
                      href={social[s.key]!}
                      external
                    >
                      {s.label}
                    </ContactRow>
                  ))}
                  <ContactRow
                    top
                    label="Registered address"
                    glyph={<Icon name="pin" className="size-5" />}
                    href={mapsUrl}
                    external
                  >
                    {address}
                  </ContactRow>
                </ul>

                {liveSocials.length > 0 ? (
                  <ul
                    aria-label="Social media"
                    className="mt-3 flex flex-wrap gap-3 md:hidden"
                  >
                    {liveSocials.map((s) => (
                      <li key={s.key}>
                        <a
                          href={social[s.key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.label}
                          className="grid size-12 place-items-center rounded-full border border-champagne/20 text-champagne/80 transition-colors duration-300 active:border-brass active:text-brass"
                        >
                          <SocialGlyph name={s.key} />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </address>
              </FooterColumn>
            </div>
          </div>

          {/* legal · payments · back to top */}
          <div className="mt-[clamp(40px,5vw,64px)] flex flex-col gap-8 border-t border-champagne/10 pt-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex items-start justify-between gap-6 lg:contents">
              <nav
                aria-label="Legal"
                className="flex flex-1 flex-wrap gap-x-5 md:flex-none md:gap-x-8 lg:order-1"
              >
                {LEGAL.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="inline-flex min-h-11 items-center text-[13px] text-champagne/70 transition-colors hover:text-champagne md:text-[12px]"
                  >
                    <span className="nav-underline [--underline-color:var(--color-brass)]">
                      {/* phones read the short form; larger screens the full policy name */}
                      <span className="md:hidden">{l.short}</span>
                      <span className="max-md:hidden">{l.label}</span>
                    </span>
                  </Link>
                ))}
              </nav>
              <div className="lg:order-3">
                <FooterBackToTop />
              </div>
            </div>

            <div className="lg:order-2">
              <p className="mb-3 text-[10px] tracking-[0.22em] text-champagne/55 uppercase lg:hidden">
                Secure payments
              </p>
              <PaymentChips cod={flags.codEnabled} />
            </div>
          </div>
        </Container>
      </div>

      {/* ── the pinned band: wordmark + copyright, nothing else ────────── */}
      <div className="sticky bottom-0 z-0 bg-champagne text-onyx">
        <Container className="pt-[clamp(44px,7vw,104px)] pb-[calc(1.75rem+env(safe-area-inset-bottom))]">
          <Logo className="w-full" />
          <p className="mt-[clamp(20px,3vw,40px)] text-center text-[12px] leading-[1.6] text-onyx/65">
            &copy; {year} The Rareskin (Velocity Ventures Group). All rights
            reserved.
          </p>
          <FooterCredit />
        </Container>
      </div>
    </footer>
  );
}

/**
 * One concierge channel — an icon and a value on a ≥44px target. On phones a
 * `card` row becomes a bordered tap card (label above, arrow at the right);
 * from md up every row is the same plain icon + text line.
 */
function ContactRow({
  glyph,
  label,
  href,
  external,
  top,
  card,
  className,
  children,
}: {
  glyph: React.ReactNode;
  /** small caption shown above the value on phones */
  label?: string;
  href: string;
  external?: boolean;
  /** align the icon to the first line of a multi-line value */
  top?: boolean;
  card?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={cn(card && "max-md:mb-3", className)}>
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : undefined)}
        className={cn(
          "group flex min-h-11 gap-3.5 py-1.5",
          top ? "items-start" : "items-center",
          card &&
            "max-md:min-h-[4.5rem] max-md:rounded-[18px] max-md:border max-md:border-champagne/15 max-md:bg-champagne/[0.04] max-md:px-4 max-md:py-3 max-md:transition-colors max-md:active:bg-champagne/10",
        )}
      >
        <span
          className={cn(
            "shrink-0 text-brass",
            card &&
              "max-md:grid max-md:size-11 max-md:place-items-center max-md:rounded-full max-md:border max-md:border-brass/40",
          )}
        >
          {glyph}
        </span>
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="mb-0.5 block text-[10px] tracking-[0.2em] text-champagne/55 uppercase md:hidden">
              {label}
            </span>
          ) : null}
          <span className="nav-underline inline-block text-[15px] leading-[1.55] text-champagne/80 transition-colors duration-300 [--underline-color:var(--color-brass)] group-hover:text-champagne md:text-[13.5px] md:text-champagne/75">
            {children}
          </span>
          {external ? (
            <span className="sr-only"> (opens in a new tab)</span>
          ) : null}
        </span>
        {card ? (
          <Icon
            name="arrowUpRight"
            className="size-4 shrink-0 text-champagne/40 md:hidden"
          />
        ) : null}
      </a>
    </li>
  );
}

/** an address that, if it must wrap, wraps at the @ rather than mid-word */
function EmailText({ email }: { email: string }) {
  const at = email.indexOf("@");
  if (at < 0) return <>{email}</>;
  return (
    <span className="break-words">
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </span>
  );
}
