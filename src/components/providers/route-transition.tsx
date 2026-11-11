"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";

import { Logo } from "@/components/ui/logo";
import { FRAGRANCE_PALETTE, isFragranceSlug } from "@/lib/catalog";

/**
 * "The Aperture" — the route transition for THE RARESKIN.
 *
 * On every in-app navigation an obsidian curtain (the announcement bar's own
 * `--onyx`) closes toward the point you tapped, holds for a beat on the wordmark
 * and the rule, then parts from that same seam to reveal the next page. On the
 * way to a fragrance the rule becomes that scent's own colour and its name
 * appears. Styling: `app/route-transition.css`; behaviour: this file.
 *
 * Built to stay smooth on a phone while Next renders the next route:
 *
 *  - Every pixel that moves is `transform` / `opacity` run through the Web
 *    Animations API, which the browser animates on the compositor thread. GSAP and
 *    CSS-in-JS tickers both step on the main thread, which is exactly the thread
 *    busy rendering the new page: that is where the old curtain stuttered.
 *  - No React state: the curtain is driven imperatively, so a click costs no
 *    re-render of the provider or of anything that reads its context.
 *  - It is a `popover="manual"`, so it lives in the top layer, above an open modal
 *    <dialog> (menu, bag, sign-in). The drawer stays visible under the closing
 *    curtain instead of being snapped shut first; dialogs are closed once the
 *    curtain is opaque.
 *
 * Choreography (the phase machine never trusts an animation clock alone, so a
 * throttled tab or a stalled compositor can delay the curtain but never strand it):
 *
 *   click ─ cover ──────────────┐
 *            └ push (at ~150ms) │   the page is not swapped while the gap is wide
 *                               ├─ covered AND arrived ─ settle frames ─ images
 *   route committed ────────────┘   decoded ─ min hold ─ reveal ─ done
 *
 * "Arrived" is the URL leaving where it started (not equal to the target), so a
 * redirect (`/about` -> `/the-idea`, a signed-out `/account` -> `/?signin=1`) is
 * handled; an 8s ceiling lifts the curtain if a navigation never commits.
 */

interface Point {
  x: number;
  y: number;
}

interface RouteTransitionValue {
  /**
   * Navigate with the curtain (for programmatic navigation). `from` is where it
   * closes (viewport px); it defaults to the last pointer position, or the centre.
   */
  navigate: (href: string, from?: Point) => void;
}

const RouteTransitionContext = createContext<RouteTransitionValue | null>(null);

// outside the provider (the admin) a "transition" is a plain navigation
const FALLBACK: RouteTransitionValue = {
  navigate: (href) => {
    window.location.assign(href);
  },
};

export function useRouteTransition(): RouteTransitionValue {
  return useContext(RouteTransitionContext) ?? FALLBACK;
}

// ── timings (ms) ─────────────────────────────────────────────────────────────

const FULL = {
  cover: 360, // the halves meet
  push: 150, // router.push: by now the gap is a thin band, so a quick route swap is not seen
  hold: 120, // least time fully closed: the wordmark needs a beat
  lift: 60, // the curtain waits this long after the wordmark starts to leave
  reveal: 440, // the halves part
} as const;
const SOFT = { cover: 160, push: 80, hold: 60, lift: 0, reveal: 200 } as const; // reduced motion: a dissolve
type Timing = typeof FULL | typeof SOFT;

/** never keep the curtain up longer than this if the route does not commit */
const NAV_TIMEOUT_MS = 8000;
/** the most the reveal waits for the above-the-fold pictures of the new page */
const IMAGE_WAIT_MS = 700;
/** a link slower than this gets the "working" glint along the rule */
const WAITING_AFTER_MS = 280;

const EASE_COVER = "cubic-bezier(0.32, 0.72, 0, 1)"; // fast off the tap, long settle (--ease-drawer)
const EASE_REVEAL = "cubic-bezier(0.76, 0, 0.24, 1)"; // in-out: the gap opens gently, then lifts
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

const HOME = "translate3d(0, 0, 0)";
const UP = "translate3d(0, -101%, 0)";
const DOWN = "translate3d(0, 101%, 0)";

/** `.pdf`, `.xml`, `.png` ...: a file, not a page */
const FILE_LIKE = /\.[a-z0-9]{2,5}$/i;

// ── what the curtain is for ─────────────────────────────────────────────────

/**
 * Does this URL get the curtain? Not: another origin, the same route (a search /
 * hash change), the admin (its own shell: the storefront layout, and the curtain
 * with it, unmounts on arrival), route handlers and files (a download never
 * commits a new route, so the curtain would wait out its ceiling).
 */
function wantsCurtain(url: URL): boolean {
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname) return false;
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return false;
  if (url.pathname.startsWith("/api/")) return false;
  return !FILE_LIKE.test(url.pathname);
}

function describe(pathname: string): { rule: string; label: string } {
  const m = pathname.match(/^\/fragrances\/([^/?#]+)/);
  if (m && isFragranceSlug(m[1])) {
    const p = FRAGRANCE_PALETTE[m[1]];
    return { rule: p.juice, label: p.name };
  }
  return { rule: "", label: "" };
}

// ── small utilities ─────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** the next painted frame, but never waits on a throttled rAF (hidden tab) */
function frame(): Promise<void> {
  return new Promise((resolve) => {
    let spent = false;
    const go = () => {
      if (!spent) {
        spent = true;
        resolve();
      }
    };
    requestAnimationFrame(go);
    window.setTimeout(go, 80);
  });
}

/** an animation's end, bounded: a stalled timeline resolves on a timer instead */
function ends(a: Animation, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = window.setTimeout(resolve, ms + 300);
    const done = () => {
      window.clearTimeout(t);
      resolve();
    };
    a.finished.then(done, done); // rejects when cancelled
  });
}

function byHash(hash: string): HTMLElement | null {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    /* use it as written */
  }
  return id ? document.getElementById(id) : null;
}

/**
 * Pictures of the new page that are on screen but not decoded yet: lifting the
 * curtain on a hero that then pops in is the flash this exists to prevent.
 */
async function picturesReady(): Promise<void> {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pending: Promise<unknown>[] = [];
  for (const img of Array.from(document.images)) {
    if (img.complete && img.naturalWidth > 0) continue;
    const r = img.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
    pending.push(img.decode().catch(() => undefined));
  }
  if (pending.length === 0) return;
  await Promise.race([Promise.all(pending), sleep(IMAGE_WAIT_MS)]);
}

// ── the curtain ─────────────────────────────────────────────────────────────

type LenisInstance = NonNullable<ReturnType<typeof useLenis>>;

interface Deps {
  push: (href: string) => void;
  lenis: () => LenisInstance | undefined;
}

interface Run {
  href: string;
  hash: string;
  /** where the URL started: leaving it means the route committed */
  fromKey: string;
  reduced: boolean;
  t: Timing;
  /** cover: closing / waiting for the route · ready: revealing is being prepared · reveal: lifting */
  phase: "cover" | "ready" | "reveal";
  covered: boolean;
  arrived: boolean;
  /** the route never committed: lift the curtain without touching the scroll position */
  timedOut: boolean;
  coveredAt: number;
  dead: boolean;
  anims: Animation[];
  timers: number[];
  poll: number;
}

function createCurtain(root: HTMLElement, deps: Deps) {
  const part = (name: string) => root.querySelector<HTMLElement>(`[data-rt="${name}"]`);
  const dim = part("dim");
  const top = part("top");
  const bottom = part("bottom");
  const seam = part("seam");
  const glint = part("glint");
  const mark = part("mark");
  const rule = part("rule");
  const label = part("label");
  if (!dim || !top || !bottom || !seam || !glint || !mark || !rule || !label) return null;

  const hasTopLayer = typeof root.showPopover === "function";
  let run: Run | null = null;

  const later = (r: Run, fn: () => void, ms: number) => {
    r.timers.push(
      window.setTimeout(() => {
        if (!r.dead) fn();
      }, ms),
    );
  };

  const play = (
    r: Run,
    el: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Animation => {
    const a = el.animate(frames, { fill: "both", ...options });
    r.anims.push(a);
    return a;
  };

  const topLayer = (on: boolean) => {
    if (!hasTopLayer) return;
    try {
      const open = root.matches(":popover-open");
      if (on && !open) root.showPopover();
      else if (!on && open) root.hidePopover();
    } catch {
      /* already in the state we wanted */
    }
  };

  const closeDialogs = () => {
    document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((d) => {
      try {
        d.close();
      } catch {
        /* gone already */
      }
    });
  };

  /** top of the new page, or its `#anchor` — the curtain, not the router, has the last word on scroll */
  const restoreScroll = (r: Run) => {
    if (r.timedOut) return;
    const anchor = r.hash.length > 1 ? byHash(r.hash) : null;
    if (anchor) {
      anchor.scrollIntoView({ block: "start", behavior: "instant" });
      return;
    }
    // Lenis ignores scrollTo while stopped (the curtain stops it) unless it is forced
    deps.lenis()?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  const finish = (r: Run) => {
    if (r.dead) return;
    r.dead = true;
    r.timers.forEach((id) => window.clearTimeout(id));
    window.clearInterval(r.poll);
    root.classList.remove("is-leaving", "is-waiting", "is-closed", "is-reduced");
    delete root.dataset.open;
    topLayer(false);
    r.anims.forEach((a) => a.cancel());
    document.body.classList.remove("route-locked");
    // a drawer opened during the lift owns the scroll lock now
    if (!document.querySelector("dialog[open]")) deps.lenis()?.start();
    if (run === r) run = null;
  };

  const reveal = async (r: Run) => {
    const { t } = r;
    // behind the curtain: scroll to the top (the announcement bar and header re-expand
    // out of sight), let the new page paint, wait for its pictures
    restoreScroll(r);
    await frame();
    await frame();
    if (r.dead) return;
    await picturesReady();
    if (r.dead) return;
    const rest = r.coveredAt + t.hold - performance.now();
    if (rest > 0) await sleep(rest);
    if (r.dead) return;
    restoreScroll(r); // a late image may have moved the anchor

    r.phase = "reveal";
    root.classList.remove("is-waiting", "is-closed");
    root.classList.add("is-leaving"); // the page is live as soon as it starts to lift

    let lift: Animation;
    if (r.reduced) {
      lift = play(r, root, [{ opacity: 1 }, { opacity: 0 }], {
        duration: t.reveal,
        easing: "ease-in-out",
      });
    } else {
      const opts = { duration: t.reveal, delay: t.lift, easing: EASE_REVEAL };
      lift = play(r, top, [{ transform: HOME }, { transform: UP }], opts);
      play(r, bottom, [{ transform: HOME }, { transform: DOWN }], opts);
      play(r, dim, [{ opacity: 0.5 }, { opacity: 0 }], {
        duration: t.reveal,
        delay: t.lift,
        easing: "ease-out",
      });
      play(
        r,
        mark,
        [
          { opacity: 1, transform: HOME },
          { opacity: 0, transform: "translate3d(0, -10px, 0)" },
        ],
        { duration: 200, easing: "ease-in" },
      );
      // the hairline flares in the gap as it opens
      play(
        r,
        seam,
        [
          { opacity: 0, transform: "scaleX(0.4)" },
          { opacity: 0.9, transform: "scaleX(1)", offset: 0.35 },
          { opacity: 0, transform: "scaleX(1)" },
        ],
        { duration: 420, delay: t.lift, easing: "ease-out" },
      );
    }
    await ends(lift, t.reveal + t.lift);
    finish(r);
  };

  const advance = (r: Run) => {
    if (r.phase !== "cover" || !r.covered || !r.arrived) return;
    r.phase = "ready";
    void reveal(r);
  };

  const arrive = (r: Run) => {
    if (r.arrived) return;
    r.arrived = true;
    window.clearInterval(r.poll);
    advance(r);
  };

  /** has the route committed? (the URL moves in the same commit as the new page) */
  const check = () => {
    const r = run;
    if (!r || r.arrived) return;
    if (window.location.pathname + window.location.search !== r.fromKey) arrive(r);
  };

  const onCovered = (r: Run) => {
    if (r.covered) return;
    r.covered = true;
    r.coveredAt = performance.now();
    root.classList.add("is-closed");
    // fully opaque now: a drawer that was open under the closing curtain can go
    if (hasTopLayer) closeDialogs();
    later(
      r,
      () => {
        if (r.phase === "cover") root.classList.add("is-waiting");
      },
      WAITING_AFTER_MS,
    );
    advance(r);
  };

  const navigate = (r: Run) => {
    try {
      deps.push(r.href);
    } catch {
      window.location.assign(r.href);
      return;
    }
    r.poll = window.setInterval(check, 32);
    check();
  };

  const start = (href: string, from: Point) => {
    if (run) return;
    const url = new URL(href, window.location.href);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t: Timing = reduced ? SOFT : FULL;
    const r: Run = {
      href: url.pathname + url.search + url.hash,
      hash: url.hash,
      fromKey: window.location.pathname + window.location.search,
      reduced,
      t,
      phase: "cover",
      covered: false,
      arrived: false,
      timedOut: false,
      coveredAt: 0,
      dead: false,
      anims: [],
      timers: [],
      poll: 0,
    };
    run = r;

    // what it says: the scent's colour and name on the way to a fragrance
    const d = describe(url.pathname);
    if (d.rule) root.style.setProperty("--rule", d.rule);
    else root.style.removeProperty("--rule");
    label.textContent = d.label;
    label.hidden = !d.label;

    // where it closes: the tap's Y is the seam, the tap's X is where the hairline draws from
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    root.style.setProperty("--seam-y", `${Math.round(clamp(from.y, vh * 0.12, vh * 0.88))}px`);
    root.style.setProperty("--seam-x", `${Math.round(clamp(from.x, 0, vw))}px`);
    root.classList.toggle("is-reduced", reduced);
    root.classList.remove("is-leaving", "is-waiting", "is-closed");
    root.dataset.open = "";
    topLayer(true);

    document.body.classList.add("route-locked");
    deps.lenis()?.stop();
    // without a top layer a modal dialog would sit above the curtain: close them first
    if (!hasTopLayer) closeDialogs();

    let closing: Animation;
    if (reduced) {
      closing = play(r, root, [{ opacity: 0 }, { opacity: 1 }], {
        duration: t.cover,
        easing: "ease-out",
      });
      play(r, mark, [{ opacity: 0 }, { opacity: 1 }], { duration: t.cover, easing: "ease-out" });
    } else {
      const c = t.cover;
      const opts = { duration: c, easing: EASE_COVER };
      play(r, dim, [{ opacity: 0 }, { opacity: 0.5 }], { duration: c, easing: "ease-out" });
      closing = play(r, top, [{ transform: UP }, { transform: HOME }], opts);
      play(r, bottom, [{ transform: DOWN }, { transform: HOME }], opts);
      // the glow where the finger landed
      play(
        r,
        glint,
        [
          { opacity: 0, transform: "scale(0.35)" },
          { opacity: 0.9, transform: "scale(1)", offset: 0.3 },
          { opacity: 0, transform: "scale(1.9)" },
        ],
        { duration: 620, easing: EASE_OUT },
      );
      // the hairline draws outward from the tap and flashes as the halves meet
      play(
        r,
        seam,
        [
          { opacity: 0, transform: "scaleX(0.2)" },
          { opacity: 1, transform: "scaleX(1)", offset: 0.55 },
          { opacity: 0, transform: "scaleX(1)" },
        ],
        { duration: c + 160, easing: "ease-out" },
      );
      play(
        r,
        mark,
        [
          { opacity: 0, transform: "translate3d(0, 10px, 0)" },
          { opacity: 1, transform: HOME },
        ],
        { duration: 320, delay: c - 190, easing: EASE_OUT },
      );
      play(r, rule, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration: 420,
        delay: c - 170,
        easing: EASE_OUT,
      });
    }

    void ends(closing, t.cover).then(() => {
      if (!r.dead) onCovered(r);
    });
    later(r, () => navigate(r), t.push);
    later(
      r,
      () => {
        r.timedOut = true;
        arrive(r);
      },
      NAV_TIMEOUT_MS,
    );
  };

  return {
    start,
    check,
    /**
     * Back / forward before the route committed: nothing is coming (the router drops
     * the pending push), so lift the curtain now rather than at the ceiling. The
     * browser restores the scroll position itself, so ours is left alone.
     */
    interrupt: () => {
      const r = run;
      if (!r || r.arrived) return;
      r.timedOut = true;
      arrive(r);
    },
    /** idle · busy (closing or waiting: swallow clicks) · revealing (the page is live again) */
    status: (): "idle" | "busy" | "revealing" =>
      !run ? "idle" : run.phase === "reveal" ? "revealing" : "busy",
    abort: () => {
      if (run) finish(run);
    },
  };
}

type Curtain = NonNullable<ReturnType<typeof createCurtain>>;

// ── provider ────────────────────────────────────────────────────────────────

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();

  const rootRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<Curtain | null>(null);
  const routerRef = useRef(router);
  const lenisRef = useRef(lenis);
  const pointerRef = useRef<(Point & { at: number }) | null>(null);
  /** the live `navigate`, bound once the curtain exists; until then a plain push */
  const apiRef = useRef<((href: string, from?: Point) => void) | null>(null);

  useEffect(() => {
    routerRef.current = router;
    lenisRef.current = lenis;
  });

  // a committed route: look right away instead of waiting for the next poll
  useEffect(() => {
    curtainRef.current?.check();
  }, [pathname]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const curtain = createCurtain(root, {
      push: (href) => routerRef.current.push(href),
      lenis: () => lenisRef.current,
    });
    if (!curtain) return;
    curtainRef.current = curtain;

    const origin = (): Point => {
      const p = pointerRef.current;
      if (p && performance.now() - p.at < 2500) return { x: p.x, y: p.y };
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, at: performance.now() };
    };

    // Intercepts internal links before Next's <Link> sees them (capture phase), so the
    // curtain can start on the same frame as the tap. Anything it declines (another
    // origin, a file, the admin, a hash on this page) is left to the browser / Link.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const a = target?.closest("a");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download") || a.closest("[data-no-transition]")) return;
      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("#") || /^(mailto|tel|sms|javascript):/i.test(raw)) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (!wantsCurtain(url)) return;

      const status = curtain.status();
      if (status === "revealing") return; // the page is live again: a plain navigation
      e.preventDefault();
      if (status === "busy") return; // one navigation at a time

      let from: Point = { x: e.clientX, y: e.clientY };
      if (e.detail === 0) {
        // keyboard / synthetic click: there is no pointer position, close on the link
        const r = a.getBoundingClientRect();
        from = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      curtain.start(url.pathname + url.search + url.hash, from);
    };

    // restored from the back/forward cache with the curtain still up
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) curtain.abort();
    };

    const onPopState = () => curtain.interrupt();

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);

    apiRef.current = (href, from) => {
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        routerRef.current.push(href);
        return;
      }
      if (url.origin !== window.location.origin) {
        window.location.assign(url.href);
        return;
      }
      const path = url.pathname + url.search + url.hash;
      if (!wantsCurtain(url)) {
        routerRef.current.push(path);
        return;
      }
      if (curtain.status() !== "idle") return;
      curtain.start(path, from ?? origin());
    };

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
      apiRef.current = null;
      curtainRef.current = null;
      curtain.abort();
    };
  }, []);

  const navigate = useCallback((href: string, from?: Point) => {
    if (apiRef.current) apiRef.current(href, from);
    else routerRef.current.push(href);
  }, []);
  const value = useMemo(() => ({ navigate }), [navigate]);

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}

      {/* popover="manual": the top layer, above any open modal <dialog>; closed, it is display:none */}
      <div ref={rootRef} className="rh-curtain" popover="manual" aria-hidden="true">
        <div data-rt="dim" className="rh-curtain__dim" />
        <div data-rt="top" className="rh-curtain__half rh-curtain__half--top" />
        <div data-rt="bottom" className="rh-curtain__half rh-curtain__half--bottom" />
        <i data-rt="seam" className="rh-curtain__seam" />
        <i data-rt="glint" className="rh-curtain__glint" />
        <div className="rh-curtain__stage">
          <div data-rt="mark" className="rh-curtain__mark">
            <Logo className="rh-curtain__logo" />
            <span className="rh-curtain__track">
              <span data-rt="rule" className="rh-curtain__rule" />
            </span>
            <span data-rt="label" className="rh-curtain__label" hidden />
          </div>
        </div>
      </div>
    </RouteTransitionContext.Provider>
  );
}
