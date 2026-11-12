"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";

/**
 * The flight: a Collection tile's picture opens into the product page's gallery picture, and flies back when you leave (browser back).
 * It replaces the route curtain for that one path, with the PDP picture viewer's own feel (`pdp-viewer.tsx`: the picture lifts and settles with
 * `cubic-bezier(0.16, 1, 0.3, 1)`, the page washes out around it). `app/morph.css` holds the timing.
 *
 * How: the browser's View Transitions API, driven by hand (React's `<ViewTransition>` does not start a transition on a back navigation, because the
 * tile is not on screen yet at the moment the old page commits). A flight names two elements the same, one on each page: the tile's picture
 * (`data-flight-tile`, `components/home/collection.tsx`) and the gallery frame (`data-flight-frame`, `components/product/pdp-gallery.tsx`); the
 * browser morphs one into the other. While the update waits for the other page the screen holds the old picture (that wait is the page being
 * fetched, usually already prefetched).
 *
 *  - OPEN: the tile's link calls `open()`; the route is pushed inside the transition's update; the update resolves when the product page is
 *    there, scrolled to its top, with its first picture decoded.
 *  - CLOSE: browser back from a product page to the homepage lifts the picture out before the router swaps the page and flies it back to its
 *    tile (a hand-driven FLIP: a view transition cannot capture the old page by then); the scroll goes back where the tile was.
 *  - No View Transitions API, or reduced motion: nothing here runs; the tile's link falls back to the route curtain (see `data-no-transition`).
 * Docs: docs/route-transition.md (the curtain) and the header of `app/morph.css`.
 */
const KEY = "rareskin:flight";
const nameOf = (slug: string) => `fragrance-${slug}`;

interface FlightCtx {
  /** start the flight for this tile; false when it cannot fly (the caller lets the link do its normal thing) */
  open: (slug: string, href: string, tile: HTMLElement) => boolean;
  canFly: () => boolean;
}

const Ctx = createContext<FlightCtx | null>(null);

export function useFlight(): FlightCtx {
  return useContext(Ctx) ?? { open: () => false, canFly: () => false };
}

function supported(): boolean {
  if (typeof document === "undefined") return false;
  if (!("startViewTransition" in document)) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// timers, NOT requestAnimationFrame: while a view transition waits for its update callback the document does not render, so rAF never fires
const frame = () => new Promise<void>((res) => setTimeout(res, 16));
async function frames(n: number) {
  for (let i = 0; i < n; i++) await frame();
}
/** resolves true when `cond()` holds, false after `ms` (a flight must never strand the page) */
async function until(cond: () => boolean, ms = 4500): Promise<boolean> {
  const t0 = performance.now();
  while (!cond()) {
    if (performance.now() - t0 > ms) return false;
    await frame();
  }
  return true;
}

function mark(el: Element | null, slug: string) {
  if (!(el instanceof HTMLElement)) return;
  el.style.setProperty("view-transition-name", nameOf(slug));
  el.style.setProperty("view-transition-class", "morph");
}
function unmark(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-flight-tile], [data-flight-frame]").forEach((n) => {
    n.style.removeProperty("view-transition-name");
    n.style.removeProperty("view-transition-class");
  });
}

export function PdpFlightProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  });

  const scrollTo = useCallback((y: number) => {
    const l = lenisRef.current;
    if (l) l.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, []);

  const finish = useCallback((vt: ViewTransition) => {
    const done = () => {
      unmark();
      delete document.documentElement.dataset.flight;
    };
    vt.finished.then(done, done);
  }, []);

  const open = useCallback(
    (slug: string, href: string, tile: HTMLElement) => {
      if (!supported()) return false;
      const path = new URL(href, window.location.origin).pathname;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ slug, y: window.scrollY, from: window.location.pathname }));
      } catch {
        /* the reverse flight then lands at the top of the page: fine */
      }
      document.documentElement.dataset.flight = "in";
      mark(tile, slug);
      const vt = document.startViewTransition(async () => {
        router.push(href);
        const there = await until(() => window.location.pathname === path && !!document.querySelector(`[data-flight-frame="${slug}"]`));
        if (!there) return;
        scrollTo(0);
        const target = document.querySelector<HTMLElement>(`[data-flight-frame="${slug}"]`);
        mark(target, slug);
        // the first picture decoded, so the landing is not a pop
        const img = target?.querySelector("img");
        if (img && !img.complete) await Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 700))]);
        await frames(2);
      });
      finish(vt);
      return true;
    },
    [router, scrollTo, finish],
  );

  // closing: browser back from a product page to the homepage. A view transition cannot do this one: by the time the browser captures the "old"
  // page the router has already swapped it. So the picture is lifted out BEFORE the swap (the Navigation API's `navigate` event fires while the
  // product page is still on screen; `popstate` is the fallback): a fixed copy of the picture stays at its place over a wash in the page colour
  // that hides the swap, then flies to the tile (same easing, 640 ms) while the wash lifts and the tile's own picture takes over.
  useEffect(() => {
    let live: { stop: () => void } | null = null;
    const start = (destPath: string) => {
      if (live || !supported() || destPath !== "/") return;
      const from = document.querySelector<HTMLElement>("[data-flight-frame]");
      if (!from) return;
      const slug = from.dataset.flightFrame ?? "";
      const img = from.querySelector<HTMLImageElement>("img");
      const rect = from.getBoundingClientRect();
      if (!img || rect.width < 40 || rect.bottom < 0 || rect.top > window.innerHeight) return;
      let y: number | null = null;
      try {
        const saved = JSON.parse(sessionStorage.getItem(KEY) || "null") as { slug: string; y: number } | null;
        if (saved && saved.slug === slug) y = saved.y;
      } catch {
        /* none */
      }
      const wash = document.createElement("div");
      wash.setAttribute("aria-hidden", "true");
      wash.style.cssText = `position:fixed;inset:0;z-index:90;pointer-events:none;background:${getComputedStyle(document.body).backgroundColor || "#f2f1ed"}`;
      const fly = document.createElement("div");
      fly.setAttribute("aria-hidden", "true");
      fly.style.cssText = `position:fixed;z-index:91;pointer-events:none;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border-radius:3px;background:center/cover no-repeat url("${img.currentSrc || img.src}")`;
      document.body.append(wash, fly);
      let dead = false;
      const clean = (tile?: HTMLElement | null) => {
        if (dead) return;
        dead = true;
        wash.remove();
        fly.remove();
        tile?.getAnimations().forEach((an) => an.cancel());
        live = null;
      };
      live = { stop: () => clean() };
      void (async () => {
        const home = await until(() => window.location.pathname === "/" && !!document.querySelector(`[data-flight-tile="${slug}"]`));
        const tile = document.querySelector<HTMLElement>(`[data-flight-tile="${slug}"]`);
        if (dead) return;
        if (!home || !tile) return clean(tile);
        if (y != null) scrollTo(y);
        await frames(3);
        const to = tile.getBoundingClientRect();
        if (to.bottom < 0 || to.top > window.innerHeight) return clean(tile); // the tile is not on screen: just let the page in
        const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
        const box = (r: { left: number; top: number; width: number; height: number }, opacity: number, offset?: number) => ({
          left: `${r.left}px`,
          top: `${r.top}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          opacity,
          ...(offset != null ? { offset } : {}),
        });
        const move = fly.animate([box(rect, 1), box(to, 1, 0.7), box(to, 0)], { duration: 640, easing: ease, fill: "forwards" });
        wash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 460, delay: 90, easing: "ease", fill: "forwards" });
        tile.animate([{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 640, easing: "ease", fill: "both" });
        await move.finished.catch(() => undefined);
        clean(tile);
      })();
      // never strand the page
      window.setTimeout(() => clean(document.querySelector<HTMLElement>(`[data-flight-tile="${slug}"]`)), 6000);
    };
    const nav = (window as unknown as { navigation?: EventTarget }).navigation;
    const onNavigate = (e: Event) => {
      const ev = e as Event & { navigationType?: string; destination?: { url: string } };
      if (ev.navigationType !== "traverse" || !ev.destination) return;
      start(new URL(ev.destination.url).pathname);
    };
    const onPop = () => start(window.location.pathname);
    if (nav) nav.addEventListener("navigate", onNavigate);
    else window.addEventListener("popstate", onPop);
    return () => {
      live?.stop();
      if (nav) nav.removeEventListener("navigate", onNavigate);
      else window.removeEventListener("popstate", onPop);
    };
  }, [scrollTo]);

  const value = useMemo<FlightCtx>(() => ({ open, canFly: supported }), [open]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
