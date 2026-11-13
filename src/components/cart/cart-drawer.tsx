"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";

import { useCart } from "@/components/providers/cart-provider";
import { useRouteTransition } from "@/components/providers/route-transition";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSlideDialog } from "@/hooks/use-slide-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { TickMark } from "@/components/ui/spinner";
import { formatPaise } from "@/lib/money";
import { unlockScroll } from "@/lib/scroll-lock";
import { BagView } from "./bag-view";
import { CartMarquee } from "./cart-marquee";
import { CartToast } from "./cart-toast";

// The checkout (forms, validation, the payment hand-off) is the biggest single piece of the bag and nobody
// needs it until they tap Checkout, so it is its own chunk: not in the bundle every page loads. It is
// warmed once the page is idle (below), so by the time the drawer opens it is already in the cache.
const loadCheckoutPanel = () => import("./checkout-panel");
const CheckoutPanel = dynamic(() => loadCheckoutPanel().then((m) => m.CheckoutPanel), {
  ssr: false,
  loading: () => <div className="flex-1" />,
});

const TRI_JUICE =
  "linear-gradient(90deg, #e0d7bf 0%, #c5872f 52%, #3d2712 100%)";

/**
 * The shopping bag: one right-anchored panel with three views, switched by
 * `view` from the cart provider and shown one at a time (no filmstrip):
 *
 *   bag       the new bag (`BagView`): free-delivery meter, product cards,
 *             one-tap add-ons, trust + payment reassurance, price summary
 *   checkout  the existing `CheckoutPanel` under a "Back to Bag" bar
 *   done      the order confirmation, with its auto-redirect to the order
 *
 * Native <dialog> + showModal() for the focus trap / ESC. The drawer is light
 * (`.rh-lt`: paper and ink, with the ticker ribbon and the buttons in onyx) and
 * opens exactly like the menu drawer:
 * the same CSS slide, driven by the same hook (`useSlideDialog`, which also
 * holds the page's scroll lock). While Razorpay's own overlay is up
 * (`modalSuspended`) the dialog drops to a non-modal `show()` so that overlay
 * sits in front of it.
 */
export function CartDrawer({
  freeShippingAbove = 0,
  shippingFlat = 0,
  codEnabled = true,
}: {
  /** order value (rupees) from which delivery is free; 0 = every order ships free */
  freeShippingAbove?: number;
  /** delivery fee (rupees) below that threshold; 0 = none set in the admin settings */
  shippingFlat?: number;
  /** cash on delivery is switched on in the admin settings */
  codEnabled?: boolean;
}) {
  const {
    isOpen,
    view,
    closeCart,
    backToBag,
    count,
    placedOrder,
    modalSuspended,
  } = useCart();
  // how far along the shopper is: the bag, the checkout, placed. It fills as they move, so the drawer
  // always says where they are in the order
  const journey = view === "done" ? 1 : view === "checkout" ? 0.66 : count > 0 ? 0.33 : 0;
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** true while we flip the dialog's modal level ourselves — the resulting
   *  `close` event must not be read as the user closing the drawer. */
  const suppressCloseRef = useRef(false);
  const lenis = useLenis();
  const shown = useSlideDialog(dialogRef, isOpen, "cart", reduced);

  useEffect(() => {
    if (isOpen) lenis?.stop();
    else lenis?.start();
  }, [isOpen, lenis]);

  // fetch the checkout chunk once the browser is idle: off the critical path, in the cache before it is asked for
  useEffect(() => {
    const warm = () => void loadCheckoutPanel();
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(id);
  }, []);

  // A top-layer modal paints above every z-indexed element on the page, so a
  // third-party payment overlay (Razorpay Checkout) would open *behind* the
  // drawer. While `modalSuspended` is set, drop to a non-modal `show()` so the
  // overlay sits in front; re-enter `showModal()` once it closes. The `close`
  // event this triggers is masked so it doesn't collapse the drawer.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg || !dlg.open) return;

    let isModal = true;
    try {
      isModal = dlg.matches(":modal");
    } catch {
      /* :modal unsupported — assume modal, the toggle below still corrects it */
    }
    if (modalSuspended !== isModal) return; // already in the right mode

    suppressCloseRef.current = true;
    dlg.close();
    if (modalSuspended) {
      dlg.show();
    } else {
      dlg.showModal();
    }
    const clear = window.setTimeout(() => {
      suppressCloseRef.current = false;
    }, 0);
    return () => window.clearTimeout(clear);
  }, [modalSuspended]);

  // ESC → animated close; also re-sync state if the dialog was closed from
  // outside (e.g. the route transition force-closes open dialogs).
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      closeCart();
    };
    const onClose = () => {
      // our own modal-level flip, not a real close — ignore it
      if (suppressCloseRef.current) {
        suppressCloseRef.current = false;
        return;
      }
      unlockScroll("cart");
      if (isOpen) closeCart();
    };
    dlg.addEventListener("cancel", onCancel);
    dlg.addEventListener("close", onClose);
    return () => {
      dlg.removeEventListener("cancel", onCancel);
      dlg.removeEventListener("close", onClose);
    };
  }, [closeCart, isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Your shopping bag and checkout"
      className={`rh-sbdlg${shown ? " is-open" : ""}`}
    >
      <div onClick={closeCart} aria-hidden className="rh-scrim" />
      <aside
        className={`rh-cart rh-lt ui-surface absolute inset-y-0 right-0 flex w-[min(480px,100vw)] flex-col border-l border-line text-ink${shown ? " is-open" : ""}`}
      >
        {view !== "done" && <CartMarquee freeShippingAbove={freeShippingAbove} />}

        {/* ── header: changes with the view, stays put while the body scrolls ── */}
        <header
          className="rh-in relative flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-5"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <span
            aria-hidden="true"
            className="rh-journey"
            style={{ transform: `scaleX(${journey})` }}
          />
          {view === "checkout" ? (
            <button
              type="button"
              onClick={backToBag}
              className="group -ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-[11px] font-medium tracking-[0.16em] text-ink-2 uppercase transition-colors hover:text-ink"
            >
              <Icon
                name="arrowLeft"
                className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
              />
              Back to Bag
            </button>
          ) : (
            <h2 className="flex items-center gap-3 text-[12px] leading-none font-medium tracking-[0.2em] uppercase">
              {view === "done" ? "Order confirmed" : "Shopping Bag"}
              {view === "bag" && count > 0 && (
                <span
                  aria-label={`${count} ${count === 1 ? "item" : "items"}`}
                  className="rounded-full border border-line-2 bg-surface-2 px-2 py-[3px] text-[10.5px] leading-none font-medium tracking-normal tabular-nums text-ink-2"
                >
                  {count}
                </span>
              )}
            </h2>
          )}

          <div className="flex items-center gap-1">
            {view === "checkout" && (
              <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-ink-3 uppercase">
                <Icon name="lock" className="size-3" />
                Secure checkout
              </span>
            )}
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close"
              className="-mr-2 grid size-11 place-items-center rounded-full text-ink-2 transition-[color,background-color,transform] duration-300 hover:rotate-90 hover:bg-ink/10 hover:text-ink"
            >
              <Icon name="close" className="size-[15px]" />
            </button>
          </div>
        </header>

        {/* ── body: one view at a time ───────────────────────────────── */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {view === "bag" && (
            <BagView
              freeShippingAbove={freeShippingAbove}
              shippingFlat={shippingFlat}
              codEnabled={codEnabled}
              onClose={closeCart}
            />
          )}

          {/* Kept mounted while the drawer is open (hidden outside the checkout
              view) so an address, coupon or email typed there survives a trip
              back to the bag; it unmounts when the drawer closes. */}
          {(isOpen || view === "checkout") && (
            <div
              className={
                view === "checkout"
                  ? "rh-view flex min-h-0 flex-1 flex-col"
                  : "hidden"
              }
            >
              <CheckoutPanel />
            </div>
          )}

          {view === "done" && (
            <div className="rh-view flex min-h-0 flex-1 flex-col">
              <Confirmation
                key={placedOrder?.orderNumber ?? "none"}
                order={placedOrder}
                onClose={closeCart}
              />
            </div>
          )}
        </div>

        {/* the page-level toast sits behind this top-layer dialog, so the drawer carries its own */}
        <CartToast placement="drawer" />
      </aside>
    </dialog>
  );
}

/** Seconds the confirmation lingers before it carries a paid shopper to their
 *  order. Long enough to read the confirmation, short enough not to nag. */
const REDIRECT_SECS = 5;

/**
 * Sixteen specks of gilt that lift off the tick and fade: fixed, not random, so the
 * same celebration plays every time and render stays pure. Each is a (dx, dy) offset
 * from the tick's centre plus a size, a delay and a tone.
 */
const DUST = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 2 ? 0.22 : 0);
  const reach = 58 + (i % 4) * 15;
  return {
    dx: Math.round(Math.cos(angle) * reach),
    dy: Math.round(Math.sin(angle) * reach) - 4,
    sz: 3 + (i % 3),
    d: 0.58 + (i % 5) * 0.035,
    c: i % 3 === 0 ? "var(--gilt)" : i % 3 === 1 ? "var(--brass)" : "var(--color-ink-3)",
  };
});

const TIMELINE = ["Confirmed", "Packed", "Shipped", "Delivered"] as const;

function Confirmation({
  order,
  onClose,
}: {
  order: {
    orderNumber: string;
    method: "razorpay" | "cod";
    paid: boolean;
    summary?: { totalPaise: number; items: number; email: string };
  } | null;
  onClose: () => void;
}) {
  const { navigate } = useRouteTransition();
  const reduced = useReducedMotion();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECS);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [copied, setCopied] = useState(false);
  const firedRef = useRef(false);
  const copyTimer = useRef<number | undefined>(undefined);

  const orderNumber = order?.orderNumber ?? null;
  const paid = order?.paid ?? false;
  const orderHref = orderNumber ? `/account/orders/${orderNumber}` : "/account/orders";

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const goToOrder = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onClose(); // slide the drawer out
    window.setTimeout(() => navigate(orderHref), reduced ? 0 : 260);
  };

  /** the order number is something people screenshot, paste into a message, read out to support */
  const copyNumber = async () => {
    if (!orderNumber) return;
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the number is still on screen */
    }
  };

  // Paid orders auto-advance to the order page after a short, visible countdown.
  // A `key` on this component (the order number) gives every order a fresh mount,
  // so `secondsLeft` starts at REDIRECT_SECS without a reset inside the effect.
  useEffect(() => {
    if (!paid || !orderNumber || !autoRedirect) return;
    firedRef.current = false;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const remaining = Math.max(
        0,
        REDIRECT_SECS - Math.floor((Date.now() - startedAt) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(id);
        goToOrder();
      }
    }, 250);
    return () => window.clearInterval(id);
    // goToOrder is stable enough for this lifecycle; deps kept minimal on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, orderNumber, autoRedirect]);

  if (!order) return <div className="flex-1" />;

  const progress =
    ((REDIRECT_SECS - secondsLeft) / REDIRECT_SECS) * 100;
  const step = (n: number) => ({ "--i": n }) as React.CSSProperties;
  const { summary } = order;

  return (
    <>
      <div
        data-lenis-prevent
        className="flex flex-1 flex-col items-center overflow-y-auto overscroll-contain px-8 py-8 text-center [@media(min-height:760px)]:justify-center"
      >
        {/* the tick draws itself, rings ripple out from it, gilt dust lifts */}
        <div className="relative mb-6 inline-grid">
          <div className="rh-burst" aria-hidden="true">
            {DUST.map((d, i) => (
              <i
                key={i}
                style={
                  {
                    "--dx": `${d.dx}px`,
                    "--dy": `${d.dy}px`,
                    "--sz": `${d.sz}px`,
                    "--d": `${d.d}s`,
                    "--c": d.c,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <span className="rh-ok" aria-hidden="true">
            <span className="rh-ok__disc" />
            <span className="rh-ok__ripple" />
            <svg className="rh-ok__svg" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="37" pathLength={1} />
              <path d="M24 39.5 L34 49 L53 27" pathLength={1} />
            </svg>
          </span>
        </div>

        <p className="eyebrow rh-cascade mb-2 text-ok" style={step(0)}>
          {paid ? "Payment received" : "Order placed"}
        </p>
        <h3
          className="serif rh-cascade text-[1.7rem] leading-tight tracking-[-0.01em] text-ink"
          style={step(1)}
        >
          {order.orderNumber}
        </h3>
        <button
          type="button"
          onClick={() => void copyNumber()}
          aria-label={copied ? "Order number copied" : "Copy order number"}
          className="rh-cascade mt-1 rounded-[2px] px-2 py-1 text-[10px] tracking-[0.16em] text-ink-3 uppercase transition-colors hover:text-ink"
          style={step(1)}
        >
          <span className="rh-swap" data-state={copied ? "done" : "idle"}>
            <span className="rh-swap__a" aria-hidden={copied || undefined}>
              Copy order number
            </span>
            <span className="rh-swap__b" aria-hidden={!copied}>
              <TickMark on={copied} className="size-3" />
              Copied
            </span>
          </span>
        </button>
        <p
          className="rh-cascade mx-auto mt-3 max-w-[32ch] text-[13px] leading-relaxed text-ink-2"
          style={step(2)}
        >
          {order.method === "cod"
            ? "You’ll pay the courier in cash on arrival. We’ll confirm dispatch by SMS."
            : paid
              ? "Thank you — your payment is confirmed. A receipt is on its way to your email and we’ll text you when it ships."
              : "Your order is held for 30 minutes. Reopen it from your account to complete payment."}
        </p>

        {/* the receipt: a paper slip with notched edges */}
        {summary && (
          <div
            className="rh-slip rh-cascade mt-6 w-full max-w-[320px] px-5 py-5 text-left"
            style={step(3)}
          >
            <dl className="space-y-2.5 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-3">{paid ? "Paid" : "To pay on delivery"}</dt>
                <dd className="serif text-[1.3rem] leading-none tabular-nums text-ink">
                  {formatPaise(summary.totalPaise)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-3">{summary.items === 1 ? "Item" : "Items"}</dt>
                <dd className="tabular-nums text-ink">{summary.items}</dd>
              </div>
              {summary.email && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-ink-3">Receipt to</dt>
                  <dd className="min-w-0 truncate text-ink">{summary.email}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* what happens next: the first stop is already lit */}
        <ol
          aria-label="What happens next"
          className="rh-cascade mt-6 flex w-full max-w-[320px] items-start justify-between text-[9.5px] tracking-[0.1em] uppercase"
          style={step(4)}
        >
          {TIMELINE.map((label, i) => (
            <li
              key={label}
              className="relative flex flex-1 flex-col items-center gap-2 text-ink-3 data-[on]:text-ink"
              data-on={i === 0 ? "" : undefined}
            >
              <span
                aria-hidden="true"
                className={
                  i === 0
                    ? "rh-live-dot relative z-[1] size-2.5 rounded-full border border-ok bg-ok"
                    : "relative z-[1] size-2.5 rounded-full border border-line-2 bg-surface"
                }
              />
              {i < TIMELINE.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-[5px] left-[calc(50%+9px)] h-px w-[calc(100%-18px)] bg-line-2"
                />
              )}
              {label}
            </li>
          ))}
        </ol>

        {paid && autoRedirect && (
          <div className="rh-cascade mt-7 w-full max-w-[240px]" style={step(5)}>
            <div className="relative h-px overflow-hidden bg-line-2">
              <span
                className="absolute inset-y-0 left-0 transition-[width] duration-[250ms] ease-linear"
                style={{ width: `${progress}%`, backgroundImage: TRI_JUICE }}
              />
            </div>
            <p className="mt-2.5 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">
              Opening your order in{" "}
              <span className="tabular-nums text-ink">{secondsLeft}s</span>
            </p>
          </div>
        )}

        <Logo
          className="mt-8 shrink-0 text-ink-3"
          style={{ width: "96px", opacity: 0.5 }}
        />
      </div>
      <footer className="shrink-0 space-y-2.5 border-t border-line px-6 pt-4 pb-[calc(22px+env(safe-area-inset-bottom))]">
        <Button onClick={goToOrder} className="w-full">
          {paid && autoRedirect ? "View order now" : "View order"}
        </Button>
        <button
          type="button"
          onClick={() => {
            if (paid && autoRedirect) {
              setAutoRedirect(false);
            } else {
              onClose();
            }
          }}
          className="w-full py-2 text-[10px] tracking-[0.16em] text-ink-3 uppercase transition-colors hover:text-ink"
        >
          {paid && autoRedirect ? "Stay here" : "Keep shopping"}
        </button>
      </footer>
    </>
  );
}
