"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/providers/cart-provider";
import { itemFromSuggestion, selectItem, track } from "@/lib/analytics";
import { DISCOVERY_SET_SLUG } from "@/lib/catalog";

/**
 * Site-wide GA4 listeners, mounted once in the storefront layout (inside the cart
 * provider, which already holds the catalogue). Renders nothing.
 *
 *  1. `select_item` — any click on a link to a product page (`/fragrances/<slug>`,
 *     `/discovery-set`), wherever it is: a card, the hero, the menu, the footer. One
 *     capture-phase listener instead of a handler on every card, so the picture-flight
 *     links (which `preventDefault` and navigate themselves) are counted too.
 *  2. `select_promotion` — a click on anything marked `data-ga-promo="<name>"`
 *     (optionally `data-ga-slot="<where>"`). `view_promotion` — the same elements
 *     when they also carry `data-ga-view`, once per page view, at 50% visible.
 *  3. `contact_click` — wa.me / mailto: / tel: links, tagged with where they sit.
 */

/** the home page's sections, by id, in the words the reports should show */
const SECTION_LISTS: Record<string, string> = {
  collection: "The Three",
  focus: "In Focus",
  discovery: "Discovery Set",
  quiz: "Quiz result",
  offer: "Launch offer",
  why: "Why extrait",
  founder: "Founder note",
};

/** Where on the page a link sits — the reports' `item_list_name` / `link_location`. */
function placeOf(el: Element): string {
  const tagged = el.closest("[data-ga-list]")?.getAttribute("data-ga-list");
  if (tagged) return tagged;
  const dialog = el.closest("dialog");
  if (dialog) return dialog.getAttribute("aria-label") === "Menu" ? "Menu drawer" : "Bag drawer";
  if (el.closest("header")) return "Header";
  if (el.closest("footer")) return "Footer";
  const section = el.closest("section[id]");
  if (section) return SECTION_LISTS[section.id] ?? section.id;
  const { pathname } = window.location;
  if (pathname.startsWith("/fragrances/")) return "Product page";
  return pathname === "/" ? "Home" : "Site";
}

const PRODUCT_PATH = /^\/(?:fragrances\/([a-z0-9-]+)|(discovery-set))\/?$/;

export function AnalyticsRoot() {
  const { suggestions } = useCart();
  // the listener reads the latest catalogue without being re-attached on every change
  const catalog = useRef(suggestions);
  useEffect(() => {
    catalog.current = suggestions;
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;

      // 3. contact links
      const raw = a.getAttribute("href") ?? "";
      const contact = /^mailto:/i.test(raw)
        ? "email"
        : /^tel:/i.test(raw)
          ? "phone"
          : /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(raw)
            ? "whatsapp"
            : null;
      if (contact) {
        track("contact_click", { contact_method: contact, link_location: placeOf(a) });
        return;
      }

      // 2. promotions
      const promo = a.closest("[data-ga-promo]");
      if (promo) {
        const name = promo.getAttribute("data-ga-promo") ?? "";
        track("select_promotion", {
          promotion_id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          promotion_name: name,
          creative_slot: promo.getAttribute("data-ga-slot") ?? placeOf(promo),
        });
      }

      // 1. product links (same-origin only; a link to the page you are already on is not a choice)
      if (a.origin !== window.location.origin || a.pathname === window.location.pathname) return;
      const m = PRODUCT_PATH.exec(a.pathname);
      if (!m) return;
      const slug = m[1] ?? DISCOVERY_SET_SLUG;
      const product = catalog.current.find((s) => s.slug === slug);
      if (!product) return;
      const list = placeOf(a);
      selectItem(list, itemFromSuggestion(product, list));
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // view_promotion: elements that opt in with `data-ga-view`, once each per page view
  // (re-armed on every route change; the layout itself outlives navigations).
  const pathname = usePathname();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          io.unobserve(en.target);
          const name = en.target.getAttribute("data-ga-promo") ?? "";
          track(
            "view_promotion",
            {
              promotion_id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              promotion_name: name,
              creative_slot: en.target.getAttribute("data-ga-slot") ?? placeOf(en.target),
            },
            `view_promotion:${name}`,
          );
        }
      },
      { threshold: 0.5 },
    );
    // a beat after the route change, so the new page has mounted
    const t = window.setTimeout(() => {
      document.querySelectorAll("[data-ga-promo][data-ga-view]").forEach((el) => io.observe(el));
    }, 300);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
