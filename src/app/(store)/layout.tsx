import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { RouteTransitionProvider } from "@/components/providers/route-transition";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SignInModalMount } from "@/components/auth/sign-in-modal-mount";
import { SignInAutoPrompt } from "@/components/auth/sign-in-auto-prompt";
import { CartProvider } from "@/components/providers/cart-provider";
import { NavToneProvider } from "@/components/providers/nav-tone";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HoldingPage } from "@/components/layout/holding-page";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartToast } from "@/components/cart/cart-toast";
import { CartBar } from "@/components/cart/cart-bar";
import { CampaignNote } from "@/components/layout/campaign-note";
import { BackToTop } from "@/components/layout/back-to-top";
import { StaffThemeSwitcher } from "@/components/auth/staff-tools";
import { MotionLayer } from "@/components/providers/motion-layer";
import { CARD_SLUGS, DEFAULT_CARD_CONCEPT, type CardSlug } from "@/config/homepage-assets";
import { DISCOVERY_SET_SLUG } from "@/lib/catalog";
import { getVariant, homeImageSrc, resolveCardAsset } from "@/lib/home-images";
import { getCatalogNav, getBagSuggestions } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/settings";
import { getCurrentUser } from "@/server/auth";

/**
 * Rendered per request, on purpose. The pre-launch / maintenance gate below lets
 * signed-in staff past a holding page, which needs the session cookie, so this
 * shell can never be a statically generated (or ISR) page: a page prerendered
 * while the store is open would keep serving the open store after
 * `maintenanceMode` is switched on (the regeneration would hit `cookies()` and
 * fail, and the stale copy would stay up). The catalogue and settings reads are
 * cached (`unstable_cache`, tagged), so a render is cheap; what keeps a visitor's
 * first paint fast is the HTML size, the critical-path bytes and the JS, not this.
 * Nothing else may make the storefront dynamic by accident any more: the root
 * `forbidden.tsx` used to (it read the session on every render, see `NoAccess`).
 */
export const dynamic = "force-dynamic";

/**
 * Storefront shell. Everything the shopper-facing site shares — providers,
 * smooth scroll, the route-transition curtain, the fixed header + announcement
 * bar, the footer, and the cart / sign-in machinery. `/admin` deliberately sits
 * in its own route group and inherits none of this.
 */
export default async function StoreLayout({
  children,
}: LayoutProps<"/">) {
  const [nav, bagSuggestions, settings] = await Promise.all([
    getCatalogNav(),
    getBagSuggestions(),
    getSiteSettings(),
  ]);

  // Pre-launch (`!storeLive`) or a planned outage (`maintenanceMode`): the whole
  // storefront becomes a holding page — except for signed-in staff, who keep
  // working the site while it's dark. `/admin` is a separate route group and is
  // never affected. (Only the closed store reads the cookie: an open one never
  // calls `getCurrentUser()`, so a signed-in shopper costs no session lookup.)
  if (settings.flags.maintenanceMode || !settings.flags.storeLive) {
    const user = await getCurrentUser();
    if (!user?.isStaff) {
      return (
        <>
          <GoogleTagManager />
          <HoldingPage settings={settings} />
        </>
      );
    }
  }

  // The launch price (first fragrance) and the Discovery Set price feed the
  // announcement bar's built-in messages and the header / sidebar copy.
  const launch = nav[0] ? { price: nav[0].price, mrp: nav[0].mrp } : null;

  // The pictures the "The Three" section of the homepage shows (the finalized card direction), for the
  // header's Fragrances dropdown: resolved here, on the server, so the header never imports the image manifest.
  const cardPics: Record<string, string> = {};
  for (const f of nav) {
    if (!(CARD_SLUGS as readonly string[]).includes(f.slug)) continue;
    const card = resolveCardAsset(f.slug as CardSlug, DEFAULT_CARD_CONCEPT);
    if (card) cardPics[f.slug] = homeImageSrc(getVariant(card).file);
  }
  const setPrice =
    bagSuggestions.find((s) => s.slug === DISCOVERY_SET_SLUG)?.price ?? null;

  // Delivery is free from `shipping.freeAbovePaise` (₹999 today; 0 = always
  // free) and costs `shipping.flatRatePaise` below it. In rupees for the bag
  // drawer, the sticky bag bar and the menu footer, so all three follow the
  // admin setting instead of repeating the number.
  const { freeAbovePaise, flatRatePaise } = settings.shipping;
  const freeShippingAbove = freeAbovePaise / 100;
  const shippingFlat = flatRatePaise / 100;

  return (
    <AuthProvider>
      <GoogleTagManager />
      <CartProvider
        suggestions={bagSuggestions}
        checkoutEnabled={settings.flags.checkoutEnabled}
      >
        <SmoothScroll>
          <RouteTransitionProvider>
            <NavToneProvider>
              <div className="fixed inset-x-0 top-0 z-50">
                <AnnouncementBar
                  messages={settings.announcements
                    .filter((a) => a.active)
                    .map((a) => ({ text: a.text, href: a.href }))}
                  rotateSeconds={settings.announcementRotateSeconds}
                  launch={launch}
                  setPrice={setPrice}
                />
                <Header
                  nav={nav}
                  pics={cardPics}
                  setPrice={setPrice}
                  whatsapp={settings.contact.whatsapp ?? settings.contact.phone}
                  freeShippingAbove={freeShippingAbove}
                />
              </div>
              {children}
              <Footer />
            </NavToneProvider>
            <CartDrawer
              freeShippingAbove={freeShippingAbove}
              shippingFlat={shippingFlat}
              codEnabled={settings.cod.enabled}
            />
            <CartToast />
            <CartBar freeShippingAbove={freeShippingAbove} />
            <BackToTop />
            {/* founder preview: the colour themes (src/config/themes.ts, app/themes.css) — signed-in staff only */}
            <StaffThemeSwitcher />
            {/* scroll reveals, card tilt, button pull: motion.css + this controller (nothing under reduced motion) */}
            <MotionLayer />
            <CampaignNote
              campaign={settings.campaign}
              products={bagSuggestions
                .filter((s) => s.fragrance)
                .slice(0, 3)
                .map((s) => ({
                  name: s.name,
                  image: s.image,
                  fragrance: s.fragrance,
                  href: s.href,
                }))}
            />
            <SignInModalMount />
            <SignInAutoPrompt />
          </RouteTransitionProvider>
        </SmoothScroll>
      </CartProvider>
    </AuthProvider>
  );
}
