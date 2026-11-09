"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSlideDialog } from "@/hooks/use-slide-dialog";
import { Logo } from "@/components/ui/logo";
import { RhIcon } from "@/components/ui/rh-icon";
import { MenuFooter } from "./menu-footer";
import { useAuth } from "@/components/providers/auth-provider";
import { useCart } from "@/components/providers/cart-provider";
import { formatINR, type CatalogNavItem } from "@/lib/catalog";

// Kept tight on purpose: the routes a shopper actually needs before buying.
// (The fourth line, Concierge & FAQ, is rendered separately: it carries a
// second link, Contact.)
const LINKS = [
  { label: "Our Story", href: "/the-idea" },
  { label: "The Craft & Concentration", href: "/#why" },
  { label: "Shipping & Returns", href: "/shipping" },
];

/**
 * Left drawer opened by the header's burger (every breakpoint), dark like the
 * announcement bar: the three
 * fragrances as quiet rows (colour dot, name, volume; the row slides 6px to the
 * right on hover), a bordered Discovery Set card, four brand links, Bag and
 * Account pills, and a one-line reassurance footer.
 *
 * A native <dialog> + showModal() hosts it, which gives the focus trap, ESC and
 * an inert background for free. The slide is plain CSS (`.is-open` on the panel),
 * driven by `useSlideDialog`, the same hook the bag drawer uses.
 */
export function SiteMenu({
  open,
  onClose,
  nav,
  setPrice = null,
  whatsapp = null,
  freeShippingAbove = 0,
}: {
  open: boolean;
  onClose: () => void;
  nav: CatalogNavItem[];
  setPrice?: number | null;
  /** concierge number (WhatsApp, else phone) for the footer's "speak with a specialist" link */
  whatsapp?: string | null;
  /** order value (rupees) from which delivery is free; 0 = always free */
  freeShippingAbove?: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const { status, openSignIn } = useAuth();
  const { count, openCart } = useCart();
  const shown = useSlideDialog(dialogRef, open, "menu", reduced);

  // Match SSR (no session) on first paint — see the note in header.tsx.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const authed = mounted && status === "authed";

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open, lenis]);

  // animate out on native ESC instead of snapping shut
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener("cancel", onCancel);
    return () => dlg.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const rise = (i: number) => ({ "--i": i }) as CSSProperties;
  const afterNav = nav.length + 1;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Menu"
      className={`rh-sbdlg${shown ? " is-open" : ""}`}
    >
      <div className="rh-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className={`rh-sb${shown ? " is-open" : ""}`}
        aria-label="Menu"
      >
        <div className="rh-sb__top">
          <Logo style={{ width: "clamp(108px, 30vw, 132px)", maxWidth: "132px" }} />
          <button
            type="button"
            className="rh-sb__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <RhIcon name="close" />
          </button>
        </div>

        <div className="rh-sb__scroll" data-lenis-prevent>
          <p className="rh-sb__eye rh-rise" style={rise(0)}>
            The Collection
          </p>
          <ul className="rh-sb__list">
            {nav.map((f, i) => (
              <li key={f.slug} className="rh-rise" style={rise(i + 1)}>
                <Link
                  href={`/fragrances/${f.slug}`}
                  className="rh-sb__frag"
                  onClick={onClose}
                  style={{ "--c": f.accent } as CSSProperties}
                >
                  <span className="rh-sb__frag-in">
                    <span className="rh-sb__dot" aria-hidden="true" />
                    <span className="rh-sb__name">{f.name}</span>
                    <span className="rh-sb__meta">{f.volumeMl} ml Extrait</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/discovery-set"
            className="rh-sb__set rh-rise"
            style={rise(afterNav)}
            onClick={onClose}
          >
            <span className="rh-sb__set-t">The Discovery Set</span>
            <span className="rh-sb__set-badge">3 × 10 ml</span>
            {setPrice ? (
              <span className="rh-sb__set-price">{formatINR(setPrice)}</span>
            ) : null}
          </Link>

          <ul className="rh-sb__links rh-rise" style={rise(afterNav + 1)}>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={onClose}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/faq" onClick={onClose}>
                Concierge &amp; FAQ
              </Link>
              <Link href="/contact" className="rh-sb__sub" onClick={onClose}>
                Contact
              </Link>
            </li>
          </ul>

          <div className="rh-sb__pills rh-rise" style={rise(afterNav + 2)}>
            <button
              type="button"
              className="rh-sb__pill"
              onClick={() => {
                onClose();
                openCart();
              }}
            >
              Bag (<span className="rh-bagcount">{count}</span>)
            </button>
            {authed ? (
              <Link href="/account" className="rh-sb__pill" onClick={onClose}>
                Account
              </Link>
            ) : (
              <button
                type="button"
                className="rh-sb__pill"
                onClick={() => {
                  onClose();
                  openSignIn();
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <MenuFooter whatsapp={whatsapp} freeShippingAbove={freeShippingAbove} />
      </aside>
    </dialog>
  );
}
