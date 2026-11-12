"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";

/**
 * The flight: a picture on the homepage (a Collection tile, the hero's bottles, an In Focus scene, the Discovery Set, the Fragrances menu, the offer card)
 * opens into the product page's gallery picture, and flies back when you leave (browser back).
 * It replaces the route curtain for those links (every other link keeps the curtain), with the PDP picture viewer's own feel (`pdp-viewer.tsx`: the picture lifts and settles with
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

interface FlightOpts {
  /**
   * runs inside the transition's update, once the product page is there and before the new picture is captured: a menu or card closes itself here,
   * after the old state was captured (closing it earlier would make the picture leave with it)
   */
  after?: () => void | Promise<void>;
  /** names the source for the flight back (`[data-flight-src="<id>"]` on the homepage); without one the Collection tile of the fragrance is used */
  id?: string;
  /**
   * the source is a region of a bigger picture (the hero: three bottles in one photograph): `tile` is the box over the region (the bottle column) and
   * this is the picture. A fixed copy of just that region is drawn over it, and the copy is what flies.
   */
  ghost?: HTMLImageElement | null;
  /**
   * with `ghost`: the picture fills the box (a thumbnail, `object-fit: cover`) rather than being a bigger photograph the box looks onto. Also the way to fly out of
   * something that cannot hold a named element itself: the menu drawer is a modal dialog (top layer), whose contents the browser refuses to animate.
   */
  fill?: boolean;
}

interface FlightCtx {
  /** start the flight for this source; false when it cannot fly (the caller lets the link do its normal thing) */
  open: (slug: string, href: string, tile: HTMLElement, opts?: FlightOpts) => boolean;
  canFly: () => boolean;
}

const Ctx = createContext<FlightCtx | null>(null);

export function useFlight(): FlightCtx {
  return useContext(Ctx) ?? { open: () => false, canFly: () => false };
}

/** an ordinary left click (not a new-tab / new-window click): the only kind that flies */
export function isPlainClick(e: { defaultPrevented: boolean; button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
}

/** whether the flight can run here (false on the server and on the first client render, so hydration matches): put on a link as `data-no-transition` */
export function useCanFly(): boolean {
  return useSyncExternalStore(
    () => () => {},
    supported,
    () => false,
  );
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

/** a fixed copy of the part of `img` that lies under `box`, drawn over it (the hero bottle, cut out of the one big photograph) */
function makeGhost(box: HTMLElement, img: HTMLImageElement, fill = false): HTMLElement | null {
  const b = box.getBoundingClientRect();
  const i = img.getBoundingClientRect();
  const left = Math.max(b.left, 0);
  const top = Math.max(b.top, 0);
  const right = Math.min(b.right, window.innerWidth);
  const bottom = Math.min(b.bottom, window.innerHeight);
  if (right - left < 24 || bottom - top < 24 || !(img.currentSrc || img.src)) return null;
  const g = document.createElement("div");
  g.setAttribute("aria-hidden", "true");
  g.dataset.flightGhost = "";
  const src = img.currentSrc || img.src;
  let bg = `url("${src}") ${i.left - left}px ${i.top - top}px / ${i.width}px ${i.height}px no-repeat`;
  if (fill) {
    const cs = getComputedStyle(img);
    const size = cs.objectFit === "contain" || cs.objectFit === "scale-down" ? "contain" : cs.objectFit === "fill" ? "100% 100%" : "cover";
    bg = `url("${src}") ${cs.objectPosition} / ${size} no-repeat`;
  }
  g.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px;z-index:60;pointer-events:none;overflow:hidden;background:${bg}`;
  document.body.append(g);
  return g;
}

function mark(el: Element | null, slug: string) {
  if (!(el instanceof HTMLElement)) return;
  el.dataset.flightMarked = "";
  el.style.setProperty("view-transition-name", nameOf(slug));
  el.style.setProperty("view-transition-class", "morph");
}
function unmark(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-flight-marked], [data-flight-tile], [data-flight-frame], [data-flight-offer]").forEach((n) => {
    n.style.removeProperty("view-transition-name");
    n.style.removeProperty("view-transition-class");
    delete n.dataset.flightMarked;
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
    (slug: string, href: string, tile: HTMLElement, opts?: FlightOpts) => {
      if (!supported()) return false;
      const ghost = opts?.ghost ? makeGhost(tile, opts.ghost, opts.fill) : null;
      if (opts?.ghost && !ghost) return false; // nothing of the picture is on screen to fly
      const from = ghost ?? tile;
      const path = new URL(href, window.location.origin).pathname;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ slug, y: window.scrollY, from: window.location.pathname, id: opts?.id ?? null }));
      } catch {
        /* the reverse flight then lands at the top of the page: fine */
      }
      document.documentElement.dataset.flight = "in";
      mark(from, slug);
      const vt = document.startViewTransition(async () => {
        ghost?.remove();
        const closing = Promise.resolve(opts?.after?.()).catch(() => undefined);
        router.push(href);
        const there = await until(() => window.location.pathname === path && !!document.querySelector(`[data-flight-frame="${slug}"]`));
        if (!there) {
          await closing;
          return;
        }
        scrollTo(0);
        const target = document.querySelector<HTMLElement>(`[data-flight-frame="${slug}"]`);
        mark(target, slug);
        // the first picture decoded, so the landing is not a pop
        const img = target?.querySelector("img");
        if (img && !img.complete) await Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 700))]);
        await closing;
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
      if (slug === "discovery-set") return; // that page's frame is a stage of three layers, not one picture
      const img = from.querySelector<HTMLImageElement>("img");
      const rect = from.getBoundingClientRect();
      if (!img || rect.width < 40 || rect.bottom < 0 || rect.top > window.innerHeight) return;
      let y: number | null = null;
      let srcId: string | null = null;
      try {
        const saved = JSON.parse(sessionStorage.getItem(KEY) || "null") as { slug: string; y: number; id?: string | null } | null;
        if (saved && saved.slug === slug) {
          y = saved.y;
          srcId = saved.id ?? null;
        }
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
      const findTile = () =>
        (srcId ? document.querySelector<HTMLElement>(`[data-flight-src="${srcId}"]`) : null) ?? document.querySelector<HTMLElement>(`[data-flight-tile="${slug}"]`);
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
        const home = await until(() => window.location.pathname === "/" && !!document.querySelector("[data-flight-tile]"));
        if (dead) return;
        // no picture to fly to (the source was a menu, or it is off screen): the wash lifts and the page is simply there
        const letIn = async () => {
          await wash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease", fill: "forwards" }).finished.catch(() => undefined);
          clean();
        };
        if (!home) return clean();
        if (y != null) scrollTo(y);
        await frames(3);
        const tile = findTile();
        if (!tile) return void (await letIn());
        const to = tile.getBoundingClientRect();
        if (to.bottom < 0 || to.top > window.innerHeight || to.right < 0 || to.left > window.innerWidth || getComputedStyle(tile).visibility === "hidden") {
          return void (await letIn());
        }
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
      window.setTimeout(() => clean(findTile()), 6000);
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
