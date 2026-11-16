/**
 * Reference-counted, self-healing scroll lock.
 *
 * `body.is-locked` sets `overflow: hidden` (see `globals.css`) and is also read
 * by the hero carousel to pause itself. Several overlays can want it at once —
 * the cart drawer and, stacked on top of it, the sign-in modal. A plain
 * `classList.add/remove` race would drop the lock the moment the modal closed
 * while the drawer was still open. This keeps the class present until every
 * holder has released it.
 *
 * A lock that is never released freezes the whole page: no scroll, nothing
 * moves (this is exactly what happened when an overlay was closed by someone
 * other than its owner: the route curtain closing the menu, the menu closing
 * itself for a picture flight). So a holder is only trusted while an overlay is
 * really open: whenever a dialog closes, the tab comes back, the page is shown
 * again from the back/forward cache, or a timer ticks while a lock is held, any
 * holder with no overlay left on the page is dropped. Correct flows never notice
 * (their overlay is open for as long as they hold the lock); a leaked lock lasts
 * at most about a second.
 */

/** key -> when it took the lock (ms) */
const holders = new Map<string, number>();

/** a holder younger than this is never judged: its overlay may not have opened yet */
const GRACE_MS = 600;
/** how often a held lock is checked against the page */
const WATCH_MS = 1000;

/** every kind of overlay that holds the lock: a native `<dialog>` (menu, bag, sign-in, picture viewer) or an ARIA modal (review lightbox) */
const OVERLAY = 'dialog[open], [role="dialog"][aria-modal="true"]';

let installed = false;
let watch = 0;

/** is any overlay that would justify a scroll lock on the page right now? */
export function overlayOpen(): boolean {
  return typeof document !== "undefined" && document.querySelector(OVERLAY) !== null;
}

function sync(): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("is-locked", holders.size > 0);
  if (holders.size === 0 && watch) {
    window.clearInterval(watch);
    watch = 0;
  }
}

/**
 * Drop every holder that has no overlay behind it. Safe to call at any time; the
 * page calls it on the events listed above, `PageHealth` on a timer too.
 */
export function reconcileScrollLock(): void {
  if (typeof document === "undefined") return;
  if (holders.size > 0 && !overlayOpen()) {
    const now = Date.now();
    for (const [key, since] of holders) {
      if (now - since > GRACE_MS) holders.delete(key);
    }
  }
  sync();
}

function install(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  // `close` does not bubble, but it can be captured: any <dialog> closing, by whoever closed it
  document.addEventListener("close", reconcileScrollLock, true);
  window.addEventListener("pageshow", reconcileScrollLock);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reconcileScrollLock();
  });
}

export function lockScroll(key: string): void {
  install();
  holders.set(key, Date.now());
  if (!watch && typeof window !== "undefined") {
    watch = window.setInterval(reconcileScrollLock, WATCH_MS);
  }
  sync();
}

export function unlockScroll(key: string): void {
  holders.delete(key);
  sync();
}

/**
 * Force-release every holder. The storefront and the admin share one `<body>`;
 * if a storefront overlay unmounts across a route-group navigation without
 * running its release, the lock leaks. The admin calls this on entry.
 */
export function resetScrollLock(): void {
  holders.clear();
  sync();
}
