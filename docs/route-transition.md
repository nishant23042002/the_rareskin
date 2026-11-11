# Route transition — "The Aperture"

Every in-app page navigation plays a full-viewport branded transition:
`src/components/providers/route-transition.tsx` (behaviour) and
`src/app/route-transition.css` (look), mounted once in the storefront layout
(`src/app/(store)/layout.tsx`). The admin does not get it.

## The design

An obsidian curtain in two halves that **close toward the point you tapped**: the
seam meets at your tap's Y, a hairline of light draws outward from your tap's X
and flashes as the halves meet, and a soft brass glow marks where the finger
landed. The page dims as it closes. The curtain holds for a beat on the
RARESKIN wordmark and a 2px rule, then **parts from that same seam** to reveal
the next page.

- **Colour:** the ground is `--onyx`, the announcement bar's own obsidian, and the
  ink is `--champagne`, so the curtain is the same material as the bar and follows
  the colour theme (`themes.css` lists `.rh-curtain` with the dark scopes).
- **Context:** on the way to a fragrance the rule becomes that scent's own colour
  and its name appears; elsewhere it is the brand rule (`--tri`). A faint champagne
  track sits under the rule so a dark scent colour (vayren) still reads.
- **Waiting:** if a route takes longer than ~280ms once the curtain is closed, a
  slow glint travels along the rule so it reads as "working", not frozen.
- **Reduced motion:** a plain dissolve (160ms in, 200ms out), no movement.

## Why it is smooth

- Everything that moves is `transform` / `opacity`, run through the **Web
  Animations API**, which the browser animates on the compositor thread. The
  main thread is exactly what Next is busy with while it renders the next route,
  so a main-thread animator (GSAP, a CSS-in-JS ticker) stutters at the worst
  moment; this does not. There is no GSAP in this component any more.
- **No React state.** The curtain is driven imperatively, so a click costs no
  re-render of the provider or of any component that reads its context (the click
  handler itself measures ~8ms).
- The layers are solid colours (cheap) plus one small layer for the wordmark.
- It is a `popover="manual"`, so it lives in the browser's **top layer**, above an
  open modal `<dialog>` (menu, bag, sign-in): the drawer stays under the closing
  curtain instead of being snapped shut first, and dialogs are closed once the
  curtain is opaque. Browsers without popovers use a fixed layer and close the
  dialogs up front.

## How it works

1. A `document`-level **capture** listener intercepts internal `<a>` clicks before
   Next's `<Link>` sees them, so the curtain starts on the same frame as the tap.
   It declines (leaves to the browser / Link): other origins, `target`, `download`,
   `data-no-transition`, modified clicks, `#hash`-only and same-route links, the
   admin, `/api/` route handlers and file-like paths (`.pdf`, `.xml` ...): a
   download never commits a route, so the curtain would wait out its ceiling.
2. **cover** (360ms) starts at once. `router.push` is called at **150ms**, not at
   the tap: by then the gap is a thin band, so a route that is already cached
   cannot be seen swapping in behind a wide-open curtain.
3. **Arrived** means the URL has left where it started (not "equals the target"),
   so a redirect (`/about` -> `/the-idea`, a signed-out `/account` -> `/?signin=1`)
   is handled. It is checked on every pathname change and on a 32ms poll.
4. When the curtain is closed **and** the route has arrived: scroll goes to the top
   (or to the link's `#anchor`), two frames are let through for the new page to
   paint, the on-screen pictures are decoded (up to 700ms, so a hero does not pop
   in after the lift), and the curtain has been closed for at least 120ms.
5. **reveal** (60ms + 440ms). The curtain stops catching pointer events the moment
   it starts to lift, so the page is live as it opens.
6. The curtain's phase machine never trusts an animation clock alone: every wait
   is bounded by a timer, so a throttled tab or a stalled compositor delays the
   curtain but can never strand it. If a route never commits, an **8s ceiling**
   lifts the curtain without touching the scroll position. Back / forward before
   the route commits (`popstate`) lifts it at once.

Scroll is locked during the transition (`body.route-locked`, Lenis stopped; the
scrollbar gutter is painted in the curtain's ground so no pale strip shows beside
it) and released at the end, unless a drawer was opened during the lift.

Only `usePathname` / `useRouter` are used, never `useSearchParams` (which would
force a client-render bailout up to the nearest Suspense boundary on every page).

## Programmatic navigation

```ts
const { navigate } = useRouteTransition();
navigate("/fragrances/aurevan");           // closes at the last pointer position (or the centre)
navigate("/the-idea", { x: 200, y: 320 }); // closes where you say (viewport px)
```

Anything that does not get the curtain (same route, admin, an API path, another
origin) falls through to a plain `router.push` / `location.assign`. Auth flows
(`router.replace` after sign-in / sign-out) deliberately skip the curtain: they
have their own completion feedback.

## Opting a link out

```tsx
<a href="/somewhere" data-no-transition>…</a>
```

(or put `data-no-transition` on any ancestor).

## Tuning

All timings are the `FULL` / `SOFT` (reduced motion) objects at the top of
`route-transition.tsx`; the look (colours, sizes, the hairline) is
`route-transition.css`. If the cover or the lift is changed, keep `push` inside
the first half of `cover`.
