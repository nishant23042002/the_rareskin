import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";

import { Logo } from "@/components/ui/logo";
import { CERT_CONTACT_EMAIL, CERT_REGISTERED_ADDRESS } from "@/lib/certificates";
import "./verify.css";

/**
 * Certificate verification shell.
 *
 * Deliberately its own route group and NOT inside `(store)`: the storefront shell
 * swaps in a holding page during pre-launch / maintenance, and a certificate that
 * someone is checking must stay verifiable whatever state the shop is in. It is
 * also light — no cart, no smooth-scroll, no analytics — because the person on the
 * other end is usually an HR reader following a QR code on a phone.
 *
 * Cormorant Garamond is loaded here, and only here: it is the serif of the
 * certificate itself (the PDF and the printable templates use it), so the verified
 * record on screen is set in the same face as the paper.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`cv ${cormorant.variable} flex min-h-svh flex-col bg-bg text-ink`}>
      <header className="cv-head cv-noprint">
        <div className="mx-auto flex w-full max-w-[1040px] items-center justify-between gap-4 px-5 py-5">
          <Link href="/" aria-label="THE RARESKIN — home">
            <Logo className="text-ink" style={{ width: 150 }} />
          </Link>
          <span className="cv-eyebrow hidden sm:inline">Certificate verification</span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1040px] flex-1 px-5 py-10 sm:py-14">
        {children}
      </main>

      <footer className="cv-foot cv-noprint">
        <div className="mx-auto grid w-full max-w-[1040px] gap-6 px-5 py-9 text-[12.5px] leading-relaxed sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Logo className="mb-3 text-[#f2f1ed]" style={{ width: 128 }} />
            <p>Issued by THE RARESKIN, operated by Velocity Ventures (Proprietorship).</p>
            <p>Registered address: {CERT_REGISTERED_ADDRESS}</p>
            <p>
              Questions about a certificate: <a href={`mailto:${CERT_CONTACT_EMAIL}`}>{CERT_CONTACT_EMAIL}</a>
            </p>
          </div>
          <p className="max-w-[34ch] text-[#8c867b] sm:text-right">
            This page shows only what is printed on the certificate, and is checked against the register
            each time it is opened.
          </p>
        </div>
      </footer>
    </div>
  );
}
