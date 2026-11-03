import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Monochrome marks for the footer: hairline social + WhatsApp glyphs (on the
 * house 24-grid, round ends, `currentColor`) and the accepted-payment tiles.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const SOCIAL_GLYPHS = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.1" cy="6.9" r="0.55" fill="currentColor" />
    </>
  ),
  facebook: (
    <path d="M14.5 21v-8h2.7l.4-3.2h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.2H8.5V13h2.8v8" />
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.2 9.4v5.2l4.4-2.6-4.4-2.6Z" />
    </>
  ),
  x: (
    <>
      <path d="M4.5 4h4.2l10.8 16h-4.2L4.5 4Z" />
      <path d="M4.8 20l6.2-7M13.2 10.6 19.2 4" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5V16M8 7.9v.01M11.5 16v-5.5M11.5 12.9c0-1.4.9-2.4 2.2-2.4 1.4 0 2.1.9 2.1 2.4V16" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type SocialKey = keyof typeof SOCIAL_GLYPHS;

export function SocialGlyph({
  name,
  className,
}: {
  name: SocialKey;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden {...stroke}>
      {SOCIAL_GLYPHS[name]}
    </svg>
  );
}

/** WhatsApp is a concierge channel rather than a social profile, so it lives apart. */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden {...stroke}>
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z" />
      <path d="M9 8.8c.2 2.6 3.6 6 6.2 6.2l1-1.2-2-1-.9.6c-.8-.3-1.9-1.4-2.2-2.2l.6-.9-1-2L9 8.8Z" />
    </svg>
  );
}

/**
 * Accepted payment methods as the real marks — each on its own small white tile
 * so the network colours read on the dark block (the same vendored SVGs the bag
 * and the menu use, from `/public/pay`). One row; COD follows the live flag.
 */
const PAY_MARKS = [
  { src: "/pay/visa.svg", label: "Visa" },
  { src: "/pay/mastercard.svg", label: "Mastercard" },
  { src: "/pay/rupay.svg", label: "RuPay" },
  { src: "/pay/bhim.svg", label: "UPI" },
];

export function PaymentChips({
  cod,
  className,
}: {
  /** show "Cash on delivery" — mirrors the live COD flag */
  cod: boolean;
  className?: string;
}) {
  const tile =
    "grid h-[34px] min-w-[44px] place-items-center rounded-[2px] bg-white px-1.5 text-[#4a4742]";

  return (
    <ul
      aria-label="Accepted payment methods"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {PAY_MARKS.map((m) => (
        <li key={m.label} className={tile}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt={m.label}
            width={39}
            height={26}
            loading="lazy"
            decoding="async"
            className="h-[26px] w-auto"
          />
        </li>
      ))}
      {cod ? (
        <li
          className={cn(
            tile,
            "gap-1.5 px-2.5 text-[11px] leading-none font-medium tracking-[0.13em] uppercase",
          )}
          title="Cash on delivery"
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon name="banknote" className="size-[17px]" />
            COD
          </span>
        </li>
      ) : null}
    </ul>
  );
}
