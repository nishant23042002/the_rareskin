"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { RhIcon } from "@/components/ui/rh-icon";
import { Roll } from "@/components/ui/roll";
import { useScrolled } from "@/hooks/use-scrolled";
import { useCart } from "@/components/providers/cart-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { formatINR, type CatalogNavItem } from "@/lib/catalog";
import { SiteMenu } from "./site-menu";

/**
 * The glass header, rendered inside the fixed top strip under the announcement
 * bar. A frosted bar at every scroll position (no hero-tone dependency): the menu
 * icon (two lines of different lengths that even out on hover; opens the left
 * sidebar) + Fragrances / Discovery Set / Our Story on the left, the centred
 * wordmark, sign-in (or Account) and the bag with its count on the right.
 *
 * Every label rolls on hover (`Roll`), the other nav links step back while one is
 * in focus, and one brass line glides under the link in play. "Fragrances" drops a
 * four-up panel — the three, then the Discovery Set — that opens on a mouse
 * hover (with a short intent delay, so crossing the bar does not trigger it) and
 * on click, tap or keyboard; ESC, an outside click or leaving the header closes it.
 */
export function Header({
  nav,
  setPrice = null,
  whatsapp = null,
  freeShippingAbove = 0,
}: {
  nav: CatalogNavItem[];
  /** Discovery Set price, rupees — shown in the dropdown and the sidebar card */
  setPrice?: number | null;
  /** concierge number (WhatsApp, else phone) for the sidebar footer link */
  whatsapp?: string | null;
  /** order value (rupees) from which delivery is free; 0 = always free (the sidebar footer line) */
  freeShippingAbove?: number;
}) {
  const scrolled = useScrolled(8);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const { count, openCart, toast } = useCart();
  const { status, openSignIn } = useAuth();
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const glideRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  const section = pathname.startsWith("/fragrances")
    ? "fragrances"
    : pathname.startsWith("/discovery-set")
      ? "discovery"
      : pathname.startsWith("/the-idea")
        ? "story"
        : null;

  // The bag count bounces when something is ADDED (the cart's "added to bag" toast plus a higher
  // count), not when a saved bag loads: the previous values are compared during render, the way
  // React documents it, so there is no effect and no flash. `key` restarts the CSS animation.
  const [seen, setSeen] = useState({ count, toast });
  const [bump, setBump] = useState(0);
  if (seen.count !== count || seen.toast !== toast) {
    setSeen({ count, toast });
    if (toast && count > seen.count) setBump((n) => n + 1);
  }

  // The nav's underline is one element that glides between the links (transform only: it moves to the
  // hovered / focused link, and rests under the open dropdown or the current page).
  const glideTo = useCallback((el: HTMLElement | null) => {
    const g = glideRef.current;
    if (!g) return;
    if (!el || el.offsetWidth === 0) {
      g.classList.remove("is-on");
      return;
    }
    const first = !g.classList.contains("is-on");
    // the first placement fades in where it is, instead of sliding in from the left edge
    if (first) g.style.transition = "opacity .3s";
    g.style.setProperty("--gx", `${el.offsetLeft}px`);
    g.style.setProperty("--gw", String(el.offsetWidth));
    g.classList.add("is-on");
    if (first) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => g.style.removeProperty("transition")),
      );
    }
  }, []);
  const glideRest = useCallback(() => {
    const key = megaOpen ? "fragrances" : section;
    glideTo(
      key ? (navRef.current?.querySelector<HTMLElement>(`[data-nav="${key}"]`) ?? null) : null,
    );
  }, [megaOpen, section, glideTo]);
  useEffect(() => {
    glideRest();
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(glideRest);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [glideRest]);
  const glideToTarget = (t: EventTarget | null) => {
    const btn = t instanceof Element ? t.closest<HTMLElement>(".rh-nav-btn") : null;
    if (btn) glideTo(btn);
  };

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

  // ---- the Fragrances dropdown: hover intent + click ----
  // A mouse resting on "Fragrances" opens it after a beat (110ms, so sweeping across the bar does
  // nothing); it closes 200ms after the pointer has left both the button and the panel, a delay that
  // also covers the few pixels between them. A mouse CLICK pins it open (it then stays until ESC, an
  // outside click, a second click or a link); touch, pen and the keyboard just toggle it.
  const hoverTimer = useRef<number | null>(null);
  const pinned = useRef(false);
  const lastPointer = useRef("mouse");
  const clearHover = useCallback(() => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);
  const scheduleMega = (open: boolean, ms: number) => {
    clearHover();
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = null;
      if (!open) pinned.current = false;
      setMegaOpen(open);
    }, ms);
  };
  const closeMega = useCallback(() => {
    clearHover();
    pinned.current = false;
    setMegaOpen(false);
  }, [clearHover]);
  useEffect(() => clearHover, [clearHover]);

  const onHeaderOver = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
    if (e.target.closest('[data-nav="fragrances"]')) {
      if (megaOpen) clearHover();
      else scheduleMega(true, 110);
    } else if (e.target.closest(".rh-mega")) {
      clearHover();
    } else if (megaOpen && !pinned.current) {
      scheduleMega(false, 200);
    } else {
      clearHover();
    }
  };
  const onHeaderLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (megaOpen && !pinned.current) scheduleMega(false, 200);
    else clearHover();
  };
  const onFragrancesClick = (e: React.MouseEvent) => {
    // e.detail is 0 for a keyboard-triggered click
    if (e.detail > 0 && lastPointer.current === "mouse") {
      clearHover();
      if (megaOpen && pinned.current) closeMega();
      else {
        pinned.current = true;
        setMegaOpen(true);
      }
    } else {
      setMegaOpen((v) => !v);
    }
  };

  // dismiss the dropdown on an outside click or ESC
  useEffect(() => {
    if (!megaOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) closeMega();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMega();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [megaOpen, closeMega]);

  const openMenu = () => {
    closeMega();
    setMenuOpen(true);
  };

  return (
    <>
      <header
        ref={headerRef}
        className={`rh-hdr${scrolled ? " is-scrolled" : ""}${megaOpen ? " is-open" : ""}`}
        onPointerOver={onHeaderOver}
        onPointerLeave={onHeaderLeave}
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
              {/* two lines of different lengths that even out on hover (styles: .rh-burger in home.css) */}
              <span className="rh-burger" aria-hidden="true">
                <i>
                  <b />
                </i>
                <i>
                  <b />
                </i>
              </span>
              <span className="rh-burger__label" aria-hidden="true">
                <Roll>Menu</Roll>
              </span>
            </button>
            <nav
              ref={navRef}
              className="rh-hdr__nav"
              aria-label="Primary"
              onPointerOver={(e) => glideToTarget(e.target)}
              onPointerLeave={glideRest}
              onFocus={(e) => glideToTarget(e.target)}
              onBlur={glideRest}
            >
              <button
                type="button"
                className="rh-nav-btn"
                data-nav="fragrances"
                aria-expanded={megaOpen}
                aria-controls="rh-mega"
                onPointerDown={(e) => {
                  lastPointer.current = e.pointerType;
                }}
                onClick={onFragrancesClick}
              >
                <Roll>Fragrances</Roll> <RhIcon name="chevD" small />
              </button>
              <Link
                className="rh-nav-btn"
                data-nav="discovery"
                href="/discovery-set"
                aria-current={section === "discovery" ? "page" : undefined}
              >
                <Roll>Discovery Set</Roll>
              </Link>
              <Link
                className="rh-nav-btn rh-nav-btn--story"
                data-nav="story"
                href="/the-idea"
                aria-current={section === "story" ? "page" : undefined}
              >
                <Roll>Our Story</Roll>
              </Link>
              <span ref={glideRef} className="rh-glide" aria-hidden="true" />
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
                <span className="rh-hide-sm">
                  <Roll>Account</Roll>
                </span>
              </Link>
            ) : (
              <button
                type="button"
                className="rh-nav-btn"
                onClick={() => openSignIn()}
                aria-label="Sign in"
              >
                <RhIcon name="user" />
                <span className="rh-hide-sm">
                  <Roll>Sign in</Roll>
                </span>
              </button>
            )}
            <button
              type="button"
              className="rh-nav-btn"
              onClick={openCart}
              aria-label={`Open bag, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <RhIcon name="bag" />
              <span className="rh-hide-sm">
                <Roll>Bag</Roll>
              </span>
              <b
                key={bump}
                className={`rh-bagcount${bump ? " is-bump" : ""}`}
                aria-hidden="true"
              >
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
          <div className="rh-mega__panel">
            <div className="rh-wrap rh-mega__in">
              {nav.map((f, k) => (
                <Link
                  key={f.slug}
                  href={`/fragrances/${f.slug}`}
                  className="rh-mega__item"
                  style={{ "--c": f.accent, "--k": k } as CSSProperties}
                  onClick={closeMega}
                >
                  <span className="rh-dot" />
                  <span className="rh-mega__txt">
                    <b>{f.name}</b>
                    <em>{f.title}</em>
                    <small>{f.mood.join(" · ")}</small>
                  </span>
                  <RhIcon name="arrow" small />
                </Link>
              ))}
              <Link
                href="/discovery-set"
                className="rh-mega__item rh-mega__item--set"
                style={{ "--k": nav.length } as CSSProperties}
                onClick={closeMega}
              >
                <span className="rh-dot rh-dot--ring" />
                <span className="rh-mega__txt">
                  <b>Discovery Set</b>
                  <em>Three 10 ml travel companions</em>
                  <small>
                    {setPrice
                      ? `${formatINR(setPrice)} · credited to your first bottle`
                      : "Credited to your first bottle"}
                  </small>
                </span>
                <RhIcon name="arrow" small />
              </Link>
            </div>
            <div className="rh-wrap rh-mega__foot">
              <Link className="rh-link-u" href="/#collection" onClick={closeMega}>
                See all three <RhIcon name="arrow" small />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <SiteMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        nav={nav}
        setPrice={setPrice}
        whatsapp={whatsapp}
        freeShippingAbove={freeShippingAbove}
      />
    </>
  );
}
