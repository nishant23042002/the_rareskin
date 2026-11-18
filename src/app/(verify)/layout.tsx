import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { CERT_CONTACT_EMAIL } from "@/lib/certificates";

/**
 * Certificate verification shell.
 *
 * Deliberately its own route group and NOT inside `(store)`: the storefront shell
 * swaps in a holding page during pre-launch / maintenance, and a certificate that
 * someone is checking must stay verifiable whatever state the shop is in. It is
 * also light — no cart, no smooth-scroll, no analytics — because the person on the
 * other end is usually an HR reader following a QR code on a phone.
 */
export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-bg text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-[880px] items-center justify-between gap-4 px-5 py-5">
          <Link href="/" aria-label="THE RARESKIN — home">
            <Logo className="text-ink" style={{ width: 150 }} />
          </Link>
          <span className="eyebrow">Certificate verification</span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[880px] flex-1 px-5 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[880px] flex-col gap-1 px-5 py-6 text-[12px] leading-relaxed text-ink-3">
          <p>
            Issued by THE RARESKIN, operated by Velocity Ventures (Proprietorship).
            This page shows only what is printed on the certificate.
          </p>
          <p>
            Questions about a certificate:{" "}
            <a
              href={`mailto:${CERT_CONTACT_EMAIL}`}
              className="text-ink underline underline-offset-2 hover:no-underline"
            >
              {CERT_CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
