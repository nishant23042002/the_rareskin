# THE RARESKIN

The storefront for THE RARESKIN — three Extrait de Parfum, a Discovery Set,
India / INR. Built greenfield from the approved "Campaign" prototype.

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling:** Tailwind CSS v4 — CSS-first `@theme` tokens in `src/app/globals.css`
- **Motion:** GSAP 3 + ScrollTrigger + `@gsap/react`, Lenis smooth scroll
- **Commerce:** a `localStorage` working cart that syncs to a server cart
  (guest + account, merged on sign-in); checkout is a **right-side drawer** that
  slides bag → checkout → payment → confirmation (no separate route), with a
  server-side GST engine, coupon + store-credit application, pincode
  serviceability and atomic stock decrement. **Razorpay hosted checkout** is
  wired end to end, **payment-first** — an online order is created only once the
  payment is verified (failed/abandoned payments leave nothing behind); verified
  webhook (authoritative), immutable payment log, refund path, oversell
  auto-refund. Works locally without keys via a "simulate payment" panel. See
  [`docs/checkout.md`](docs/checkout.md) and [`docs/payments.md`](docs/payments.md).
- **Data layer:** MongoDB Atlas + Mongoose, Zod validation shared client/server,
  Cloudinary for media, `migrate-mongo` migrations. The storefront reads the
  catalogue (products, prices, copy, SEO) from the database via a `server-only`
  access layer with tag-based ISR — edits go live without a deploy. See
  [`docs/data-layer.md`](docs/data-layer.md).
- **Auth:** passwordless phone-OTP (Twilio Verify) with revocable DB sessions,
  a sign-in **modal** (not a page), and a `/account` area. Rate-limited
  (Upstash), Turnstile-ready. Works locally with a dev code — no SMS account
  needed. See [`docs/auth.md`](docs/auth.md).
- **Route transition:** every in-app navigation plays a full-viewport branded
  curtain that closes toward your tap and parts to reveal the next page,
  context-aware to the destination. See
  [`docs/route-transition.md`](docs/route-transition.md).
- **Names without accents:** the three fragrances are written AUREVAN, ORVELIS and
  VAYREN everywhere (code, copy, emails, invoices, the database). The photographs
  with the name printed on the flacon are the one place an accent can still show.
- **No chevron mark:** the old crossbar-less "A" device was removed from the whole
  product (bag, ticker, 404s, admin, invoice, favicon). The favicon is now the
  wordmark's own "R" (`public/brand/mark-r-cream.png`).
- **Product page:** a calm buying column (price, one button, four reassurances read
  from the admin settings, a Discovery Set nudge, one accordion) beside the
  gallery; then full-width sections: the scent in three acts + how it wears
  (`components/product/pdp-scent.tsx`), reviews, the Discovery Set band, the rest of
  the range, and a sticky buy bar (`pdp-sticky-bar.tsx`). Styles: `app/pdp.css`.
- **Homepage sections that are switched off:** `src/config/homepage-sections.ts`.
  "On the skin" (the `@therareskin` strip) is off until there are real Instagram
  posts; set `SHOW_ON_THE_SKIN = true` to bring it back.
- **One dark:** every dark surface (announcement bar, In Focus, the Discovery Set,
  the founder letter, the footer, the account pages' band) is `--onyx` (`#100e0c`,
  the announcement bar's colour); there is no second, browner dark any more.
- **Account area:** light pages with a dark band at the top of each
  (`components/account/account-hero.tsx`, styles in `app/account.css`) and a few
  precise dark accents; `.ac-dark` re-points the colour tokens inside a dark block.
- **Loading performance:** measured with Lighthouse against a production build;
  what was changed, what was left alone and why (the storefront is rendered per
  request on purpose), and how to re-measure without a stale server fooling you:
  [`docs/performance.md`](docs/performance.md).
- **Fonts:** Jost + Newsreader via `next/font/google`

---

## Getting started

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

**On a phone** (same Wi-Fi as the PC). `localhost` on a phone is the phone itself, so use
the PC's IPv4 address (`ipconfig`, or the "Network" line `next dev` prints), for example
`192.168.0.106`. Two ways:

- `pnpm dev`, then `http://<IPv4>:3000`. It works, because `next.config.ts` lists
  `allowedDevOrigins` (without it Next 16's dev server answers 403 to its own JS chunks
  from any address but `localhost`, so the page looks right and nothing responds) and the
  session / cart cookies are not `Secure` / `__Host-` in development (a browser drops
  those on `http://192.168.x.x`, so sign-in and the bag would not stick). But dev ships
  ~5 MB of unminified JS: a mid-range Android phone needed about 33 s to start the
  homepage, so buttons look dead until then.
- `pnpm phone` (use this for design review): a production build served at
  `http://<IPv4>:3001`, fast. It builds with `NEXT_PUBLIC_LAN_TEST=1` (relaxed cookies for
  plain HTTP; ignored on Vercel, never deploy that build) and `NEXT_PUBLIC_CARD_SWITCHER=1`
  (the card-direction preview bar). No hot reload: run it again to see code changes.

Dev-only diagnostics: open `/api/dev/phone-speed` on the phone (latency, download speed,
CPU), and read `.next/dev/logs/phone-client.log` (every dev page reports its load time,
hydration and errors there). If nothing loads at all, Windows Firewall is blocking Node
on private networks. A tunnel (ngrok, Cloudflare) needs its host added to
`allowedDevOrigins` on purpose.

Other scripts:

```bash
pnpm build          # production build (also runs the TS check)
pnpm start          # serve the production build
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
```

Database (needs `MONGODB_URI` in `.env.local` — see `docs/data-layer.md`):

```bash
pnpm db:migrate         # apply pending migrations
pnpm db:migrate:status  # show migration state
pnpm db:seed            # import the catalogue + settings (idempotent)
pnpm db:check           # connectivity probe
pnpm catalog list       # inspect the live catalogue
pnpm catalog set aurevan price 749   # edit a field + bump the cache
pnpm catalog set vayren stock 60     # set an inventory level
pnpm coupon add WELCOME10 percent 10 # create a discount code (coupon UI in G3)
pnpm revalidate         # refresh the storefront cache on demand
pnpm email:test RRS-2026-000001  # render every order email to .mail/ (dev)
pnpm email:preview      # react-email dev server for the templates
```

Copy `.env.example` to `.env.local` to wire integrations. The storefront still
builds and runs with none of it set; the data-layer scripts need at least
`MONGODB_URI`.

---

## Project structure

```
src/
  app/
    layout.tsx            fonts, providers, header/footer, base metadata, Org JSON-LD
    page.tsx              homepage — composes the home/* sections
    globals.css           Tailwind import + @theme tokens + component layer
    fragrances/[slug]/    PDP (static, per-fragrance metadata + Product/Breadcrumb JSON-LD)
    discovery-set/  the-idea/  faq/  contact/  shipping/  returns/  privacy/  terms/
    not-found.tsx
    sitemap.ts  robots.ts  manifest.ts  icon.tsx  apple-icon.tsx  opengraph-image.tsx
    api/newsletter/  api/contact/   (validation stubs — see below)
  components/
    layout/    AnnouncementBar  Header (glass; rolling labels; Fragrances dropdown opens on
               hover, click or keyboard)  SiteMenu (left sidebar)  MenuFooter  BackToTop  Footer  PageIntro  LegalDoc
    home/      Hero (+HeroFrame, HeroMedia, HeroExplore)  LaunchOffer (LaunchPass +
               promises)  InFocus
               Collection (tiles)  Quiz  DiscoverySet  WhyExtrait  FounderNote
               UnboxingRitual  MadeDeliberately  InstagramStrip
               HomeImage (manifest-driven <Image>)
    app/home.css   the homepage + chrome stylesheet, classes namespaced `rh-`
    product/   PdpGallery  PdpReviews
    cart/      CartProvider(*)  CartDrawer("The Counter")  CheckoutPanel  CartBar
               CartToast  CartLine  AddToBagButton
    contact/   ContactForm
    ui/        Button  Mark(∧)  Flacon(SVG)  Container  Carousel  Accordion  Reveal
               Logo  MenuIcon  Wordmark  PaymentMarks  SvgDefs
    providers/ SmoothScroll  GsapLenisBridge  NavToneProvider  ScrollbarVar
               AuthProvider  RouteTransitionProvider ("The Aperture")
  hooks/       useScrolled  useReducedMotion
  lib/
    catalog.ts             isomorphic catalogue DTO types + formatINR + brand palette
    money.ts               paise <-> rupee helpers — all money is integer paise
    validation/            Zod schemas shared by client forms and the server
    cart.ts                cart types + reducer + localStorage helpers
    checkout.ts            isomorphic checkout / quote / order DTOs
    pincode.ts             India PIN -> GST state resolution + state list
    faq.ts                 FAQ content (also feeds FAQPage JSON-LD)
    quiz.ts                quiz questions + tally
    seo.ts                 pageMeta() + Organization / BreadcrumbList JSON-LD
    site.ts                SITE constants + real CONTACT details
    gsap.ts  motion.ts  cn.ts
  server/                  server-only — DB, secrets, media, auth (never imported client-side)
    env.ts                 Zod-validated process.env accessor
    db/                    cached Mongoose connection + model re-exports
    models/                Product MediaAsset SiteSettings User Counter AuditLog Session OtpChallenge
    data/catalog.ts        the storefront's catalogue access layer (cached, tagged)
    auth/                  phone-OTP sessions, rate limiting, Twilio/Turnstile
    cloudinary.ts          signed direct-upload params + delivery URLs
  proxy.ts                 optimistic auth gate for /account, /admin
  app/api/revalidate/      on-demand cache purge (bearer REVALIDATE_SECRET)
  app/api/auth/            otp/start · otp/verify · logout · session · sessions/revoke-all
migrations/                versioned, reversible migrate-mongo migrations
scripts/                   db:seed / db:check / catalog (tsx, load .env via @next/env)
docs/data-layer.md         how the data layer works + provisioning steps
public/
  brand/rareskin-wordmark.png     wordmark artwork (invoice, emails, share cards)
  brand/rareskin-wordmark-web.webp  the same art at 640 px: what <Logo> paints as a CSS mask
  pay/                            vendored card-network SVGs + India flag
```

`(*)` `CartProvider` lives in `components/providers/`.

---

## Key decisions

**Commerce.** `src/lib/cart.ts` holds the working cart in `localStorage`
(`rareskin:cart:v1`), hydration-safe; the `CartProvider` syncs it to a server
`Cart` (folding a guest bag into the account on sign-in). Checkout is **one
right-side drawer** — `CartDrawer` ("The Counter") slides between `bag`,
`checkout` (`checkout-panel.tsx`) and `done`; there is no `/checkout` route. The
panel collects contact + address and calls the server, which is the only place
money and stock are decided:

- `src/server/commerce/pricing.ts` — tax-inclusive GST engine: grand total is
  built from catalogue prices, tax is what's *within* it, split CGST+SGST for
  Maharashtra deliveries else IGST.
- `coupons.ts` / `store-credit.ts` — validation + a real credit ledger (the
  Discovery-Set credit), applied inside the order transaction.
- `inventory.ts` — a guarded atomic `$inc` + a `stockLedger` row per movement.
- `orders.ts` — `quoteOrder()` (a hint) and `placeOrder()` (authoritative, in a
  MongoDB transaction, idempotent per client key).

`flags.checkoutEnabled` in Site Settings gates the customer-facing flow (off
until launch): the bag shows "opens with launch" and the server refuses new
orders (`403 checkout-disabled`). Signed-in staff always pass, so you can test
before launch.

**Design tokens.** All colour / type / easing values are CSS custom properties
in the `@theme` block of `globals.css`. Change them there, not in components.

**Motion.** `<SmoothScroll>` drives Lenis from `gsap.ticker`; every animated
component uses `useGSAP({ scope })` for automatic cleanup. A global
`@media (prefers-reduced-motion: reduce)` guard plus `useReducedMotion()` /
`gsap.matchMedia()` cover reduced motion.

**Placeholder art.** Bottles and campaign scenes are art-directed SVG
(`Flacon`, plus the three-flacon stage in `HeroMedia`). Real photography is uploaded to Cloudinary through the
admin and stored on each product's `media` field; the DAL then serves those
URLs in place of the `/images/<slug>/…` fallbacks.

---

## Environment variables

See `.env.example`. All optional:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | canonical domain (metadata, sitemap, OG). Defaults to `https://www.therareskin.com` (the host the old site was indexed under). |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | the checkout provider — see [`docs/payments.md`](docs/payments.md). Server-side only: the key id reaches the browser through the checkout response, there is no `NEXT_PUBLIC_` copy. |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager id (`GTM-…`), storefront only. Production environment only; build-time. |

---

## Wiring the integrations

### Payments (Razorpay)

Wired end to end (Test Mode). Full setup + guarantees in
[`docs/payments.md`](docs/payments.md). The short version:

1. `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (Test Mode) → hosted checkout goes
   live; blank → the local "simulate payment" panel.
2. Create a webhook at `/api/webhooks/razorpay` for `payment.captured`,
   `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`,
   `payment.dispute.created`; its secret → `RAZORPAY_WEBHOOK_SECRET`.
3. `CRON_SECRET` in the Vercel project (crons in `vercel.json`: reconcile
   payments daily, drain the email outbox every 2 min).
4. Flip `flags.checkoutEnabled: true` in Site Settings.

### Emails (Resend)

Order-lifecycle email is wired end to end — see [`docs/email.md`](docs/email.md).
A durable `emailmessages` outbox, an opportunistic `after()` drain, and a `*/2`
cron sweep as the guarantee. Blank `RESEND_API_KEY` → every email renders to
`.mail/*.html` for local review (`pnpm email:test <orderNumber>`,
`pnpm email:preview`). Going live: verify a domain, set `RESEND_API_KEY` /
`EMAIL_FROM` / `RESEND_WEBHOOK_SECRET`.

### Invoices

Every non-cancelled order has a downloadable PDF invoice —
`GET /api/account/orders/<orderNumber>/invoice` (a "Download invoice" button on
the order page, a link in the confirmation email). Rendered on demand with
`@react-pdf/renderer` from `src/server/invoice/` — brand wordmark, the tri-juice
rule, a flacon glyph per fragrance with its notes, both party blocks, the full
pricing ladder (discount, credit, shipping, COD fee, GST when applicable),
exact payment method, and the amount in words. Brand fonts (`public/fonts/*.woff`)
are bundled into the route via `outputFileTracingIncludes`.

### Contact & newsletter forms

`src/app/api/contact/route.ts` saves every enquiry as a `ContactMessage`
(worked in **`/admin/messages`**) and raises a notification. 
`src/app/api/newsletter/route.ts` only validates the address and raises a
low-priority admin notification — **sign-ups are not stored anywhere yet**; wire a
list provider (or a `subscribers` collection) there before relying on the footer
form. The client components (`ContactForm`, the footer's `FooterNewsletter`)
already handle success and error states.

### Product photography

Upload packshots through **`/admin/catalogue/<slug>/edit`** → Images (needs
`CLOUDINARY_*`). An uploaded `hero`/`flat`/`box` immediately replaces the vector
`<Flacon>` on the PDP gallery, the home collection tiles and In Focus, the
Discovery Set picture, and the bag cross-sell — everywhere else (the sidebar
thumbnails, the quiz result) stays on vectors, a deliberate later polish. The
homepage hero is separate: it takes one photograph from **Admin → Settings →
Homepage hero** (see "Homepage hero photograph" below). Aspect ratios are
already the final ones.

---

## Deploy (Vercel)

1. Push to a Git repo and import it in Vercel — framework preset **Next.js**,
   no build config needed.
2. Set `NEXT_PUBLIC_SITE_URL` to the production domain in the Vercel project's
   Environment Variables (Production). Add any integration keys as they land.
3. Add the custom domain in Vercel → Settings → Domains.
4. Every push builds a Preview deployment; promote to Production from the
   Vercel dashboard or by pushing to the default branch.

`pnpm build` must pass locally before deploying.

---

## Pre-launch checklist

Content that ships as a deliberate placeholder and needs a real value / review
before going live:

- **Domain** — confirm `NEXT_PUBLIC_SITE_URL` / the value in `lib/site.ts`.
- **Checkout / payment** — the flow is done end to end. Add Razorpay Test-Mode
  keys + a webhook (see [`docs/payments.md`](docs/payments.md)) and
  `CRON_SECRET`, then flip `flags.checkoutEnabled` in Site Settings. Until then
  the checkout drawer shows "opens with launch" for customers; in dev it uses
  the simulate-payment panel.
- **Admin** — `/admin` ("Studio"): orders (fulfil, refund, cancel, notes), the
  **catalogue editor** (full record, product photos, ledgered stock, draft
  delete), **coupons**, **customers** (role / suspend / revoke sessions),
  **staff** (add / promote by phone), and **Site Settings**. Role-gated +
  phone-OTP sudo for dangerous actions; a non-staff account gets a real 403
  "no access" screen. See [`docs/admin.md`](docs/admin.md).
- **Google sign-in (optional)** — "Continue with Google" for staff/customers who
  link a Google account from `/account` or `/admin/account`. Off until
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set, the
  `/api/auth/google/callback` redirect URI is registered in Google Cloud, and
  `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=1`. See [`docs/auth.md`](docs/auth.md).
- **Coupons** — created + edited in `/admin/coupons` (`pnpm coupon` stays for
  bulk / CI). None ship by default.
- **Staff** — add / promote team members in `/admin/staff` by phone number (they
  sign in with an OTP). The seed makes the first `superadmin` from
  `SEED_SUPERADMIN_PHONE`.
- **Go live** — the storefront shows a **holding page** until `storeLive` is
  flipped on in `/admin/settings` (signed-in staff always see the real site).
  `checkoutEnabled` is a separate switch. Both flips need a phone OTP. Set the
  announcement-bar messages and footer social links there too. Write each
  announcement as **`Lead | detail`** (e.g. `Free shipping | Across India`; an
  em dash with spaces also works) for the bold-then-quiet look, and give a row a
  link to make that message clickable. The built-in set is used when none are
  configured.
- **Stock** — every product seeds at `stock: 0`; set real levels in
  `/admin/catalogue/<slug>/edit` (or `pnpm catalog set <slug> stock <n>`) before
  launch.
- **Homepage pictures** — seven pictures (hero 16:9 + 4:5, the three product
  cards, atomizer macro, unboxing, discovery set) are
  described in [`public/images/assets-manifest.json`](public/images/assets-manifest.json)
  (file, pixel size, ratio, `sizes`, focal point, alt, creative direction,
  `claimsToVerify`) and produced with [`ASSET_PROMPT_SHEET.md`](ASSET_PROMPT_SHEET.md).
  The hero (16:9 + 4:5) and the three product cards are **final** (generated
  plates + the approved flacon pixels); the other three files are **tonal
  placeholders** until you replace them at the same path, set their `status` to
  `"final"` **and bump `assetVersion`** in the manifest (Next's image cache cannot
  be invalidated, so URLs carry `?v=<assetVersion>`); existing sections keep their
  illustrations while a picture is a placeholder. **"The Three" cards: four pedestal-free
  art directions are built** (grounded stone, studio light, mineral bed, liquid
  light, three fragrances each, plus a "Stone v2" AUREVAN alternative), next to the
  original pedestal cards; plate prompts in `public/images/prompt-manifest.json`,
  files in `public/images/homepage/cards/<direction>/`, choice in
  `src/config/homepage-assets.ts`. **FINALIZED (2026-11-12): STONE** is the default
  (`DEFAULT_CARD_CONCEPT = "grounded_stone"`), the hero FOLLOWS THE CARDS
  (`HERO_FOLLOWS_CARD_CONCEPT = true`, so the live hero is `hero-grounded_stone`) and
  the colour theme is the Original (`DEFAULT_THEME`). Nothing was deleted: the pedestal
  set, Studio light, Mineral bed, Liquid light, the reference hero variants and the other
  themes (Botanical, Verdant) stay in the repo and on disk, untouched, and are one line
  away. The founder's **slim "Preview" tab** (a panel that switches the direction live,
  `/?concept=<id>`, `/?hero=1..4`) and the **colour dock** are now development tools: off
  in production (`CARD_SWITCHER_PUBLIC = false`; `THEME_PREVIEW_ENABLED` in
  `src/config/themes.ts`), on in `next dev` or in a build made with
  `NEXT_PUBLIC_CARD_SWITCHER=1` / `NEXT_PUBLIC_THEME_PREVIEW=1`. Every card has the bottle at the same
  place (`BOTTLE` in the local build script). `pnpm home:images check` verifies
  size / ratio / weight; `pnpm home:images placeholders` rewrites missing
  placeholders. Hero: a Site Settings photograph still wins over the shipped one.
  The hero has eight shipped pictures (four card directions + four reference variants,
  `src/config/hero.config.ts`; `/?hero=1..4` or the Hero bar previews the variants,
  `activeHeroVariant` ships one). The text panel beside the picture is tinted from the
  picture's own edge (`HeroFrame`): after replacing a hero picture run
  `pnpm home:images panels` to resample its `panel` colours. That split layout is now the
  fallback: the SHIPPED hero (`hero`) is drawn as an explorable "stage" (the picture full
  width from 1024px with the headline on its wall, stacked below that; a dot and a hover
  plaque on each flacon, an index that lights them, and a focus frame that dims the rest of the scene on hover; hover never moves the picture). The dots, plaques and
  hover targets are positioned from `src/config/hero-spots.ts`, measured on THAT picture:
  when the hero art is replaced, re-measure them (percentages of the picture, two crops).
  Other hero directions and a Site Settings photograph keep the split layout, no hotspots.
  The launch pass (`launch-pass.tsx`, styles `.rh-pass*` in `app/hero.css`) is the dark
  "exclusive, limited-time" price card: it counts the price down from the list price once
  when it scrolls into view, strikes the list price, turns a seal, fills a savings meter and
  links to the three product pages; it shows its final state without JavaScript or with
  reduced motion. It shows an end date only when **Site Settings → Campaign** is active and
  has an "Ends" date still ahead ("Ends 30 Nov · 12 days left"); otherwise it says the price
  returns to the list price when the launch ends. No countdown is made up.
  Before launch, confirm the `claimsToVerify` items (the unboxing box is not
  approved packaging; no "30% extrait" figure is printed; the ritual copy is a
  draft).
- **Contact & newsletter** — the contact form now saves every enquiry to
  **`/admin/messages`** and raises a notification; wiring a real ESP for the
  newsletter list still goes in `/api/newsletter`.
- **Notifications** — Studio has a live activity feed (topbar bell + toasts +
  `/admin/notifications` + a dashboard panel) covering orders, payments,
  disputes, reviews, staff sign-ins, low stock, email bounces and enquiries.
  Polls every 20 s; no extra infrastructure. See
  [`docs/notifications.md`](docs/notifications.md).
- **Demo reviews** — *removed on 2026-11-04.* `pnpm seed:reviews` can still add
  4 sample approved reviews (throwaway customer accounts + delivered orders,
  two with product photos) to preview the storefront + admin with content, and
  `pnpm seed:reviews --remove` deletes exactly what it created. The demo data is
  currently gone and `flags.reviewsEnabled` is **off**; turn it on in
  `/admin/settings` once real reviews exist. (Photo uploads need
  `CLOUDINARY_*` — already set.)
- **Demo campaign** — the "Launch offer — ₹799" offer card is **on** in Site
  Settings (`campaign`) so the corner card can be seen. Edit or turn it off in
  `Admin → Settings → Running offer`; the vector flacons in the card become real
  packshots once product photos are uploaded.
- **@THERARESKIN strip** — the homepage Instagram band shows six tiles. Real
  customer review photos come first, then real product packshots; any empty
  slot is an illustrated flacon placeholder (`PLACEHOLDERS` in
  `components/home/instagram-strip.tsx`, shot at different angles). Swap for a
  real feed / curated set, and set the Instagram URL in Site Settings → Social
  so "Follow →" links out.
- **Legal pages** — Shipping / Returns / Privacy / Terms carry real,
  brand-specific copy but should get a final legal review. Confirm the values
  chosen as sensible defaults: 7-day return window, 48-hour damage-report
  window, delivery estimates, 5–7 day refund timeline, Raigad jurisdiction,
  and the DPDP grievance-officer contact.
- **FAQ** — verify the assertions ("bottled in India by Velocity Ventures
  Group", "ingredient list printed on every carton", phone hours). Add an
  animal-testing / vegan statement when the position is set.
- **Homepage "Made deliberately" band** — `made-deliberately.tsx` states
  "Extrait concentration", "IFRA-compliant", "No added phthalates" and
  "Bottled in Roha, Maharashtra". Confirm each with the perfumer / QA before
  launch and adjust the copy in that file. The animal-testing line is
  deliberately omitted until the position is set (see FAQ item above).
- **Founder portrait** — set in **Admin → Settings → Founder** (or scripted:
  `pnpm founder:portrait <image>` uploads to Cloudinary
  `rareskin/content/founder-portrait`, records the `MediaAsset`, sets
  `SiteSettings.founderPortrait` and busts the cache). It fills the homepage
  "first letter" card (left column) and the `/the-idea` card via the shared
  `FounderPhoto` — never cropped (the frame takes the photo's own proportions),
  responsive `srcset` at `q_auto:best`, capped at the file's native width. If
  no portrait is set — e.g. a fresh DB — or it fails to load, it shows the bundled
  `public/founder/founder-fallback.webp` instead. Any portrait works; tall
  ~2:3 looks best. `--id=<new-id>` on the script keeps the previous Cloudinary
  asset.
- **Product picture viewer** — a click on a product-page photograph (or the corner enlarge button) opens a
  full-screen viewer (`src/components/product/pdp-viewer.tsx`, styles `.pv*` in `src/app/pdp.css`): the picture
  lifts out of the page and settles in the middle, you can swipe / use the arrows / the thumbnails, click to zoom
  (the picture follows the pointer), and closing flies it back into place. Esc, the cross, or a click beside the
  picture closes it. Under reduced motion it fades instead of flying.
- **Content-page motion** — shipping, returns, terms, privacy, FAQ, contact, our story and the Discovery
  Set page share one small kit (`src/app/pages.css`, `PageIntro`, `ReadingProgress`, `SectionNav`, the motion
  layer's `data-reveal` / `data-rv`): an intro that arrives, sections that rise in, a reading line under the
  header, a table of contents (policies) / topic chips (FAQ) that follow the section in view, and small
  interactions on the FAQ rows, contact channels and fields, and the promise rows. It is built to be cheap:
  transform and opacity only, no scroll listeners (scroll-driven CSS and one IntersectionObserver), nothing
  under `prefers-reduced-motion`.
- **Checkout button payment marks** — the bag's "Proceed to checkout" button shows three payment methods as
  overlapping circles (UPI, Visa, Mastercard; `PayStack` in `src/components/ui/payment-marks.tsx`, marks in
  `public/pay/`). Razorpay accepts more than these three; they are the most recognised. On a phone the launch pass
  (`launch-pass.tsx`) is a deliberately quiet version of the desktop card.
- **Homepage hero photograph** — the picture beside "Three Extraits" is one
  photograph of the three flacons together, uploaded in **Admin → Settings →
  Homepage hero** (Site Settings `heroImage`; about 4:5 on a phone and
  near-square on a desktop, e.g. 1600×1800+, nothing printed on it). Until one
  is uploaded — or if it fails to load — an illustrated trio of the vector
  flacons shows. (The per-fragrance "Homepage hero banner" fields in the
  catalogue are no longer used by the homepage.)
- **Packaging copy** — the PDP "What's in the box" answer describes a
  recyclable carton + a wear card; confirm this matches the actual packaging.
- **Reviews** — verified buyers review a product from **`/account/reviews`**
  once their order is `delivered`, with an optional profile photo (set on
  `/account`) and up to 3 product photos; every review is moderated in
  **`/admin/reviews`** before it shows. A `review-request` email goes out ~5
  days after delivery (daily cron). The PDP "Impressions" section (avatars +
  photo strips + a lightbox) and the PDP star ratings render only while
  **`flags.reviewsEnabled`** is on in Site Settings — currently **off** (the
  demo reviews are removed; see "Demo reviews" above); turn it on once real
  reviews exist. The **homepage no longer has a reviews
  section** (the redesign dropped it); customer photos from approved reviews
  still feed the "@therareskin" strip. See [`docs/reviews.md`](docs/reviews.md).
- **Indexing** — `metadata.robots` in `layout.tsx` is `index: true`. Set it to
  `false` if you want the site hidden from search until launch.
