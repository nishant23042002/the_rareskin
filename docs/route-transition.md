# Route transition — "The Aperture"

Every in-app page navigation plays a full-viewport branded transition:
`src/components/providers/route-transition.tsx` (behaviour) and
`src/app/route-transition.css` (look), mounted once in the storefront layout
(`src/app/(store)/layout.tsx`). The admin does not get it.

## The design

A light (paper) curtain in two halves that **close toward the point you tapped**: the
seam meets at your tap's Y, a hairline of light draws outward from your tap's X
and flashes as the halves meet, and a soft brass glow marks where the finger
landed. The page dims as it closes. The curtain holds for a beat on the
RARESKIN wordmark and a 2px rule, then **parts from that same seam** to reveal
the next page.

- **Colour:** LIGHT (changed 2026-11-12; it was the announcement bar's obsidian before). The ground is `--paper`
  (the header's and the cards' paper), the wordmark and label are `--ink` (the wordmark is a `currentColor` mask, so it
  is legible on the light ground with no second asset), the brass is the light-ground brass (`themes.css` no longer lists
  `.rh-curtain` among the dark scopes), and each half casts a soft shadow from its leading edge until the two meet. The
  veil over the page is a wash of paper, never a dark shade.
- **Context:** on the way to a fragrance the rule becomes that scent's own colour
  and its name appears; elsewhere it is a brass-to-ink rule. A faint ink
  track sits under the rule so a pale scent colour (aurevan) still reads on the paper.
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


## The flight (a picture opens into the product page)

The curtain above is for the site's ordinary links. A link whose subject is a PRODUCT PICTURE does not use it: the picture itself flies into the
product page's first picture, and flies back on browser back, with the PDP picture viewer's easing (`cubic-bezier(0.16, 1, 0.3, 1)`, 820 ms in /
640 ms out). Code: `components/providers/pdp-flight.tsx`, `app/morph.css`. Both transitions stay: the flight for the pictures below, the curtain for
everything else (header links, text links, the footer, account, checkout...).

**Where it is used** (each link carries `data-no-transition` where the flight can run, so the curtain does not also start):

| Source | Element that flies | Code |
| --- | --- | --- |
| Collection tile | the tile's picture | `home/collection.tsx` (`data-flight-tile`) |
| Hero: the three bottles, and the numbered index | a copy of just that bottle's part of the one photograph | `home/hero-explore.tsx` (`ghost`) |
| In Focus: the picture, and the name | the scene's picture | `home/focus-scene.tsx`, `home/in-focus.tsx` |
| Discovery Set section (home) | the stage | `home/discovery-stage.tsx` (`flight="from"`), lands on the set page's stage (`flight="to"`) |
| Fragrances dropdown (header) | a copy of the card's picture | `layout/header.tsx` |
| Menu drawer | a copy of the row's picture | `layout/site-menu.tsx` |
| Launch offer card | the tile | `layout/campaign-note.tsx` |

The landing is `data-flight-frame="<slug>"`: the 50 ml gallery frame (`product/pdp-gallery.tsx`), or the Discovery Set page's stage.

**How**

- **Opening** is the browser's View Transitions API, driven by hand: the source is named `fragrance-<slug>`, the route is pushed INSIDE the transition's
  update, and the update resolves when the product page is there, at the top, with its first picture decoded; then the frame takes the same name and the
  browser morphs one into the other (`object-fit: cover`, never stretched). **While the update runs the document does not render, so `requestAnimationFrame`
  never fires: the waits use timers.**
- **A `ghost`** is a fixed copy of the picture drawn over its source and removed in the update. It is used where the source cannot be named itself: the hero
  (a region of one big photograph; `fill: false`) and anything inside a modal `<dialog>` or a closing panel (`fill: true`, a thumbnail): the browser aborts a
  transition ("Animation start failed") when a named element lives in the top layer, which the menu drawer is.
- **`after`** runs at the start of the update: the drawer, the dropdown and the offer card close there, instantly (no slide: the screen is frozen
  while the update runs anyway, and the page behind is captured with them gone).
- **Closing** is NOT a view transition: by the time the browser captures the "old" page on a back navigation the router has already swapped it. The Navigation
  API's `navigate` event (type `traverse`) fires while the product page is still on screen, so the picture is lifted out into a fixed copy over a wash in
  the page colour, the route swaps behind it, the scroll goes back where the source was (saved at open in `sessionStorage` with the source's id), and the copy
  flies to it while the wash lifts. If the source is not on screen (a menu, another scroll position) the wash simply lifts. `popstate` is the fallback.
- No View Transitions API, or reduced motion: nothing here runs; the links fall back to the curtain (`useCanFly()` drives `data-no-transition`).
- Adding a source: give the link `data-no-transition={useCanFly() ? "" : undefined}` and an `onClick` that calls `useFlight().open(slug, href, element, { id, after, ghost, fill })`
  for a plain click (`isPlainClick(e)`), then `e.preventDefault()` when it returns true. Name the element on the homepage `data-flight-src="<id>"` if the picture should fly back to it.
