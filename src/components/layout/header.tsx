"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { RhIcon } from "@/components/ui/rh-icon";
import { useScrolled } from "@/hooks/use-scrolled";
import { useCart } from "@/components/providers/cart-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { formatINR, type CatalogNavItem } from "@/lib/catalog";
import { SiteMenu } from "./site-menu";

/**
 * The glass header, rendered inside the fixed top strip under the announcement
 * bar. A frosted bar at every scroll position (no hero-tone dependency): burger
 * (opens the left sidebar) + Fragrances / Discovery Set / Our Story on the left,
 * the centred wordmark, sign-in (or Account) and the bag with its count on the
 * right. "Fragrances" drops a four-up panel — the three, then the Discovery Set.
 */
export function Header({
  nav,
  setPrice = null,
}: {
  nav: CatalogNavItem[];
  /** Discovery Set price, rupees — shown in the dropdown and the sidebar card */
  setPrice?: number | null;
}) {
  const scrolled = useScrolled(8);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const { count, openCart } = useCart();
  const { status, openSignIn } = useAuth();
  const headerRef = useRef<HTMLElement>(null);

  // The storefront shell is server-rendered with no session knowledge; the
  // client seeds auth from a sessionStorage cache. Gate the auth-dependent
  // control on mount so SSR and first paint agree (no hydration mismatch) —
  // repeat visitors see a one-frame "Sign in" → "Account" swap.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const authed = mounted && status === "authed";

  // dismiss the dropdown on an outside click or ESC
  useEffect(() => {
    if (!megaOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMegaOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMegaOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [megaOpen]);

  const openMenu = () => {
    setMegaOpen(false);
    setMenuOpen(true);
  };

  return (
    <>
      <header
        ref={headerRef}
        className={`rh-hdr${scrolled ? " is-scrolled" : ""}${megaOpen ? " is-open" : ""}`}
      >
        <div className="rh-wrap rh-hdr__row">
          <div className="rh-hdr__l">
            <button
              type="button"
              className="rh-hdr__burger"
              onClick={openMenu}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              title="Menu"
            >
              <RhIcon name="menu" />
            </button>
            <nav className="rh-hdr__nav" aria-label="Primary">
              <button
                type="button"
                className="rh-nav-btn"
                aria-expanded={megaOpen}
                aria-controls="rh-mega"
                onClick={() => setMegaOpen((v) => !v)}
              >
                Fragrances <RhIcon name="chevD" small />
              </button>
              <Link className="rh-nav-btn" href="/discovery-set">
                Discovery Set
              </Link>
              <Link className="rh-nav-btn rh-nav-btn--story" href="/the-idea">
                Our Story
              </Link>
            </nav>
          </div>

          <Link
            href="/"
            aria-label="THE RARESKIN, home"
            className="rh-hdr__logo"
          >
            <Logo className="w-full" />
          </Link>

          <div className="rh-hdr__r">
            {authed ? (
              <Link
                href="/account"
                aria-label="Your account"
                className="rh-nav-btn"
              >
                <RhIcon name="user" />
                <span className="rh-hide-sm">Account</span>
              </Link>
            ) : (
              <button
                type="button"
                className="rh-nav-btn"
                onClick={() => openSignIn()}
                aria-label="Sign in"
              >
                <RhIcon name="user" />
                <span className="rh-hide-sm">Sign in</span>
              </button>
            )}
            <button
              type="button"
              className="rh-nav-btn"
              onClick={openCart}
              aria-label={`Open bag, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <RhIcon name="bag" />
              <span className="rh-hide-sm">Bag</span>
              <b className="rh-bagcount" aria-hidden="true">
                {count}
              </b>
            </button>
          </div>
        </div>

        <div
          className={`rh-mega${megaOpen ? " is-open" : ""}`}
          id="rh-mega"
          aria-label="Fragrances"
        >
          <div className="rh-wrap rh-mega__in">
            {nav.map((f) => (
              <Link
                key={f.slug}
                href={`/fragrances/${f.slug}`}
                className="rh-mega__item"
                onClick={() => setMegaOpen(false)}
              >
                <span
                  className="rh-dot"
                  style={{ "--c": f.accent } as CSSProperties}
                />
                <span>
                  <b>{f.name}</b>
                  <em>{f.title}</em>
                  <small>{f.mood.join(" · ")}</small>
                </span>
              </Link>
            ))}
            <Link
              href="/discovery-set"
              className="rh-mega__item"
              onClick={() => setMegaOpen(false)}
            >
              <span className="rh-dot rh-dot--ring" />
              <span>
                <b>Discovery Set</b>
                <em>Three 10 ml travel companions</em>
                <small>
                  {setPrice
                    ? `${formatINR(setPrice)} · credited to your first bottle`
                    : "Credited to your first bottle"}
                </small>
              </span>
            </Link>
          </div>
          <div className="rh-wrap rh-mega__foot">
            <Link
              className="rh-link-u"
              href="/#collection"
              onClick={() => setMegaOpen(false)}
            >
              See all three <RhIcon name="arrow" small />
            </Link>
          </div>
        </div>
      </header>

      <SiteMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        nav={nav}
        setPrice={setPrice}
      />
    </>
  );
}
