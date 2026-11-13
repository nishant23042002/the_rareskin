"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  cartReducer,
  cartCount,
  cartSubtotal,
  cartSavings,
  cartListTotal,
  readCart,
  writeCart,
  initialCartState,
  MAX_QTY,
  type CartLine,
} from "@/lib/cart";
import { useAuth } from "@/components/providers/auth-provider";
import { isFragranceSlug, type BagSuggestion } from "@/lib/catalog";
import * as ga from "@/lib/analytics";

const noopSubscribe = () => () => {};

/** Where an add-to-bag came from when the button did not say: the page it happened on. */
function listFromPath(): string {
  if (typeof window === "undefined") return "Site";
  const p = window.location.pathname;
  if (p === "/") return "Home";
  if (p.startsWith("/fragrances/")) return "Product page";
  if (p.startsWith("/discovery-set")) return "Discovery Set page";
  return "Site";
}

/** The drawer is one panel that slides between three views. */
type CartView = "bag" | "checkout" | "done";

interface PlacedOrder {
  orderNumber: string;
  method: "razorpay" | "cod";
  /** true once payment is confirmed (Razorpay) — COD stays false */
  paid: boolean;
  /** what the confirmation's receipt shows (the bag is already empty by then) */
  summary?: {
    totalPaise: number;
    items: number;
    email: string;
  };
}

export type ToastTone = "added" | "removed" | "info";
export interface ToastAction {
  label: string;
  run: () => void;
}
export interface ToastState {
  /** a fresh id per toast, so the same words twice still replay the animation */
  id: number;
  message: string;
  tone: ToastTone;
  action: ToastAction | null;
  /** how long it stays (ms); drives the countdown hairline */
  ms: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** rupees off MRP across the bag (0 when nothing is discounted) */
  savings: number;
  /** bag total at MRP — the struck-through "before" figure */
  listTotal: number;
  /** the rest of the range, for the drawer's "complete the collection" strip */
  suggestions: BagSuggestion[];
  /** false until localStorage has been read (avoids an empty-bag flash) */
  hydrated: boolean;
  isOpen: boolean;
  view: CartView;
  /** the order just placed, shown on the `done` view */
  placedOrder: PlacedOrder | null;
  toast: string | null;
  /** the toast's detail: its kind, an optional action (Undo), how long it stays */
  toastState: ToastState | null;
  dismissToast: () => void;
  openCart: () => void;
  closeCart: () => void;
  /** slide to the checkout view (opening the drawer if needed) */
  goToCheckout: () => void;
  /**
   * Can this visitor start checkout? False while `flags.checkoutEnabled` is off,
   * except for signed-in staff. The buttons show "opens with launch" and
   * `goToCheckout` does nothing; the server enforces it too.
   */
  checkoutAvailable: boolean;
  /** slide back to the bag */
  backToBag: () => void;
  /** order placed — slide to confirmation and empty the bag */
  completeOrder: (order: PlacedOrder) => void;
  /**
   * The drawer is a top-layer `<dialog showModal()>`, which sits above every
   * z-indexed element on the page — including a third-party payment overlay
   * (Razorpay Checkout). While `modalSuspended` is true the drawer drops to a
   * non-modal `show()` so that overlay can render in front of it; call
   * `resumeModal()` once the overlay closes.
   */
  modalSuspended: boolean;
  suspendModal: () => void;
  resumeModal: () => void;
  /** `list` names where the add happened, for analytics only (defaults to the page it is on) */
  addItem: (line: Omit<CartLine, "qty"> & { qty?: number }, list?: string) => void;
  setQty: (sku: string, qty: number) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  suggestions = [],
  checkoutEnabled = true,
}: {
  children: ReactNode;
  suggestions?: BagSuggestion[];
  /** `flags.checkoutEnabled` from Site Settings (staff can always check out) */
  checkoutEnabled?: boolean;
}) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<CartView>("bag");
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [modalSuspended, setModalSuspended] = useState(false);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const toast = toastState?.message ?? null;
  const toastId = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);
  const resetTimer = useRef<number | undefined>(undefined);
  const { hydrated } = state;

  useEffect(() => {
    dispatch({ type: "hydrate", lines: readCart() });
  }, []);

  useEffect(() => {
    if (hydrated) writeCart(state.lines);
  }, [state.lines, hydrated]);

  // On sign-in, fold the guest bag into the account's server cart (which may
  // hold items added on another device) and adopt the union locally.
  const { status, user } = useAuth();
  // The auth state can already be known on the first client render (it is read from the session cache), but
  // the server never knows it. If staff status counted from that first render, a signed-in staff account would
  // hydrate "Checkout" over the server's "Opens at launch" (the sticky bag bar, the bag), and React would throw
  // the tree away and rebuild it on the client. So it counts only once hydrated: the server snapshot is `false`.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const checkoutAvailable = checkoutEnabled || (mounted && Boolean(user?.isStaff));
  const prevStatus = useRef(status);
  const stateRef = useRef(state);
  const mergingRef = useRef(false);
  const viewRef = useRef<CartView>("bag");
  const isOpenRef = useRef(false);
  useEffect(() => {
    stateRef.current = state;
    viewRef.current = view;
    isOpenRef.current = isOpen;
  });

  // GA4 view_cart: the drawer just opened on the bag (not on checkout) with something in it.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened && view === "bag" && state.lines.length > 0) {
      ga.viewCart(state.lines.map((l) => ga.itemFromLine(l)));
    }
  }, [isOpen, view, state.lines]);

  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if (status !== "authed" || was === "authed" || !hydrated) return;

    mergingRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const local = stateRef.current.lines;
        await fetch("/api/cart?merge=1", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: local.map((l) => ({ sku: l.sku, qty: l.qty })),
          }),
        });
        const res = await fetch("/api/cart", { cache: "no-store" });
        const data = (await res.json()) as {
          ok: boolean;
          lines?: {
            slug: string;
            name: string;
            sku: string;
            qty: number;
            unitPrice: number;
            mrp: number;
          }[];
        };
        if (cancelled || !data.ok || !data.lines) return;
        const byLocalSku = new Map(local.map((l) => [l.sku, l]));
        const serverSkus = new Set(data.lines.map((l) => l.sku));
        const merged: CartLine[] = data.lines.map((sl) => {
          const prev = byLocalSku.get(sl.sku);
          return {
            sku: sl.sku,
            name: sl.name,
            price: sl.unitPrice,
            mrp: sl.mrp || undefined,
            qty: sl.qty,
            fragrance:
              prev?.fragrance ??
              (isFragranceSlug(sl.slug) ? sl.slug : undefined),
            href: prev?.href,
            meta: prev?.meta,
          };
        });
        // The merge is a union — never let a stale server response drop an item
        // the shopper just added locally.
        for (const l of local) {
          if (!serverSkus.has(l.sku)) merged.push(l);
        }
        if (!cancelled && merged.length > 0) {
          dispatch({ type: "hydrate", lines: merged });
        }
      } catch {
        /* keep the local bag as-is */
      } finally {
        mergingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, hydrated]);

  // Keep a signed-in shopper's server cart in step with the working bag
  // (persistence + a base for abandoned-cart later). Debounced; paused during
  // the login merge so the two never race.
  useEffect(() => {
    if (status !== "authed" || !hydrated || mergingRef.current) return;
    const t = setTimeout(() => {
      fetch("/api/cart", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: state.lines.map((l) => ({ sku: l.sku, qty: l.qty })),
        }),
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [state.lines, status, hydrated]);

  const notify = useCallback(
    (
      message: string,
      opts: { tone?: ToastTone; action?: ToastAction; ms?: number } = {},
    ) => {
      // a toast with an Undo stays long enough to read it and decide
      const ms = opts.ms ?? (opts.action ? 5200 : 2200);
      toastId.current += 1;
      setToastState({
        id: toastId.current,
        message,
        tone: opts.tone ?? "added",
        action: opts.action ?? null,
        ms,
      });
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToastState(null), ms);
    },
    [],
  );

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToastState(null);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const closeCart = useCallback(() => {
    setIsOpen(false);
    setModalSuspended(false);
    // reset the view after the close animation so it doesn't flicker on the way out
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setView("bag");
      setPlacedOrder(null);
    }, 520);
  }, []);

  const suspendModal = useCallback(() => setModalSuspended(true), []);
  const resumeModal = useCallback(() => setModalSuspended(false), []);

  const openCart = useCallback(() => {
    window.clearTimeout(resetTimer.current);
    setView((v) => (v === "done" ? "bag" : v));
    setIsOpen(true);
  }, []);

  const goToCheckout = useCallback(() => {
    if (!checkoutAvailable) return;
    // GA4 begin_checkout — once per trip into checkout, not on every re-press
    if (viewRef.current !== "checkout") {
      ga.beginCheckout(stateRef.current.lines.map((l) => ga.itemFromLine(l)));
    }
    window.clearTimeout(resetTimer.current);
    setPlacedOrder(null);
    setView("checkout");
    setIsOpen(true);
  }, [checkoutAvailable]);

  const backToBag = useCallback(() => setView("bag"), []);

  const completeOrder = useCallback((order: PlacedOrder) => {
    setPlacedOrder(order);
    setModalSuspended(false);
    setView("done");
    dispatch({ type: "clear" });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      count: cartCount(state),
      subtotal: cartSubtotal(state),
      savings: cartSavings(state),
      listTotal: cartListTotal(state),
      suggestions,
      hydrated,
      isOpen,
      view,
      placedOrder,
      toast,
      toastState,
      dismissToast,
      openCart,
      closeCart,
      goToCheckout,
      checkoutAvailable,
      backToBag,
      completeOrder,
      modalSuspended,
      suspendModal,
      resumeModal,
      addItem: (line, list) => {
        const tagged = { ...line, list: line.list ?? list ?? listFromPath() };
        dispatch({ type: "add", line: tagged });
        // GA4 add_to_cart — only the units that really went in (a line is capped at MAX_QTY)
        const have = stateRef.current.lines.find((l) => l.sku === line.sku)?.qty ?? 0;
        const added = Math.min(MAX_QTY, have + (line.qty ?? 1)) - have;
        if (added > 0) ga.addToCart([ga.itemFromLine({ ...tagged, qty: added })]);
        // with the bag open the new line lights up in the list itself; a toast on top of that is noise
        if (!isOpenRef.current) notify(`${line.name} added to bag`);
      },
      setQty: (sku, qty) => {
        const cur = stateRef.current.lines.find((l) => l.sku === sku);
        dispatch({ type: "setQty", sku, qty });
        if (cur) {
          // the stepper: more → add_to_cart for the difference, fewer (or 0) → remove_from_cart
          const next = qty <= 0 ? 0 : Math.min(MAX_QTY, Math.max(1, Math.round(qty)));
          const delta = next - cur.qty;
          if (delta > 0) ga.addToCart([ga.itemFromLine(cur, delta)]);
          else if (delta < 0) ga.removeFromCart([ga.itemFromLine(cur, -delta)]);
        }
      },
      removeItem: (sku) => {
        const cur = stateRef.current.lines.find((l) => l.sku === sku);
        dispatch({ type: "remove", sku });
        if (!cur) return;
        ga.removeFromCart([ga.itemFromLine(cur)]);
        // taking something out is the one action people regret: say so, and offer the way back
        notify(`${cur.name} removed`, {
          tone: "removed",
          action: {
            label: "Undo",
            run: () => {
              dispatch({ type: "add", line: cur });
              ga.addToCart([ga.itemFromLine(cur)]);
              dismissToast();
            },
          },
        });
      },
      clear: () => dispatch({ type: "clear" }),
    }),
    [
      state,
      suggestions,
      hydrated,
      isOpen,
      view,
      placedOrder,
      modalSuspended,
      suspendModal,
      resumeModal,
      toast,
      toastState,
      dismissToast,
      notify,
      openCart,
      closeCart,
      goToCheckout,
      checkoutAvailable,
      backToBag,
      completeOrder,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
