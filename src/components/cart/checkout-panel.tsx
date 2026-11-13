"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Flacon } from "@/components/ui/flacon";
import { Icon, type IconName } from "@/components/ui/icon";
import { Odometer } from "@/components/ui/odometer";
import { PaymentBadges, UpiAppStrip } from "@/components/ui/payment-marks";
import { Spinner, TickMark } from "@/components/ui/spinner";
import { PaymentOverlay, type PayPhase } from "@/components/cart/payment-overlay";
import { useAuth } from "@/components/providers/auth-provider";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import { GST_STATES, resolvePincode } from "@/lib/pincode";
import { maskPhone, normalizeIndianMobile } from "@/lib/auth";
import { isFragranceSlug } from "@/lib/catalog";
import { itemThumbPath } from "@/lib/item-thumb";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { shake } from "@/lib/attention";
import { haptic } from "@/lib/haptics";
import * as ga from "@/lib/analytics";
import type {
  CheckoutQuoteResponse,
  PaymentConfirmResponse,
  PlaceOrderFailure,
  PlaceOrderSuccess,
  QuoteLine,
  QuoteWarning,
} from "@/lib/checkout";
import type { PaymentMethod } from "@/lib/validation/commerce";

interface SavedAddress {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  email: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const emptyAddress = {
  label: "",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

/**
 * Why a payment attempt did not produce an order. `failed` = the bank / gateway
 * said no. `unconfirmed` = we could not confirm either way — nothing is placed,
 * but money may have left the account, so the copy says so (and never claims
 * success).
 */
type PaymentIssue = { tone: "failed" | "unconfirmed"; reason: string };

/** Join a reason into a sentence without doubling the full stop. */
function sentence(reason: string): string {
  return reason.trim().replace(/[.\s]+$/, "");
}

/** Map the callback API's answer to what the shopper sees. Never a success. */
function issueFromConfirm(vd: PaymentConfirmResponse | null): PaymentIssue {
  if (!vd) {
    return {
      tone: "unconfirmed",
      reason: "we couldn't reach our server to confirm it",
    };
  }
  switch (vd.error) {
    case "payment-not-captured":
      return {
        tone: "failed",
        reason: vd.message ?? "your bank did not complete the payment",
      };
    case "sold-out":
      return {
        tone: "failed",
        reason:
          "an item in your bag just sold out, so your payment was refunded in full",
      };
    default:
      return {
        tone: "unconfirmed",
        reason:
          vd.message ?? "we couldn't confirm the payment with the bank",
      };
  }
}

const labelCls =
  "block text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase";
const fieldCls =
  "rh-fld mt-1.5 w-full border-0 border-b border-line-2 bg-transparent pb-2 text-[15px] text-ink transition-colors focus:border-ink focus:outline-none";

/** the least time the "confirming with your bank" step stays on screen, so a fast verification still reads as a step */
const MIN_CONFIRM_MS = 1100;
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  error,
  required,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  error?: string | null;
  required?: boolean;
  /** a small live status at the field's right edge (the PIN's spinner, tick or cross) */
  trailing?: React.ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div data-field className="relative">
      <label htmlFor={id} className={labelCls}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldCls, trailing ? "pr-7" : undefined, error && "border-error focus:border-error")}
      />
      {trailing && (
        <span aria-hidden="true" className="absolute right-0 bottom-2.5 grid size-4 place-items-center">
          {trailing}
        </span>
      )}
      {error && (
        <p id={errId} className="mt-1 text-[11.5px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function isNewAddrComplete(a: typeof emptyAddress): boolean {
  return (
    a.name.trim().length >= 2 &&
    /^\+?[0-9\s-]{10,14}$/.test(a.phone) &&
    a.line1.trim().length >= 4 &&
    a.city.trim().length >= 2 &&
    Boolean(a.state) &&
    /^[1-9]\d{5}$/.test(a.pincode)
  );
}

/**
 * Express checkout, living inside the bag drawer. **One screen, not a wizard:**
 * an always-visible order review, the default delivery address shown as a card
 * (tap "Change" to pick another or add one), the receipt email pre-filled, and
 * a single Pay button. A first-time shopper types their address once; every
 * return trip is review → pay. The server settles every number.
 */
export function CheckoutPanel() {
  const { status, user, openSignIn } = useAuth();
  const {
    lines: cartLines,
    hydrated,
    view,
    completeOrder,
    suspendModal,
    resumeModal,
  } = useCart();

  const items = useMemo(
    () => cartLines.map((l) => ({ sku: l.sku, qty: l.qty })),
    [cartLines],
  );

  // contact — the name always comes from the chosen delivery address; only the
  // receipt email is ever entered here, and only when we don't already know it.
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [addr, setAddr] = useState({ ...emptyAddress });
  const [addrErr, setAddrErr] = useState<Record<string, string>>({});
  /** the address block is expanded into its picker / form */
  const [editingAddress, setEditingAddress] = useState(false);

  const [method, setMethod] = useState<PaymentMethod>("razorpay");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [useCredit, setUseCredit] = useState(false);
  const [note, setNote] = useState("");

  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [cartChanged, setCartChanged] = useState<QuoteWarning[] | null>(null);

  const [paying, setPaying] = useState(false);
  /** where the current payment attempt is (null = none); drives the overlay and the button's busy label */
  const [phase, setPhase] = useState<PayPhase | null>(null);
  const busy = phase !== null || placing || paying;
  const reduced = useReducedMotion();
  /** a coupon the server refused: kept here, because the rejected code is dropped from the quote */
  const [couponError, setCouponError] = useState<string | null>(null);
  const couponRowRef = useRef<HTMLDivElement>(null);
  /** bumps whenever Pay is pressed with something missing; the effect below walks the shopper to it */
  const [attn, setAttn] = useState<{ n: number; target: "address" | "email" }>({
    n: 0,
    target: "address",
  });
  const [paymentIssue, setPaymentIssue] = useState<PaymentIssue | null>(null);
  const [payState, setPayState] = useState<
    { kind: "dev"; intentId: string } | { kind: "retry" } | null
  >(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A failed payment puts a banner at the top of the panel — bring it into view.
  useEffect(() => {
    if (paymentIssue) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [paymentIssue]);

  // Pay pressed with something missing: scroll to the first thing that needs fixing, focus it, shake it.
  useEffect(() => {
    if (attn.n === 0) return;
    const root = scrollRef.current;
    if (!root) return;
    // a frame later, so a field that has only just been opened is laid out
    const id = requestAnimationFrame(() => {
      const bad = root.querySelector<HTMLElement>('[aria-invalid="true"]');
      const target =
        bad ?? root.querySelector<HTMLElement>(`[data-section="${attn.target}"]`);
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      bad?.focus({ preventScroll: true });
      shake(bad?.closest("[data-field]") ?? target);
    });
    return () => cancelAnimationFrame(id);
  }, [attn, reduced]);

  // a refused coupon: the input row (back on screen once the chip is dropped) shakes
  useEffect(() => {
    if (!couponError) return;
    const id = requestAnimationFrame(() => shake(couponRowRef.current));
    return () => cancelAnimationFrame(id);
  }, [couponError]);

  // Dedupes a COD double-submit. Online checkout is payment-first — each attempt
  // mints a fresh Razorpay order, so no client key is needed there.
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // Prefill from the account once signed in — the default address becomes the
  // delivery card, its email (or the account email) becomes the receipt.
  useEffect(() => {
    if (status !== "authed" || !user) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const res = await fetch("/api/account/addresses", { cache: "no-store" });
        const data = (await res.json()) as {
          ok: boolean;
          addresses?: SavedAddress[];
        };
        const list = data.ok && data.addresses ? data.addresses : [];
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (cancelled) return;
        setEmail((e) => e || def?.email || user.email || "");
        if (list.length) {
          setSaved(list);
          setAddressMode("saved");
          setSavedId(def!.id);
          setEditingAddress(false);
        } else {
          setAddressMode("new");
          setEditingAddress(true);
        }
      } catch {
        setEmail((e) => e || user.email || "");
        setAddressMode("new");
        setEditingAddress(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  const chosen =
    addressMode === "saved" ? saved.find((a) => a.id === savedId) : null;
  const activePincode = chosen ? chosen.pincode : addr.pincode;
  /** the contact name for the order — never typed twice, it's the delivery name */
  const contactName = (chosen?.name ?? addr.name).trim();

  /** Pick a saved address; adopt its email for the receipt unless one was typed,
   *  and collapse the picker. */
  function pickSavedAddress(a: SavedAddress) {
    setAddressMode("saved");
    setSavedId(a.id);
    if (!emailTouched) setEmail((e) => a.email || e);
    setEditingAddress(false);
  }

  const fetchQuote = useCallback(async () => {
    if (!hydrated || items.length === 0 || view !== "checkout") return;
    setQuoting(true);
    try {
      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          method,
          pincode: /^[1-9]\d{5}$/.test(activePincode) ? activePincode : undefined,
          couponCode: appliedCoupon ?? undefined,
          useStoreCredit: useCredit,
        }),
      });
      const data = (await res.json()) as
        | CheckoutQuoteResponse
        | { ok: false; code?: string; message?: string };
      if (data.ok) {
        setQuote(data);
        setQuoteError(null);
      } else {
        setQuote(null);
        setQuoteError(
          data.code === "empty-cart"
            ? "Everything in your bag has sold out. Head back to the shop."
            : data.message ?? "We couldn’t price your bag. Try again in a moment.",
        );
      }
    } catch {
      /* keep the last good quote */
    } finally {
      setQuoting(false);
    }
  }, [hydrated, items, method, activePincode, appliedCoupon, useCredit, view]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 280);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  useEffect(() => {
    if (!quote) return;
    const t = setTimeout(() => {
      if (quote.coupon && quote.coupon.applied === false) {
        setAppliedCoupon((c) => (c ? null : c));
        // keep the reason on screen (the next quote no longer mentions the dropped code) and shake the field
        setCouponError(quote.coupon.reason);
        haptic("error");
      }
      if (!quote.methods.includes("cod")) {
        setMethod((m) => (m === "cod" ? "razorpay" : m));
      }
    }, 0);
    return () => clearTimeout(t);
  }, [quote]);

  // ── analytics (GA4; see src/lib/analytics.ts) ────────────────────────
  // add_shipping_info + add_payment_info go out once per visit to checkout (a retry after a failed
  // payment is not a second one); leaving the checkout view re-arms them.
  const infoSent = useRef(false);
  useEffect(() => {
    if (view !== "checkout") infoSent.current = false;
  }, [view]);
  // a coupon the shopper tried: did the server take it?
  const couponSeen = useRef<string | null>(null);
  useEffect(() => {
    const c = quote?.coupon;
    if (!c) return;
    const key = `${c.code}:${c.applied}`;
    if (couponSeen.current === key) return;
    couponSeen.current = key;
    ga.track("apply_coupon", { coupon: c.code, coupon_result: c.applied ? "applied" : "rejected" });
    if (c.applied) haptic("success");
  }, [quote]);
  // the server's pricing of the order being paid for — kept for the dev-simulate path, which learns the order number later
  const pricingRef = useRef<PlaceOrderSuccess["pricing"] | null>(null);

  // ── gates / early returns ────────────────────────────────────────────
  if (!hydrated || status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-8">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-ink-3" />
      </div>
    );
  }

  if (cartLines.length === 0 && view === "checkout") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="serif-italic text-[1.35rem] leading-snug text-ink-2">
          Your bag emptied out.
        </p>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <>
        <div className="flex flex-1 flex-col justify-center px-6 py-10 text-center">
          <span className="mx-auto mb-4 inline-flex size-11 items-center justify-center rounded-full border border-line-2">
            <Icon name="lock" className="size-4 text-ink-2" />
          </span>
          <h3 className="serif text-[1.55rem] leading-tight text-ink">
            One step — verify your number
          </h3>
          <p className="mx-auto mt-2.5 max-w-[32ch] text-[13px] leading-relaxed text-ink-2">
            A one-time code by SMS. First-time customers are registered
            automatically, and your bag stays exactly as it is.
          </p>
        </div>
        <PanelFooter>
          <Button size="lg" className="w-full" onClick={() => openSignIn()}>
            Continue
          </Button>
        </PanelFooter>
      </>
    );
  }

  // ── derived ─────────────────────────────────────────────────────────
  const service = quote?.serviceability ?? null;
  const pinBlocked =
    Boolean(service) && !service!.serviceable && service!.reason !== "malformed";
  const total = quote?.pricing.grandTotalPaise ?? null;

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const addressResolved =
    addressMode === "saved" ? Boolean(savedId) : isNewAddrComplete(addr);
  // The button is live as soon as the price is known. Missing details are not a reason to grey it out
  // (that leaves no hint why): pressing it walks the shopper to what is missing instead.
  const ready = Boolean(quote) && !quoting && !pinBlocked;
  const missing: "address" | "email" | null = !addressResolved
    ? "address"
    : !emailValid
      ? "email"
      : null;

  // the coupon, as the server sees it: still being checked, accepted, or (via couponError) refused
  const couponAccepted =
    appliedCoupon && quote?.coupon?.applied === true && quote.coupon.code === appliedCoupon
      ? quote.coupon
      : null;
  const couponChecking = Boolean(appliedCoupon) && !couponAccepted;

  // the PIN's live status: a spinner while it is being checked, then a tick or a cross
  const pinComplete = /^[1-9]\d{5}$/.test(addr.pincode);
  const pinStatus = !pinComplete
    ? null
    : service && service.pincode === addr.pincode
      ? service.serviceable
        ? "ok"
        : "bad"
      : "checking";

  const reviewLines: QuoteLine[] =
    quote?.lines ??
    cartLines.map((l) => ({
      productId: l.sku,
      slug: l.fragrance ?? "",
      name: l.name,
      sku: l.sku,
      // the same item thumbnail the quote returns, so the photo doesn't pop in
      // after the first price check
      image: l.fragrance ? itemThumbPath(l.fragrance) : l.href === "/discovery-set" ? itemThumbPath("discovery-set") : null,
      qty: l.qty,
      unitPrice: l.price,
      mrp: l.mrp ?? l.price,
      lineTotal: l.price * l.qty,
      available: true,
      stock: null,
      maxQty: 12,
    }));
  const mrpTotalPaise = reviewLines.reduce(
    (s, l) => s + Math.round(l.mrp * 100) * l.qty,
    0,
  );
  const itemsPaise =
    quote?.pricing.itemsSubtotalPaise ??
    reviewLines.reduce((s, l) => s + Math.round(l.unitPrice * 100) * l.qty, 0);
  const youSavePaise =
    Math.max(0, mrpTotalPaise - itemsPaise) +
    (quote?.pricing.discountPaise ?? 0);

  function validateAddress() {
    if (addressMode === "saved") return Boolean(savedId);
    const e: Record<string, string> = {};
    if (addr.name.trim().length < 2) e.name = "Required";
    if (!/^\+?[0-9\s-]{10,14}$/.test(addr.phone)) e.phone = "10-digit mobile";
    if (addr.line1.trim().length < 4) e.line1 = "Required";
    if (addr.city.trim().length < 2) e.city = "Required";
    if (!addr.state) e.state = "Select a state";
    if (!/^[1-9]\d{5}$/.test(addr.pincode)) e.pincode = "6-digit PIN";
    setAddrErr(e);
    return Object.keys(e).length === 0;
  }

  /**
   * A field's error stays only while the field is still wrong: fix it and the message goes at once
   * (it comes back if they break it again). Validation runs on Pay; this keeps its red from outliving the fix.
   */
  function shownErr(
    k: "name" | "phone" | "line1" | "city" | "state" | "pincode",
  ): string | undefined {
    const msg = addrErr[k];
    if (!msg) return undefined;
    const ok = {
      name: addr.name.trim().length >= 2,
      phone: /^\+?[0-9\s-]{10,14}$/.test(addr.phone),
      line1: addr.line1.trim().length >= 4,
      city: addr.city.trim().length >= 2,
      state: Boolean(addr.state),
      pincode: /^[1-9]\d{5}$/.test(addr.pincode),
    }[k];
    return ok ? undefined : msg;
  }

  function onPincodeChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setAddr((a) => {
      const next = { ...a, pincode: digits };
      if (/^[1-9]\d{5}$/.test(digits) && !a.state) {
        const region = resolvePincode(digits);
        if (region) next.state = region.state;
      }
      return next;
    });
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (code.length < 3) return;
    setCouponError(null);
    setAppliedCoupon(code);
  }

  /** Something is missing: shake it, scroll to it, give the phone a tap. */
  function needAttention(target: "address" | "email") {
    haptic("error");
    setAttn((a) => ({ n: a.n + 1, target }));
  }

  /** The one action: validate what's on screen, then place + pay. */
  function onPay() {
    setPlaceError(null);
    setEmailErr(null);
    if (addressMode === "new" && !validateAddress()) {
      setEditingAddress(true);
      needAttention("address");
      return;
    }
    if (addressMode === "saved" && !savedId) {
      setEditingAddress(true);
      needAttention("address");
      return;
    }
    if (pinBlocked) {
      setEditingAddress(true);
      needAttention("address");
      return;
    }
    if (!emailValid) {
      setEmailErr("Enter a valid email for the receipt.");
      setEmailEditing(true);
      needAttention("email");
      return;
    }
    if (!infoSent.current) {
      infoSent.current = true;
      const coupon = appliedCoupon && quote?.coupon?.applied ? appliedCoupon : undefined;
      const items = cartLines.map((l) => ga.itemFromLine(l));
      ga.addShippingInfo(items, quote?.pricing.shippingPaise === 0 ? "Free shipping" : "Standard", coupon);
      ga.addPaymentInfo(items, method === "cod" ? "Cash on delivery" : "Online (Razorpay)", coupon);
    }
    void placeOrder();
  }

  /** what the confirmation's receipt shows: the bag is already empty by then, so it is taken now */
  function summaryOf(pricing: PlaceOrderSuccess["pricing"]) {
    return {
      totalPaise: pricing.grandTotalPaise,
      items: cartLines.reduce((n, l) => n + l.qty, 0),
      email: email.trim().toLowerCase(),
    };
  }

  /** GA4 purchase for a confirmed order — goods revenue (items − coupon); shipping + COD fee reported apart. */
  function reportPurchase(orderNumber: string, pricing: PlaceOrderSuccess["pricing"]) {
    ga.purchase({
      transactionId: orderNumber,
      value: (pricing.itemsSubtotalPaise - pricing.discountPaise) / 100,
      shipping: (pricing.shippingPaise + pricing.codFeePaise) / 100,
      tax: pricing.gst.totalPaise / 100,
      coupon: appliedCoupon && quote?.coupon?.applied ? appliedCoupon : undefined,
      items: cartLines.map((l) => ga.itemFromLine(l)),
    });
  }

  async function placeOrder() {
    if (placing || !user) return;
    setPlaceError(null);
    setCartChanged(null);
    // A fresh attempt: the previous failure no longer applies. (Online checkout
    // mints a brand-new intent + Razorpay order below, so a failed one is never
    // reused.)
    setPaymentIssue(null);
    setPayState((s) => (s?.kind === "retry" ? null : s));

    const body: Record<string, unknown> = {
      items,
      contact: {
        name: contactName,
        phone: user.phone,
        email: email.trim().toLowerCase(),
      },
      method,
      billingSameAsShipping: true,
      useStoreCredit: useCredit,
      idempotencyKey,
    };
    if (appliedCoupon) body.couponCode = appliedCoupon;
    if (note.trim()) body.customerNote = note.trim();
    if (addressMode === "saved" && savedId) {
      body.savedAddressId = savedId;
    } else {
      const phoneE164 = normalizeIndianMobile(addr.phone);
      if (!phoneE164) {
        setAddrErr((e) => ({ ...e, phone: "Enter a valid Indian mobile number" }));
        setEditingAddress(true);
        return;
      }
      body.newAddress = {
        label: addr.label || undefined,
        name: addr.name.trim(),
        phone: phoneE164,
        email: email.trim().toLowerCase() || undefined,
        line1: addr.line1.trim(),
        line2: addr.line2 || undefined,
        landmark: addr.landmark || undefined,
        city: addr.city.trim(),
        state: addr.state,
        pincode: addr.pincode,
        isDefault: saved.length === 0,
      };
    }

    setPlacing(true);
    setPhase("securing");
    try {
      const res = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PlaceOrderSuccess | PlaceOrderFailure;
      if (data.ok) {
        await handlePayment(data);
        return;
      }
      // why a checkout stalled — "not-serviceable" in particular is demand we cannot serve yet
      if (data.code !== "auth-required") ga.track("checkout_error", { reason: data.code });
      if (data.code === "cart-changed") {
        setCartChanged((data.details as QuoteWarning[]) ?? []);
        void fetchQuote();
      } else if (data.code === "auth-required") {
        openSignIn();
      } else {
        setPlaceError(data.message ?? "Something went wrong. Please try again.");
        haptic("error");
        if (
          data.code === "address-required" ||
          data.code === "not-serviceable"
        ) {
          setEditingAddress(true);
        }
      }
    } catch {
      setPlaceError("We couldn’t reach the server. Check your connection.");
      haptic("error");
    } finally {
      setPlacing(false);
      setPhase(null);
    }
  }

  // ── payment ──────────────────────────────────────────────────────────

  async function handlePayment(placed: PlaceOrderSuccess) {
    if (placed.kind === "cod") {
      reportPurchase(placed.orderNumber, placed.pricing);
      haptic("success");
      completeOrder({
        orderNumber: placed.orderNumber,
        method: "cod",
        paid: false,
        summary: summaryOf(placed.pricing),
      });
      return;
    }
    pricingRef.current = placed.pricing;
    const { payment } = placed;
    if (payment.kind === "razorpay-dev") {
      setPayState({ kind: "dev", intentId: placed.intentId });
      return;
    }
    // real Razorpay
    setPaymentIssue(null);
    setPaying(true);
    // The drawer is a top-layer <dialog>; drop it to non-modal so Razorpay's
    // hosted checkout opens in front of it, not behind.
    suspendModal();
    setPhase("window");
    try {
      const outcome = await openRazorpayCheckout({
        keyId: payment.keyId,
        razorpayOrderId: payment.razorpayOrderId,
        amountPaise: payment.amountPaise,
        prefill: payment.prefill,
        reference: "THE RARESKIN order",
      });
      // the payment window is closed: the drawer is the top layer again from here on
      resumeModal();

      if (outcome.status === "success") {
        setPhase("confirming");
        const confirmStarted = Date.now();
        // The modal's "success" is only a signed payload — the server confirms
        // with Razorpay that money was actually CAPTURED before any order
        // exists. `completeOrder` (→ the "done" view) is reachable from exactly
        // one place: the server answering `{ ok: true, orderNumber }`.
        let vd: PaymentConfirmResponse | null = null;
        try {
          const vr = await fetch("/api/payments/razorpay/callback", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(outcome.payload),
          });
          vd = (await vr.json()) as PaymentConfirmResponse;
        } catch {
          vd = null; // network / non-JSON → unconfirmed, never success
        }
        if (vd?.ok === true && vd.orderNumber) {
          // let "confirming with your bank" register as a step even when the server answers at once
          await wait(Math.max(0, MIN_CONFIRM_MS - (Date.now() - confirmStarted)));
          reportPurchase(vd.orderNumber, placed.pricing);
          haptic("success");
          completeOrder({
            orderNumber: vd.orderNumber,
            method: "razorpay",
            paid: true,
            summary: summaryOf(placed.pricing),
          });
          return;
        }
        haptic("error");
        ga.track("payment_failed", { payment_type: "razorpay", reason: vd?.error ?? "unconfirmed" });
        setPayState({ kind: "retry" });
        setPaymentIssue(issueFromConfirm(vd));
        return;
      }

      // failed (bank / UPI app declined) or dismissed (window closed) — no
      // order, bag untouched, drawer stays on the checkout view.
      haptic("error");
      ga.track("payment_failed", {
        payment_type: "razorpay",
        reason: outcome.status === "failed" ? "declined" : "dismissed",
      });
      setPayState({ kind: "retry" });
      setPaymentIssue({
        tone: "failed",
        reason:
          outcome.status === "failed"
            ? outcome.message
            : "the payment window was closed before the payment completed",
      });
    } catch (err) {
      ga.track("payment_failed", { payment_type: "razorpay", reason: "window_failed" });
      setPayState({ kind: "retry" });
      setPaymentIssue({
        tone: "failed",
        reason:
          err instanceof Error ? err.message : "the payment window failed to open",
      });
    } finally {
      resumeModal();
      setPaying(false);
    }
  }

  async function simulatePayment(outcome: "paid" | "failed") {
    if (payState?.kind !== "dev") return;
    setPaying(true);
    setPhase("confirming");
    setPaymentIssue(null);
    try {
      const r = await fetch("/api/payments/dev-simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intentId: payState.intentId, outcome }),
      });
      const d = (await r.json()) as PaymentConfirmResponse;
      if (d.ok && d.orderNumber) {
        if (pricingRef.current) reportPurchase(d.orderNumber, pricingRef.current);
        haptic("success");
        completeOrder({
          orderNumber: d.orderNumber,
          method: "razorpay",
          paid: true,
          summary: pricingRef.current ? summaryOf(pricingRef.current) : undefined,
        });
      } else {
        haptic("error");
        setPaymentIssue({
          tone: "failed",
          reason:
            d.error === "sold-out"
              ? "an item in your bag just sold out, so the payment was refunded"
              : outcome === "failed"
                ? "simulated failure (development)"
                : (d.message ?? "could not simulate the payment"),
        });
      }
    } catch {
      setPaymentIssue({ tone: "unconfirmed", reason: "network error" });
    } finally {
      setPaying(false);
      setPhase(null);
    }
  }

  /** Last attempt did not complete and the shopper is on Razorpay again. */
  const retrying = payState?.kind === "retry" && method === "razorpay";
  const idleLabel =
    method === "cod" ? "Place order" : retrying ? "Retry payment" : "Pay securely";
  // what the button says while it is working: the same sentence the overlay is showing
  const busyLabel =
    method === "cod"
      ? "Placing your order…"
      : phase === "confirming"
        ? "Confirming payment…"
        : phase === "window"
          ? "Waiting for payment…"
          : "Securing your order…";

  return (
    <>
      {/* a hairline runs along the top while anything is being worked out (a re-price, an order, a payment) */}
      {(quoting || busy) && <div className="rh-live" aria-hidden="true" />}
      {phase && <PaymentOverlay phase={phase} method={method} />}

      <div
        ref={scrollRef}
        data-lenis-prevent
        inert={phase !== null}
        className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        {/* ── payment did not complete — top of the panel, can't be missed ── */}
        {paymentIssue && (
          <div
            role="alert"
            className="rh-shake border-b border-error/40 bg-error/10 px-6 py-4 text-[13px] leading-relaxed text-ink"
          >
            {paymentIssue.tone === "failed" ? (
              <p>
                <span className="font-medium text-error">
                  Payment unsuccessful:
                </span>{" "}
                {sentence(paymentIssue.reason)}. Your bag is safe, please retry or
                choose another payment method.
              </p>
            ) : (
              <p>
                <span className="font-medium text-error">
                  Payment not confirmed:
                </span>{" "}
                {sentence(paymentIssue.reason)}. No order has been placed and your
                bag is safe. If money was debited it will be confirmed by email or
                reversed by your bank — check your orders before paying again.
              </p>
            )}
          </div>
        )}

        {/* ── order review — always visible ───────────────────────── */}
        <section className="border-b border-line bg-bg/50 px-6 pt-4 pb-5">
          <p className="text-[10.5px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            Your order
          </p>

          <ul className="mt-3 space-y-3">
            {reviewLines.map((l) => (
              <li key={l.sku} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-11 shrink-0 place-items-center overflow-hidden rounded-[3px] border border-line bg-surface">
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : isFragranceSlug(l.slug) ? (
                    <Flacon fragrance={l.slug} className="w-5" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] tracking-[0.02em] text-ink">
                    {l.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-3">
                    {isFragranceSlug(l.slug)
                      ? "Extrait de Parfum"
                      : "Discovery Set · 3 × 10 ml"}{" "}
                    · Qty {l.qty}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[13px] tabular-nums text-ink">
                    {formatPaise(Math.round(l.unitPrice * 100) * l.qty)}
                  </span>
                  {l.mrp > l.unitPrice && (
                    <span className="block text-[10.5px] tabular-nums text-ink-3 line-through">
                      {formatPaise(Math.round(l.mrp * 100) * l.qty)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {/* price ladder */}
          <dl className="mt-4 space-y-2 border-t border-line pt-3.5 text-[13px]">
            <Row label="Item total" value={formatPaise(itemsPaise)} />
            {quote && quote.pricing.discountPaise > 0 && (
              <Row
                label={appliedCoupon ? `Coupon · ${appliedCoupon}` : "Discount"}
                value={`− ${formatPaise(quote.pricing.discountPaise)}`}
                tone="ok"
              />
            )}
            {quote && quote.pricing.creditAppliedPaise > 0 && (
              <Row
                label="Store credit"
                value={`− ${formatPaise(quote.pricing.creditAppliedPaise)}`}
                tone="ok"
              />
            )}
            <Row
              label="Delivery"
              value={
                !quote
                  ? "Calculated next"
                  : quote.pricing.shippingPaise === 0
                    ? "Free"
                    : formatPaise(quote.pricing.shippingPaise)
              }
              skeleton={!quote && !quoteError}
              tone={quote?.pricing.shippingPaise === 0 ? "ok" : undefined}
            />
            {quote && quote.pricing.codFeePaise > 0 && (
              <Row
                label="Cash-on-delivery fee"
                value={formatPaise(quote.pricing.codFeePaise)}
              />
            )}

            <div className="!mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-[10.5px] font-medium tracking-[0.16em] text-ink-3 uppercase">
                {quote ? "Amount to pay" : "Total"}
              </dt>
              <dd
                data-stale={quoting || undefined}
                className="serif text-[1.5rem] tabular-nums text-ink"
              >
                <Odometer
                  text={
                    quote
                      ? formatPaise(quote.pricing.grandTotalPaise)
                      : formatPaise(itemsPaise)
                  }
                />
              </dd>
            </div>

            {(youSavePaise > 0 ||
              (quote && quote.pricing.gst.totalPaise > 0)) && (
              <div className="!mt-1.5 flex items-center justify-between text-[11px] text-ink-3">
                <span>
                  {quote && quote.pricing.gst.totalPaise > 0
                    ? `Incl. ${quote.pricing.gst.ratePercent}% GST ${formatPaise(
                        quote.pricing.gst.totalPaise,
                      )}`
                    : ""}
                </span>
                {youSavePaise > 0 && (
                  <span className="text-ok">
                    You save {formatPaise(youSavePaise)}
                  </span>
                )}
              </div>
            )}
          </dl>

          {/* trust row */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5 text-center">
            <Trust
              icon="truck"
              label={
                quote && quote.pricing.shippingPaise > 0
                  ? "Tracked delivery"
                  : "Free delivery"
              }
            />
            <Trust icon="receipt" label="No hidden fees" />
            <Trust icon="shield" label="Secure checkout" />
          </div>
        </section>

        {/* ── deliver to ─────────────────────────────────────────── */}
        <section
          data-section="address"
          className="border-b border-line bg-surface px-6 py-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-medium tracking-[0.16em] text-ink uppercase">
              Deliver to
            </h3>
            {!editingAddress && chosen && (
              <button
                type="button"
                onClick={() => setEditingAddress(true)}
                className="text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase transition-colors hover:text-ink"
              >
                Change
              </button>
            )}
          </div>

          {!editingAddress && chosen ? (
            <div key="card" className="rh-phase-in mt-3">
              <p className="text-[13px] leading-relaxed text-ink-2">
                <span className="text-ink">{chosen.name}</span>
                {chosen.label ? (
                  <span className="ml-1.5 text-[9px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                    {chosen.label}
                  </span>
                ) : null}
                <br />
                {chosen.line1}
                {chosen.line2 ? `, ${chosen.line2}` : ""}
                <br />
                {chosen.city}, {chosen.state} — {chosen.pincode}
                <br />
                {chosen.phone}
              </p>
              {service && activePincode === service.pincode && (
                <p
                  className={cn(
                    "mt-2 text-[11.5px]",
                    service.serviceable ? "text-ok" : "text-error",
                  )}
                >
                  {service.serviceable
                    ? `Delivers to ${service.region?.state ?? "this area"} · ${
                        quote?.pricing.shippingPaise === 0
                          ? "free shipping"
                          : "shipping calculated"
                      }`
                    : "We don’t deliver to this PIN yet — tap Change to use another address."}
                </p>
              )}
            </div>
          ) : (
            <div key="edit" className="rh-phase-in mt-3.5 space-y-3">
              {addressMode === "saved" && saved.length > 0 && (
                <>
                  {saved.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => pickSavedAddress(a)}
                      className={cn(
                        "block w-full border px-3.5 py-3 text-left text-[13px] transition-colors",
                        savedId === a.id
                          ? "border-ink bg-bg"
                          : "border-line hover:border-line-2",
                      )}
                    >
                      <span className="block text-ink">
                        {a.name}
                        {a.label ? (
                          <span className="ml-1.5 text-[9px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                            {a.label}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-3">
                        {a.line1}, {a.city}, {a.state} — {a.pincode}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAddressMode("new");
                      setSavedId(null);
                      setAddr({ ...emptyAddress });
                    }}
                    className="text-[10.5px] font-medium tracking-[0.12em] text-ink uppercase underline-offset-4 hover:underline"
                  >
                    + Add a new address
                  </button>
                </>
              )}

              {addressMode === "new" && (
                <div className="space-y-4">
                  {saved.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressMode("saved");
                        setSavedId(
                          saved.find((a) => a.isDefault)?.id ?? saved[0]!.id,
                        );
                      }}
                      className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase underline-offset-4 hover:text-ink hover:underline"
                    >
                      ‹ Use a saved address
                    </button>
                  )}
                  <div>
                    <Field
                      label="PIN code"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      value={addr.pincode}
                      error={shownErr("pincode")}
                      onChange={onPincodeChange}
                      trailing={
                        pinStatus === "checking" ? (
                          <Spinner className="size-4 text-ink-3" />
                        ) : pinStatus === "ok" ? (
                          <TickMark className="size-4 text-ok" />
                        ) : pinStatus === "bad" ? (
                          <Icon name="close" className="size-3.5 text-error" />
                        ) : null
                      }
                    />
                    {service && activePincode === service.pincode && (
                      <p
                        className={cn(
                          "mt-1 text-[11.5px]",
                          service.serviceable ? "text-ok" : "text-error",
                        )}
                      >
                        {service.serviceable
                          ? `Delivers to ${service.region?.state ?? "this area"}`
                          : service.reason === "malformed"
                            ? "That PIN doesn’t look right."
                            : "We don’t deliver there yet."}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Full name"
                      required
                      autoComplete="name"
                      value={addr.name}
                      error={shownErr("name")}
                      onChange={(v) => setAddr((a) => ({ ...a, name: v }))}
                    />
                    <Field
                      label="Mobile"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      value={addr.phone}
                      error={shownErr("phone")}
                      onChange={(v) => setAddr((a) => ({ ...a, phone: v }))}
                    />
                  </div>
                  <Field
                    label="Flat, building"
                    required
                    autoComplete="address-line1"
                    value={addr.line1}
                    error={shownErr("line1")}
                    onChange={(v) => setAddr((a) => ({ ...a, line1: v }))}
                  />
                  <Field
                    label="Area, street (optional)"
                    autoComplete="address-line2"
                    value={addr.line2}
                    onChange={(v) => setAddr((a) => ({ ...a, line2: v }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="City"
                      required
                      autoComplete="address-level2"
                      value={addr.city}
                      error={shownErr("city")}
                      onChange={(v) => setAddr((a) => ({ ...a, city: v }))}
                    />
                    <div>
                      <label className={labelCls}>State *</label>
                      <select
                        value={addr.state}
                        onChange={(e) =>
                          setAddr((a) => ({ ...a, state: e.target.value }))
                        }
                        aria-invalid={shownErr("state") ? true : undefined}
                        className={cn(fieldCls, shownErr("state") && "border-error")}
                      >
                        <option value="">Select…</option>
                        {GST_STATES.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Field
                    label="Label — Home, Work (optional)"
                    value={addr.label}
                    onChange={(v) => setAddr((a) => ({ ...a, label: v }))}
                  />
                  <p className="text-[11px] leading-relaxed text-ink-3">
                    We’ll save this to your account for next time.
                  </p>
                </div>
              )}

              {chosen && (
                <button
                  type="button"
                  onClick={() => {
                    if (addressMode === "new" && !validateAddress()) return;
                    setEditingAddress(false);
                  }}
                  className="w-full border border-ink bg-bg py-2.5 text-[10.5px] font-medium tracking-[0.14em] text-ink uppercase transition-colors hover:bg-ink hover:text-w0"
                >
                  Deliver here
                </button>
              )}
            </div>
          )}

          {/* receipt — shown as text once we know it, editable on tap */}
          <div data-section="email" className="mt-4 border-t border-line pt-3.5">
            {emailEditing || !email ? (
              <Field
                label="Email for the receipt"
                type="email"
                inputMode="email"
                required
                autoComplete="email"
                value={email}
                error={emailErr}
                onChange={(v) => {
                  setEmailTouched(true);
                  setEmailErr(null);
                  setEmail(v);
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] leading-relaxed text-ink-3">
                  Receipt &amp; updates to{" "}
                  <span className="text-ink-2">{email}</span>
                  {user ? (
                    <>
                      {" "}
                      · SMS to{" "}
                      <span className="text-ink-2">{maskPhone(user.phone)}</span>
                    </>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => setEmailEditing(true)}
                  className="shrink-0 text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase transition-colors hover:text-ink"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── payment ────────────────────────────────────────────── */}
        <section className="space-y-4 px-6 py-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-medium tracking-[0.16em] text-ink uppercase">
              Payment
            </h3>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-medium tracking-[0.1em] text-ok uppercase">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok/50" />
                <span className="relative inline-flex size-1.5 rounded-full bg-ok" />
              </span>
              Encrypted
            </span>
          </div>

          <div className="flex items-start gap-3 border border-line bg-bg/60 px-3.5 py-3">
            <Icon name="shield" className="mt-0.5 size-[18px] shrink-0 text-ink-2" />
            <p className="text-[11.5px] leading-relaxed text-ink-2">
              Processed by <span className="text-ink">Razorpay</span>, India&rsquo;s
              largest payments gateway. Your card and UPI details are handled by
              the bank — they never reach THE RARESKIN.
            </p>
          </div>

          {cartChanged && (
            <div className="border border-error/40 bg-error/5 px-3.5 py-2.5 text-[12px] text-ink">
              <p className="font-medium text-error">Your bag changed</p>
              <ul className="mt-1 space-y-0.5 text-ink-2">
                {cartChanged.map((w) => (
                  <li key={w.sku}>
                    {w.sku}: {w.message}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-ink-3">Review the summary and try again.</p>
            </div>
          )}

          {/* coupon */}
          <div>
            <p className={labelCls}>Discount code</p>
            {appliedCoupon ? (
              couponChecking ? (
                <div
                  key="checking"
                  className="mt-1.5 flex items-center gap-2.5 border border-line-2 px-3 py-2.5 text-[12.5px] text-ink-2"
                >
                  <Spinner className="size-3.5" />
                  <span>
                    Checking{" "}
                    <span className="tracking-[0.08em] text-ink">{appliedCoupon}</span>…
                  </span>
                </div>
              ) : (
                <div
                  key="applied"
                  className="rh-wash mt-1.5 flex items-center justify-between border border-ok/40 bg-ok/5 px-3 py-2.5 text-[12.5px]"
                >
                  <span className="inline-flex items-center gap-2 text-ink">
                    <TickMark className="size-3.5 text-ok" />
                    <span>
                      <span className="tracking-[0.08em]">{appliedCoupon}</span> applied
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput("");
                    }}
                    className="text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              )
            ) : (
              <div ref={couponRowRef} className="mt-1.5 flex gap-2">
                <input
                  value={couponInput}
                  aria-invalid={couponError ? true : undefined}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    if (couponError) setCouponError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                  placeholder="Enter a code"
                  className={cn(
                    "w-full border bg-transparent px-3 py-2.5 text-[13px] tracking-[0.06em] uppercase transition-colors focus:outline-none",
                    couponError
                      ? "border-error focus:border-error"
                      : "border-line-2 focus:border-ink",
                  )}
                />
                <Button
                  variant="onDark"
                  size="sm"
                  onClick={applyCoupon}
                  className="shrink-0"
                  disabled={couponInput.trim().length < 3}
                >
                  Apply
                </Button>
              </div>
            )}
            {couponError && !appliedCoupon && (
              <p className="mt-1.5 text-[11.5px] text-error">{couponError}</p>
            )}
          </div>

          {/* store credit */}
          {quote && quote.storeCreditBalancePaise > 0 && (
            <label className="flex cursor-pointer items-start gap-2.5 border border-line px-3 py-3">
              <input
                type="checkbox"
                checked={useCredit}
                onChange={(e) => setUseCredit(e.target.checked)}
                className="mt-0.5 accent-[var(--color-ink)]"
              />
              <span className="text-[12.5px] text-ink-2">
                Use store credit —{" "}
                <span className="text-ink">
                  {formatPaise(quote.storeCreditBalancePaise)}
                </span>{" "}
                available
              </span>
            </label>
          )}

          {/* method */}
          <div className="space-y-2.5">
            {(["razorpay", "cod"] as PaymentMethod[]).map((m) => {
              const allowed = !quote || quote.methods.includes(m);
              const active = method === m;
              return (
                <label
                  key={m}
                  className={cn(
                    "block border px-3.5 py-3 text-[12.5px] transition-colors",
                    !allowed && "opacity-40",
                    active ? "border-ink bg-bg" : "border-line hover:border-line-2",
                    allowed ? "cursor-pointer" : "cursor-not-allowed",
                  )}
                >
                  <span className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="method"
                      value={m}
                      checked={active}
                      disabled={!allowed}
                      onChange={() => {
                        haptic("soft");
                        setMethod(m);
                      }}
                      className="sr-only"
                    />
                    <span className="rh-radio" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-ink">
                      {m === "razorpay"
                        ? "UPI · Card · Netbanking · Wallet"
                        : "Cash on delivery"}
                      <span className="mt-0.5 block text-[11px] text-ink-3">
                        {m === "razorpay"
                          ? "Pay with any UPI app, or a card you already have."
                          : allowed
                            ? "Pay the courier on arrival."
                            : "Not available for this order."}
                      </span>
                    </span>
                  </span>
                  {m === "razorpay" && (
                    <UpiAppStrip className="mt-2.5 pl-[26px]" />
                  )}
                </label>
              );
            })}
          </div>

          {/* note */}
          <div>
            <p className={labelCls}>Order note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Anything we should know for delivery?"
              className="mt-1.5 w-full resize-none border border-line-2 bg-transparent px-3 py-2.5 text-[13px] focus:border-ink focus:outline-none"
            />
          </div>

          {(placeError || quoteError) && (
            <p className="border border-error/40 bg-error/5 px-3 py-2.5 text-[12px] text-error">
              {placeError ?? quoteError}
            </p>
          )}
          {pinBlocked && (
            <p className="text-[12px] text-error">
              Update the delivery address — we don’t ship to that PIN yet.
            </p>
          )}

          {payState?.kind === "dev" && (
            <div className="border border-dashed border-line-2 bg-bg/60 px-3.5 py-3 text-[12px] text-ink-2">
              <p className="font-medium text-ink">
                Development — Razorpay not configured
              </p>
              <p className="mt-1 text-[11px]">
                Simulate the hosted-checkout outcome — the order is created only
                on success:
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void simulatePayment("paid")}
                  disabled={paying}
                >
                  {paying ? "…" : "Payment success"}
                </Button>
                <Button
                  variant="onDark"
                  size="sm"
                  onClick={() => void simulatePayment("failed")}
                  disabled={paying}
                >
                  Failure
                </Button>
              </div>
            </div>
          )}
        </section>

        <p className="px-6 pb-4 text-center text-[11px] leading-relaxed text-ink-3">
          {method === "cod"
            ? "Cash on delivery — pay when it arrives."
            : "Secured by Razorpay. Your order is placed the moment payment succeeds — nothing before."}
        </p>
      </div>

      <PanelFooter>
        {missing && ready && !busy && (
          <p
            aria-live="polite"
            className="rh-phase-in mb-2.5 text-center text-[11.5px] text-ink-3"
          >
            {missing === "address"
              ? "Add your delivery address to continue"
              : "Add an email for your receipt to continue"}
          </p>
        )}
        {/* One button for every attempt — after a failure it reads "Retry
            payment" (online) or "Place order" (COD) and follows whichever method
            is selected, so the shopper can switch UPI app, card or COD freely.
            While it works it says what it is doing, in the same words as the
            overlay over the panel. */}
        <Button
          size="lg"
          className="w-full"
          disabled={!ready}
          loading={busy}
          loadingLabel={
            <span className="tracking-[0.1em] whitespace-nowrap">{busyLabel}</span>
          }
          onClick={onPay}
        >
          <span className="inline-flex items-center justify-center gap-2 tracking-[0.1em] whitespace-nowrap">
            <Icon
              name={method === "cod" ? "banknote" : "lock"}
              className="size-[15px]"
            />
            {idleLabel}
            {total != null && (
              <>
                {" · "}
                <span key={total} className="rh-num-in">
                  {formatPaise(total)}
                </span>
              </>
            )}
          </span>
        </Button>
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <PaymentBadges />
          <p className="text-[9px] tracking-[0.12em] text-ink-3 uppercase">
            256-bit encrypted &middot; Razorpay
          </p>
        </div>
        <p className="mt-2 text-center text-[10.5px] leading-relaxed text-ink-3">
          By continuing you agree to THE RARESKIN’s Terms &amp; Privacy Policy.
        </p>
      </PanelFooter>
    </>
  );
}

// ── small parts ────────────────────────────────────────────────────────

function Row({
  label,
  value,
  tone,
  skeleton,
}: {
  label: string;
  value: string;
  tone?: "ok";
  /** the figure is not known yet: a quiet shimmer instead of a placeholder sentence */
  skeleton?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd
        className={cn("tabular-nums", tone === "ok" ? "text-ok" : "text-ink")}
      >
        {skeleton ? (
          <span className="rh-shimmer" role="status" aria-label="Calculating" />
        ) : /\d/.test(value) ? (
          <Odometer text={value} />
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Trust({ icon, label }: { icon: IconName; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1.5 text-ink-3">
      <Icon name={icon} className="size-[17px] text-ink-2" />
      <span className="text-[9.5px] font-medium tracking-[0.06em] uppercase">
        {label}
      </span>
    </span>
  );
}

function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="shrink-0 border-t border-line bg-surface px-6 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
      {children}
    </footer>
  );
}

