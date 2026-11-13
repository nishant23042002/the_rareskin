# Analytics (GA4 via Google Tag Manager)

The storefront pushes GA4-shaped events onto `window.dataLayer`; the GTM container forwards them to GA4. Nothing in
the code talks to Google directly, so with no container loaded the pushes do nothing.

| | |
|---|---|
| GTM container | `GTM-PSJ7HLNQ` (`NEXT_PUBLIC_GTM_ID`, build-time) |
| GA4 web stream | `G-78F7RS3R9T` (read from the container's public script; the id is not in the code) |
| Event layer | `src/lib/analytics.ts` — **the only place events are defined** |
| Listeners | `src/components/analytics/*` (root listener, impressions, view-item), `src/components/product/pdp-analytics.tsx` |
| Admin | `/admin` is never tracked (the loader sits in the `(store)` layout) |

## The contract with the container

The container was inspected from its public script on 2026-11-13. It has a Google tag (Initialization) and **one**
GA4 event tag, `eventName = {{Event}}`, fired by a Custom Event trigger on exactly:

`view_item_list · select_item · view_item · add_to_cart · remove_from_cart · view_cart · begin_checkout ·
add_shipping_info · add_payment_info · purchase`

It sends only these dataLayer keys: `ecommerce.currency · value · items · transaction_id · shipping · coupon ·
payment_type · shipping_tier`. So **an ecommerce event must be `{ event, ecommerce: {…} }`** (with
`{ ecommerce: null }` pushed first — `pushEcommerce` does that). `tax` is pushed too but the container does not read it
yet (harmless; add a parameter row if you want GA4 to have it).

Everything else is an *interaction event*: `{ event, event_params: {…} }`, handled by the second tag imported from
`docs/analytics/gtm-interactions-import.json` (see "Import into GTM"). **If you add an event or a parameter in
`analytics.ts`, add it to the container too**, or it is pushed and never sent.

## Event dictionary

### Ecommerce (already wired in the container)

| Event | Fires when | Code |
|---|---|---|
| `view_item_list` | a product list is ≥30 % on screen, once per page view: **The Three**, **In Focus** (home), **Related fragrances** (PDP), **Bag suggestions** (drawer) | `ListImpression` |
| `select_item` | any click on a link to `/fragrances/<slug>` or `/discovery-set`; `item_list_name` = where the link sits (The Three, In Focus, Header, Footer, Menu drawer, Bag drawer, Related fragrances…) | `AnalyticsRoot` (one capture-phase listener — also catches the picture-flight links) |
| `view_item` | a product page opens (the size on show; `?size=` aware) and the Discovery Set page | `PdpAnalytics`, `ViewItem` |
| `add_to_cart` | any add-to-bag, and the stepper's "+"; `item_list_name` = the button's list ("Product page", "The Three", "Quiz result", "Bag suggestions"…) | `cart-provider.addItem / setQty` |
| `remove_from_cart` | the stepper's "−" and the remove button | `cart-provider.setQty / removeItem` |
| `view_cart` | the bag drawer opens on the bag view with something in it | `cart-provider` effect |
| `begin_checkout` | "Proceed to checkout" (once per trip into the checkout view) | `cart-provider.goToCheckout` |
| `add_shipping_info` / `add_payment_info` | the shopper presses **Pay / Place order** with a valid form, once per visit to checkout (checkout is one step here, so both fire together; `shipping_tier` = Free shipping / Standard, `payment_type` = Online (Razorpay) / Cash on delivery) | `checkout-panel.onPay` |
| `purchase` | an order is **confirmed**: COD order placed, or Razorpay payment verified as captured by the server (the same gate that creates the order). Once per order number (persisted in `localStorage`) | `checkout-panel.reportPurchase` |

**Revenue definition.** `value` = items at the price charged **minus the coupon**, excluding shipping and the COD fee
(sent as `shipping`). Prices are GST-inclusive; `tax` carries the GST inside them. Store credit is a way of paying, not a
discount, so it is not subtracted. COD orders count as purchases when placed (cancellations/returns are not netted out
yet — see "Not built yet").

Items carry `item_id` (SKU), `item_name`, `item_brand` (THE RARESKIN), `item_category` (Fragrance / Discovery Set),
`item_category2` (Extrait de Parfum), `item_variant` ("50 ml" / "3 × 10 ml"), `price`, `discount` (MRP − price),
`quantity`, and `item_list_id/name`.

### Interaction (needs the imported tag)

| Event | Parameters | Fires when |
|---|---|---|
| `view_promotion` / `select_promotion` | `promotion_id`, `promotion_name`, `creative_slot` | elements marked `data-ga-promo="<name>"` (+ `data-ga-slot`, and `data-ga-view` to opt into impressions): hero CTAs, launch-price pass, announcement bar |
| `select_size` | `item_id`, `item_name`, `size_ml`, `size_state` (available / soon / soldout) | the visitor switches size on a PDP — **the demand signal for the 10 ml and 100 ml before they are on sale** |
| `quiz_complete` | `quiz_result` (fragrance) | the last quiz answer |
| `login` / `sign_up` | `method` (= phone) | OTP verified; `sign_up` when the account was just created |
| `generate_lead` | `form_name` (contact / newsletter) | the form was accepted by the server |
| `apply_coupon` | `coupon`, `coupon_result` (applied / rejected) | the server's verdict on a typed code |
| `payment_failed` | `payment_type`, `reason` (declined / dismissed / window_failed / the server's error code) | a payment attempt did not produce an order |
| `checkout_error` | `reason` (the place-order error code: not-serviceable, sold-out, cart-changed…) | the server refused to place the order |
| `contact_click` | `contact_method` (whatsapp / email / phone), `link_location` | a wa.me, mailto: or tel: link |

Automatic (GA4 Enhanced Measurement, no code): `page_view` (incl. history changes — SPA), `scroll`, outbound
`click`, `file_download`, `user_engagement`, `session_start`, `first_visit`.

No personal data is ever sent: no phone, email, address, name — product ids, prices, order number, coarse labels.

## Where events do NOT go

`localhost`, LAN addresses (phone testing), `*.local` and `*.vercel.app` never load GTM, even when `NEXT_PUBLIC_GTM_ID` is
set in `.env.local` (`google-tag-manager.tsx`). So developing doesn't add fake visitors to the live reports. To test the
container from one of those hosts: `localStorage.setItem("rs:gtm","on")` in the console, reload, use GTM Preview.

**Page content mounts twice on a hard load on desktop** (`SmoothScroll` swaps `<>{children}</>` for `<ReactLenis>` after
it sees a mouse, which remounts everything ~100 ms after hydration). Keyed page-view events (`view_item`,
`view_item_list`, `view_promotion`) are therefore deduped by key + 3 s (`seenRecently` in `analytics.ts`).

## Testing

1. **dataLayer** (any host, no GTM needed): open DevTools → `dataLayer`. In development every push is also logged as
   `[analytics] …` in the console.
2. **GTM Preview** (tagassistant.google.com) against https://www.therareskin.com — each event shows its tag firing.
3. **GA4 DebugView** (Admin → DebugView) — shows the events GA4 actually received, with parameters, within seconds.
   GTM Preview traffic is flagged as debug traffic automatically.
4. **Realtime** (Reports → Realtime) — a normal visit shows `page_view` + `view_item_list` + `view_item` within a minute.

Reports (Monetization → Ecommerce purchases, Purchase journey, Checkout journey) fill 24–48 h after the first events.

## Import into GTM (interaction events)

GTM → **Admin → Import Container** → choose `docs/analytics/gtm-interactions-import.json` → *Existing* workspace
(a new one, e.g. "RS interactions") → **Merge** → *Rename conflicting tags, triggers, variables* → Confirm.
It adds one tag (`RS GA4 - interaction events`), one trigger (`RS - interaction events`) and 16 variables
(`RS DLV - event_params.*`). It does not touch the existing tags. Then **Preview**, trigger an event, **Submit → Publish**.

Don't import it twice, and don't also create the same events another way: events would be counted twice.

## GA4 admin checklist (does not live in the code)

1. **Key events** — Admin → Data display → Events → mark `purchase`, `begin_checkout`, `add_to_cart`, `generate_lead`,
   `sign_up` as key events (an event appears in the list ~a day after its first hit; or Admin → Key events → New key event).
2. **Event data retention** — Admin → Data collection and modification → Data retention → **14 months** (default is 2).
3. **Data filters** — Admin → Data filters: activate **Developer traffic**, and create **Internal traffic** (define your
   IP under Data streams → Configure tag settings → Define internal traffic) — start in *Testing*, then *Active*.
4. **Enhanced measurement** (web stream gear icon): keep page views (incl. "page changes based on browser history events"),
   scrolls, outbound clicks, file downloads; switch **Form interactions OFF** (`generate_lead` replaces it).
5. **List unwanted referrals** — Data streams → Configure tag settings: `razorpay.com`, `checkout.razorpay.com`,
   `rzp.io` (a payment hop must not start a new "referral" session).
6. **Custom dimensions** (Admin → Custom definitions, scope *Event*), so the interaction parameters appear in reports:
   `method`, `form_name`, `contact_method`, `link_location`, `quiz_result`, `size_ml`, `size_state`, `reason`,
   `coupon_result`. (Promotion name/slot, payment type, shipping tier, order coupon, item list name are built in.)
7. **UTM-tag every link you publish** (Instagram bio, WhatsApp broadcasts, newsletters):
   `?utm_source=instagram&utm_medium=social&utm_campaign=bio` — otherwise it lands in Direct / Unassigned.
8. Currency is **INR** (reports already show ₹) and time zone **IST** — confirm under Property settings.

## Not built yet

- **Server-side `purchase` / `refund`** (GA4 Measurement Protocol). The browser `purchase` is lost if the shopper closes
  the tab after paying and the order is created by the webhook, and cancellations/refunds are never netted out. Needs a
  GA4 API secret and the `_ga` client id stored on the checkout intent.
- **`user_id`** for signed-in shoppers (cross-device journeys) — an opaque internal id, never the phone or email.
- **Google sign-in** is staff-only, so it is not tracked as `login`.
- **Consent banner** — the container has no consent mode configured.
