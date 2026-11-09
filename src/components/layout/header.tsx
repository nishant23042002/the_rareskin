"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  // The menu button leans a few pixels toward a mouse pointer (the ring and the
  // glyph read `--mx` / `--my`, see `.rh-hdr__burger` in home.css). Mouse only,
  // and not under reduced motion; the 44px hit box itself never moves.
  const leanToward = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.setProperty("--mx", (x * 3.5).toFixed(2));
    el.style.setProperty("--my", (y * 3.5).toFixed(2));
  };
  const leanAway = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.removeProperty("--mx");
    e.currentTarget.style.removeProperty("--my");
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
              onPointerMove={leanToward}
              onPointerLeave={leanAway}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              title="Menu"
            >
              {/* four dots, the diagonal pair larger: not the stock hamburger (styles: .rh-hdr__burger in home.css) */}
              <span className="rh-burger" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="rh-burger__label" aria-hidden="true">
                Menu
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
                onClick={() => setMegaOpen((v) => !v)}
              >
                Fragrances <RhIcon name="chevD" small />
              </button>
              <Link
                className="rh-nav-btn"
                data-nav="discovery"
                href="/discovery-set"
                aria-current={section === "discovery" ? "page" : undefined}
              >
                Discovery Set
              </Link>
              <Link
                className="rh-nav-btn rh-nav-btn--story"
                data-nav="story"
                href="/the-idea"
                aria-current={section === "story" ? "page" : undefined}
              >
                Our Story
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
        whatsapp={whatsapp}
        freeShippingAbove={freeShippingAbove}
      />
    </>
  );
}
