# Micro-interactions

`src/app/motion.css` is the page's ambient feel (hover, scroll reveals, parallax). **`src/app/micro.css`
is the other half: feedback for what someone just did**, concentrated in the order flow (add to bag → bag
→ checkout → payment → confirmation) and the forms around it.

## Rules (also at the top of `micro.css`)

1. **Acknowledge at once** (a press, a state change in < 100 ms), show progress if it takes longer than
   ~300 ms, mark the finish with one distinct beat.
2. Only `transform`, `opacity`, `stroke-dashoffset`, `background-size` move. Nothing changes layout, so
   CLS stays 0. A control that goes "loading" **keeps its width**.
3. Resting state = the visible state. Animations only use `backwards` fills / `from` keyframes, so a
   missed animation never hides content.
4. Anything that moves is inside `@media (prefers-reduced-motion: no-preference)`. Under `reduce` a state
   change is still *shown* (a colour, an opacity, a static glyph) but nothing travels, spins or shakes.
   `haptic()` and `flyToBag()` also bail out for reduced motion.

## Primitives

| What | Where | Notes |
| --- | --- | --- |
| Busy button | `<Button loading={bool} loadingLabel="…">` (`ui/button.tsx`) | Opt-in: a button that never passes `loading` renders as before. Idle + busy labels share one grid cell, so no layout shift. Disabled while loading, but not dimmed. |
| Spinner / tick | `ui/spinner.tsx` → `<Spinner/>`, `<TickMark on/>` | `currentColor`, sized in `em`. The tick draws itself (`pathLength=1`). |
| Rolling number | `ui/odometer.tsx` → `<Odometer text="₹1,598"/>` | Digits are keyed from the right so existing columns roll when the value changes. For text with spaces / words use plain text (it is for figures). `Ticker` is the play-once version for load. |
| Label swap | `.rh-swap` (`add-to-bag-button.tsx`, confirmation's copy button) | Two labels in one cell, `data-state="done"` slides the second in. |
| Shake | `shake(el)` (`lib/attention.ts`) / `.rh-shake` | Restarts the animation. Red flash under reduced motion. |
| Haptics | `haptic("tap" \| "soft" \| "success" \| "error")` (`lib/haptics.ts`) | Android only; no-op elsewhere. |
| Fly to bag | `flyToBag(buttonEl, {color})` (`lib/fly-to-bag.ts`) | Targets `[data-bag-target]` (the header bag button). Skipped when the bag is open or the icon is off-screen. |
| Field underline | `.rh-fld` | Grows from the middle on focus, red when `aria-invalid`. |
| Radio | `.rh-radio` after a `sr-only` native input | The dot springs in. |
| Toast | `cart-toast.tsx`, state in `cart-provider.tsx` (`toastState`) | Two mounts: `page` (bag closed) and `drawer` (bag open; the drawer is a top-layer dialog, so a page toast would be hidden and inert). `notify(msg, {action, tone, ms})`. |

## The order flow, step by step

- **Add to bag**: tick draws + "Added", a drop of the scent's colour arcs to the bag icon, which catches
  it; count rolls; toast with **View bag** (page toast lifts above the sticky bag bar via
  `html[data-cart-bar]`). Inside the open bag the new line lights up instead (`.rh-fresh`).
- **Bag**: quantity and prices roll; the free-delivery bar rings + glints the moment it unlocks;
  **Remove → toast with Undo** (restores the full line).
- **Drawer header**: a journey hairline fills bag → checkout → placed (`.rh-journey`).
- **Checkout**
  - Re-pricing: a live hairline along the top; the total dims until the new figure lands; `Delivery`
    shows a shimmer before the first quote.
  - The Pay button is **live as soon as the price is known**. With something missing it shows why
    ("Add your delivery address to continue") and pressing it scrolls to, focuses and shakes the first
    problem. Field errors disappear the moment the field is fixed (`shownErr`).
  - PIN field: spinner → tick / cross inline, with the serviceability message.
  - Coupon: *Checking…* (spinner) → *applied* (tick + wash, total rolls) or refused (reason kept, row
    shakes). The chip no longer claims "applied" before the server has said so.
- **Payment** (`payment-overlay.tsx`, phases in `checkout-panel.tsx`): `securing → window → confirming`,
  three honest named steps that tick off as they really happen. The content under the overlay is `inert`.
  "Confirming with your bank" is held ≥ 1.1 s so a fast server still reads as a step; the drawer returns to
  modal the instant the Razorpay window closes. COD gets a single "Placing your order" line.
- **Confirmation**: the tick and ring draw, gilt dust lifts, receipt slip (amount, items, receipt email),
  four-stop "what happens next" line, tap-to-copy order number, then the existing 5 s redirect rail.
- **Sign-in**: busy buttons; OTP cells run a wave while a code is checked and the row shakes on a wrong one.
- **Contact / newsletter**: busy buttons / spinner, shake on error, drawn tick on success.

## Adding to it

- A new button that waits on the network: `loading={busy} loadingLabel="Doing the thing…"`.
- A figure that changes: `<Odometer text={formatINR(x)} />` (it needs the surrounding element's
  `line-height` to be set, as the digit column is `1lh` tall).
- A field that can be wrong: give the input `aria-invalid` + the `rh-fld` class and call `shake()` on its
  wrapper from an effect (after the error has rendered).
- Check every new animation under reduced motion: it must end in the same visible state.

## Testing without real SMS / payments

The whole flow can be driven in the browser without touching Twilio, Razorpay or the database by stubbing
`window.fetch` for `/api/auth/*`, `/api/checkout/{quote,place}`, `/api/payments/razorpay/callback` and
defining a fake `window.Razorpay` whose `open()` calls `handler` / `ondismiss` after a delay. The stub has
to be installed **after** load (the auth provider reads the session on mount), then sign in through the real
modal with any code the stub accepts.
