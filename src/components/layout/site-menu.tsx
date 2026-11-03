"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { Logo } from "@/components/ui/logo";
import { Flacon } from "@/components/ui/flacon";
import { RhIcon } from "@/components/ui/rh-icon";
import { MenuFooter } from "./menu-footer";
import { useAuth } from "@/components/providers/auth-provider";
import { useCart } from "@/components/providers/cart-provider";
import { formatINR, type CatalogNavItem } from "@/lib/catalog";

// Kept tight on purpose — the routes a shopper actually needs before buying.
const LINKS = [
  { label: "Our Story", href: "/the-idea" },
  { label: "Why Extrait", href: "/#why" },
  { label: "Shipping & Returns", href: "/shipping" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const SLIDE_MS = 660;

/**
 * Left sidebar opened by the header's burger (every breakpoint): the three
 * fragrances (each row washes in its own colour on hover), a dark Discovery Set
 * card with fanning vials, Bag / Sign in rows, a few quiet links and a compact
 * trust + payment base.
 *
 * A native <dialog> + showModal() hosts it, which gives the focus trap, ESC and
 * an inert background for free. The slide is plain CSS (`.is-open` on the panel);
 * on close the dialog stays open just long enough for the slide-out to play.
 */
export function SiteMenu({
  open,
  onClose,
  nav,
  setPrice = null,
}: {
  open: boolean;
  onClose: () => void;
  nav: CatalogNavItem[];
  setPrice?: number | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const { status, openSignIn } = useAuth();
  const { count, openCart } = useCart();
  const [shown, setShown] = useState(false);

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

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    let t = 0;
    let r1 = 0;
    let r2 = 0;

    if (open) {
      if (!dlg.open) dlg.showModal();
      lockScroll("menu");
      // two frames: let the browser paint the parked state first, so the
      // class change below is a real transition and not a jump
      r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
    } else if (dlg.open) {
      r1 = requestAnimationFrame(() => setShown(false));
      t = window.setTimeout(
        () => {
          dlg.close();
          unlockScroll("menu");
        },
        reduced ? 0 : SLIDE_MS,
      );
    }

    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.clearTimeout(t);
    };
  }, [open, reduced]);

  // never leave the page locked if the header unmounts with the menu open
  useEffect(() => () => unlockScroll("menu"), []);

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

  return (
    <dialog
      ref={dialogRef}
      aria-label="Menu"
      className={`rh-sbdlg${shown ? " is-open" : ""}`}
    >
      <div className="rh-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className={`rh-sb${shown ? " is-open" : ""}`}
        data-theme="dark"
        aria-label="Menu"
      >
        <div className="rh-sb__top">
          <Logo style={{ width: "clamp(112px, 32vw, 132px)", maxWidth: "132px" }} />
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
          <p className="rh-eyebrow rh-sb__eye rh-rise" style={rise(0)}>
            The Collection
          </p>
          <ul className="rh-sb__list">
            {nav.map((f, i) => (
              <li key={f.slug} className="rh-rise" style={rise(i + 1)}>
                <Link
                  href={`/fragrances/${f.slug}`}
                  className="rh-sb__frag"
                  onClick={onClose}
                  style={
                    { "--ground": f.ground, "--on": f.onGround } as CSSProperties
                  }
                >
                  <span className="rh-sb__thumb" aria-hidden="true">
                    <span
                      className="mx-auto mt-[6%] block"
                      style={{ width: "50%" }}
                    >
                      <Flacon fragrance={f.slug} />
                    </span>
                  </span>
                  <span className="rh-sb__txt">
                    <b>{f.name}</b>
                    <em>{f.title}</em>
                    <small>{f.mood.join(" · ")}</small>
                  </span>
                  <RhIcon name="arrow" className="rh-sb__arr" />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/discovery-set"
            className="rh-sb__set rh-rise"
            style={rise(4)}
            onClick={onClose}
          >
            <span>
              <small>The Discovery Set</small>
              <span className="rh-sb__set-t rh-serif">Meet all three</span>
              <em>
                Three 10 ml
                {setPrice ? ` · ${formatINR(setPrice)}` : ""} · credited to your
                first bottle
              </em>
            </span>
            <span className="rh-sb__vials" aria-hidden="true">
              {nav.map((f) => (
                <span key={f.slug}>
                  <Flacon fragrance={f.slug} />
                </span>
              ))}
            </span>
          </Link>

          <ul className="rh-sb__rows rh-rise" style={rise(5)}>
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openCart();
                }}
              >
                <RhIcon name="bag" />
                Bag <b className="rh-bagcount">{count}</b>
                <RhIcon name="chevR" />
              </button>
            </li>
            <li>
              {authed ? (
                <Link href="/account" onClick={onClose}>
                  <RhIcon name="user" />
                  Account
                  <RhIcon name="chevR" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openSignIn();
                  }}
                >
                  <RhIcon name="user" />
                  Sign in
                  <RhIcon name="chevR" />
                </button>
              )}
            </li>
          </ul>

          <p className="rh-sb__links rh-rise" style={rise(6)}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={onClose}>
                {l.label}
              </Link>
            ))}
          </p>
        </div>

        <MenuFooter />
      </aside>
    </dialog>
  );
}
