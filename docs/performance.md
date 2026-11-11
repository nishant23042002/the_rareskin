# Loading performance

How the storefront's load time was measured, what was changed, and what was
looked at and deliberately left alone. (2026-11-11.)

## Measuring

Lighthouse, mobile profile (simulated slow 4G, 4x CPU slowdown: a fair proxy for
a mid-range phone), against a **production** build, never `next dev`:

```bash
pnpm build
pnpm start -p 3100                                  # in one terminal
npx lighthouse http://localhost:3100/ --only-categories=performance --form-factor=mobile
npx lighthouse http://localhost:3100/fragrances/aurevan --only-categories=performance --form-factor=mobile
```

Gotchas that produced a wrong "83" once: `pnpm start` that fails with
`EADDRINUSE` leaves the *previous* server answering, whose HTML points at chunk
files the new build has deleted. Before trusting a run, check that no old
`next start` is alive and that every `/_next/static/...` URL in the HTML returns
200. Run the audit twice; the simulated numbers move by about 0.2 s.

The real (unthrottled) run was already fast (FCP ~0.45 s, LCP ~0.6 s on the
homepage, server time ~25 ms once warm). The simulated numbers below are bound by
bytes and round trips on a slow network, so that is what was worked on.

| page | score | LCP | TTI | weight |
| --- | --- | --- | --- | --- |
| homepage, before | 74 | 7.4 s | 8.1 s | 1,160 KB |
| homepage, after | 78 | 5.4 s | 7.6 s | 1,073 KB |
| product page, before | 76 | 7.3 s | 10.3 s | 2,216 KB |
| product page, after | 80 | 5.2 s | 8.0 s | 1,132 KB |

## What changed

- **Product gallery** (`components/product/pdp-gallery.tsx`): it fetched all six
  photographs at once (534, 190, 165, 118, 74 KB ...) while only the first is on
  screen, and they competed with the picture the page was waiting on. Now only the
  first loads; the next is warmed when the browser is idle or on the first touch /
  hover / focus, and a swipe or thumbnail tap loads that slide and its neighbours.
  The strip under it uses 160 px thumbnails (`make_pdp_tiny.py`, 3-5 KB each)
  instead of the 640 px files (14-50 KB).
- **Logo**: the wordmark is a CSS mask, shown 96-224 px wide, but loaded the 1487 px
  PNG (42 KB, high priority, in the critical path, and requested twice). It is now a
  640 px lossless WebP (8 KB, `WORDMARK_WEB_SRC` in `lib/site.ts`) and is preloaded
  from the root layout, because a mask in an inline style is invisible to the
  browser's preload scanner. The PNG stays for the invoice, emails and share cards.
- **Fonts**: Newsreader was one loader for roman and italic, so both (about 120 KB)
  were preloaded, but only the italic is on the homepage's first screen. They are
  two loaders now and only the italic is preloaded (`app/layout.tsx`).
- **JS not every visitor needs** is split out with `next/dynamic` and warmed when
  the browser is idle (so it is in the cache before it is asked for): the checkout
  panel (`cart-drawer.tsx`), the sign-in modal (`sign-in-modal-mount.tsx`), and the
  staff-only preview tools (`auth/staff-tools.tsx`, requested only for a signed-in
  staff account).
- **Per-request session lookup removed**: Next renders the root `forbidden.tsx` into
  every page's tree, and its `NoAccess` read the session (cookie + database) there,
  so every storefront render did it for every signed-in visitor (the founder
  testing as staff paid for it on every navigation). `NoAccess` is cookie-free now
  (`admin/signed-in-as.tsx` reads the account name on the client), and `/_not-found`
  became static as a side effect.
- **Static files** (`/brand`, `/images`): `Cache-Control: public, max-age=86400,
  stale-while-revalidate=604800` (`next.config.ts`), instead of Next's default
  `max-age=0, must-revalidate` that cost a conditional request per picture on every
  return visit.

## Rendered per request, on purpose

`(store)/layout.tsx` declares `export const dynamic = "force-dynamic"`. The
pre-launch / maintenance gate lets signed-in staff past the holding page, which
needs the session cookie, so the storefront cannot be statically generated: a page
prerendered while the store is open would keep serving the open store after
`maintenanceMode` is switched on (the regeneration would hit `cookies()` and fail,
and the stale copy would stay up). Reads of the catalogue and settings are cached
(`unstable_cache`), so a render is cheap (about 25 ms warm). If the gate is ever
moved out of the layout (for example into the proxy), the storefront could become
static / ISR and be served from the CDN: that is the next big step.

## Looked at and left alone

- `experimental.inlineCss`: removes the render-blocking stylesheet request, but with
  Turbopack it inlines far more than the page's own CSS: the homepage HTML grew from
  217 KB (34 KB gzipped) to 794 KB (140 KB gzipped). Worse on a slow network.
- Google Tag Manager (305 KB, `afterInteractive`): blocking it in a test run did not
  move LCP (5.6 s), so it was not touched and analytics timing is unchanged.
- Product images on the homepage are sized correctly (`sizes` and the srcset steps
  match the rendered widths); the favicon (`/icon`, 26 KB) is not on the render path
  and is also the PWA's 512 px icon.

## Still on the list

- The 1600 px gallery photographs are 120-550 KB each; a 1000 px middle step in the
  srcset (and a re-encode of `05-everyday-carry-flatlay-1600.webp`, 534 KB) would cut
  what a phone downloads per swipe by half or more. Needs new files per extrait.
- Render-blocking CSS (35 KB, 7 KB gzipped): Lighthouse estimates about 0.45 s on the
  slow profile. Splitting the homepage-only rules out of `home.css` is the safe way.
