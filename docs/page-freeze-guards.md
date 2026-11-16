# Page-freeze guards (scroll lock, curtain, picture flight)

A page that stops scrolling and stops responding is the worst failure a storefront can have, and on a phone it is
indistinguishable from the site being down. This is what caused it once, and what now guarantees it cannot recur.

## The incident (2026-11-16)

Reported: after some navigation, mostly on mobile, the live site stopped scrolling and felt dead.

Reproduced on the live site in a phone viewport: open the menu drawer, tap a fragrance row (or the Discovery Set card),
land on the product page. `body.is-locked` (`overflow: hidden`) was still set with no dialog open, and a wheel / swipe
scroll did nothing. It stayed for the whole session, across every route, until the menu happened to be opened and closed
again.

**Cause.** The scroll lock is reference-counted (`lib/scroll-lock.ts`). Its owner released it only on the path where the
owner itself closed the `<dialog>` (`hooks/use-slide-dialog.ts`, and only `else if (dlg.open)`). The menu's picture
flight closes the dialog itself (`site-menu.tsx`, `dialogRef.current?.close()` inside the view-transition update), so by
the time the hook ran the dialog was already shut, the release branch never executed and the lock leaked. The route
curtain (`route-transition.tsx`, `closeDialogs()`) closes every open dialog too, so the same class of leak was reachable
from any dialog that was open when a navigation started (the sign-in modal opened by the auto-prompt, for instance).

## What guarantees it now

Defence in depth: each owner fixes its own state, each has a timer that fixes it if the owner fails, and one component
looks at the page itself.

| Layer | Where | What it does |
| --- | --- | --- |
| Owner release | `use-slide-dialog.ts` | releases the lock on the dialog's own `close` event and when `open` turns false with the dialog already shut; tells the owner (`onExternalClose`) so its `open` state does not stay true over a closed dialog |
| Self-healing lock | `lib/scroll-lock.ts` | a holder is only trusted while an overlay (`dialog[open]` / ARIA modal) is really on the page; any dialog closing, `pageshow`, the tab coming back, and a 1s timer while locked drop holders with no overlay (600ms grace for one that is still opening) |
| Curtain | `route-transition.tsx` | the lift runs in `try/finally` (it always hands the page back); `MAX_RUN_MS` (13s) tears a run down whatever its state; `start()` falls back to a plain navigation if it throws; `sweep()` removes an orphaned curtain / `route-locked` |
| Picture flight | `pdp-flight.tsx` | one flight at a time; a transition the browser never starts (no frame: hidden / stalled tab) is skipped after 1.2s, which runs the update and so the navigation; a flight still going after 9s is released; the other page may be waited for 2.8s (was 4.5s) because the screen is frozen meanwhile; the closing flight's wash always comes down |
| Sign-in modal | `sign-in-modal.tsx` | a close timeline is killed if the modal is asked for again; if the curtain shut it while the app said "open", the app is told (otherwise the Sign in button did nothing) |
| Payment window | `lib/razorpay-checkout.ts` | the page's inline `overflow` / `position` / `touch-action` on `<html>` and `<body>` are written down before Razorpay opens and put back after it closes (it can leave them on a phone when the window goes away abnormally) |
| Net under all of it | `components/providers/page-health.tsx` | on a tap, a tab coming back, `pageshow`, focus and every 2s: if nothing justifies a lock (no dialog, no curtain, no flight, no payment window), clears `is-locked` / `route-locked`, restarts a stopped Lenis, and removes a leftover inline `overflow: hidden` / `position: fixed` |
| Error boundaries | `app/error.tsx`, `app/(store)/error.tsx`, `app/global-error.tsx` | a thrown render error no longer leaves a bare dead page: "Try again" (`retry()`), "Home" (a full page load), and one automatic reload on a chunk-load error (a tab left open across a deploy) |

## Rules for new code

- A new overlay that locks the page must be a `<dialog>` (or `role="dialog" aria-modal="true"`) and take the lock with
  `lockScroll(key)` / `unlockScroll(key)`. Never set `overflow` on `<html>` / `<body>` yourself.
- Anything that closes a dialog it does not own must expect the owner to be told (the `close` event does it).
- A new view transition / long animation must have a timer that ends it. A view transition needs a rendered frame to begin
  and holds input while it runs.
- Verify by leaving the page in the state, not by eye: `document.body.className` must be `""` with nothing open.

## How it was verified

Live site, phone viewport (before): menu to fragrance leaves `is-locked`, wheel scroll does not move the page.
Local, same steps (after): `body` is clean, scroll moves. Injected leaks (`is-locked`, inline `overflow: hidden`, an orphan
curtain with `route-locked`) are cleared within 3.5s. A stubbed view transition that never starts is skipped and the
navigation completes; one that never finishes is released at 9s. Sign-in modal open, then a navigation: lock and dialog
cleared, and the Sign in button opens it again.

Not verified here: a real phone, real Razorpay on a phone (the style restore is defensive and a no-op when Razorpay restores
the page itself), and a real stalled compositor (simulated with a stub).
