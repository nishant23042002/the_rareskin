import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Accepted-payment marks.
 *
 * The card networks (Visa / Mastercard / RuPay) and the BHIM (UPI) tile are the
 * official SVGs from `payments-icons-library` (Cashfree), vendored into
 * `/public/pay/` with their white backing plate stripped. Google Pay, PhonePe
 * and Paytm are the brand marks: every UPI app settles over UPI, so they stand
 * in for "pay with any UPI app". Each mark sits on its own white tile (the one
 * place white is a fact, not a surface), so the brand colours read on any ground.
 */

/** UPI apps, shown beside the "Card · UPI · Netbanking" option so the shopper sees their app is accepted. */
const UPI_APP_MARKS = [
  { src: "/pay/gpay.svg", label: "Google Pay" },
  { src: "/pay/phonepe.svg", label: "PhonePe" },
  { src: "/pay/paytm.svg", label: "Paytm" },
];

/**
 * A quiet strip of UPI-app marks (Google Pay · PhonePe · Paytm · UPI) for use
 * beside the "Card · UPI · Netbanking" option in checkout — it turns an abstract
 * label into "yes, my app works here". Each mark sits on its own white tile so
 * the brand colours read on any ground.
 */
export function UpiAppStrip({ className }: { className?: string }) {
  const marks = [...UPI_APP_MARKS, { src: "/pay/bhim.svg", label: "UPI" }];
  return (
    <span className={cn("flex items-center gap-1.5", className)} aria-hidden>
      {marks.map((m) => (
        <span
          key={m.label}
          className="grid h-[22px] w-[34px] place-items-center rounded-[4px] bg-white ring-1 ring-black/[0.06]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-[15px] w-auto"
          />
        </span>
      ))}
    </span>
  );
}

/**
 * Three payment methods as overlapping circles, sized for the inside of a button: UPI, Visa and
 * Mastercard, the three a shopper in India reaches for first (Razorpay takes all of them, and more:
 * netbanking, wallets, RuPay). Each circle is white (the one place white is a fact: the brand marks
 * need it to read) with a ring in the button's own colour so they separate cleanly; on a mouse the
 * stack fans out a few pixels when the button is hovered. Decorative: the button's label says what it does.
 * The parent button must carry `group`.
 */
export function PayStack({ className }: { className?: string }) {
  const marks = [
    { src: "/pay/bhim.svg", label: "UPI" },
    { src: "/pay/visa.svg", label: "Visa" },
    { src: "/pay/mastercard.svg", label: "Mastercard" },
  ];
  return (
    <span className={cn("flex items-center", className)} aria-hidden>
      {marks.map((m, k) => (
        <span
          key={m.label}
          className="-ml-[9px] grid size-7 place-items-center rounded-full bg-white ring-2 ring-cta transition-transform duration-500 ease-[var(--ease-brand)] first:ml-0 group-hover:translate-x-[calc(var(--k)*4px)]"
          style={{ zIndex: 3 - k, "--k": k } as CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            decoding="async"
            className="size-5 object-contain"
          />
        </span>
      ))}
    </span>
  );
}

/**
 * Payment marks for the checkout CTA area. Larger, clearly legible tiles — a mix
 * of card networks and the UPI apps a shopper actually uses. Each mark sits on
 * its own white tile so the network / brand colours read at any size against the
 * dark footer.
 */
export function PaymentBadges({ className }: { className?: string }) {
  const marks = [
    { src: "/pay/visa.svg", label: "Visa" },
    { src: "/pay/mastercard.svg", label: "Mastercard" },
    { src: "/pay/rupay.svg", label: "RuPay" },
    { src: "/pay/gpay.svg", label: "Google Pay" },
    { src: "/pay/phonepe.svg", label: "PhonePe" },
    { src: "/pay/paytm.svg", label: "Paytm" },
  ];
  return (
    <span
      className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}
      aria-hidden
    >
      {marks.map((m) => (
        <span
          key={m.label}
          className="grid h-[26px] w-[38px] place-items-center rounded-[4px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt=""
            width={30}
            height={18}
            loading="lazy"
            decoding="async"
            className="h-[17px] w-auto"
          />
        </span>
      ))}
    </span>
  );
}
