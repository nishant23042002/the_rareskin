/**
 * The storefront's GA4 event layer.
 *
 * Every event is pushed onto `window.dataLayer` in the GA4 ecommerce shape;
 * Google Tag Manager (the container in `NEXT_PUBLIC_GTM_ID`) forwards it to GA4.
 * Nothing here talks to Google directly, so with no container loaded (local runs,
 * `*.vercel.app` previews, ad blockers) the pushes are harmless no-ops.
 *
 * THE CONTRACT with the GTM container — change one side, change the other
 * (docs/analytics.md has the full event dictionary):
 *
 *  - ecommerce events: `{ event, ecommerce: { currency, value, items, transaction_id,
 *    shipping, coupon, payment_type, shipping_tier } }`, with `{ ecommerce: null }`
 *    pushed first so the previous event's data cannot leak into the next one. The
 *    container's "GA4 – ecommerce" event tag listens for exactly: view_item_list,
 *    select_item, view_item, add_to_cart, remove_from_cart, view_cart,
 *    begin_checkout, add_shipping_info, add_payment_info, purchase.
 *  - interaction events (login, sign_up, generate_lead, select_promotion, …): a flat
 *    parameter bag under `event_params` — `{ event, event_params: { … } }` — which
 *    the container's "GA4 – interactions" tag reads (docs/analytics/*.json).
 *
 * No personal data goes through here: no phone, email, address or name — only
 * product ids, prices, an order number and coarse labels.
 *
 * Money: rupees (the cart's unit), two decimals at most. Prices are GST-inclusive.
 */
import { mlFromName, type BagSuggestion } from "@/lib/catalog";
import type { CartLine } from "@/lib/cart";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export const CURRENCY = "INR" as const;
const BRAND = "THE RARESKIN";

/** One product as GA4 wants it (`items[]`). Optional fields are dropped when empty. */
export interface GaItem {
  item_id: string;
  item_name: string;
  item_brand: string;
  item_category: string;
  item_category2?: string;
  item_variant?: string;
  /** unit price actually charged (the launch price), rupees */
  price: number;
  /** unit discount against the list price (MRP − price), rupees */
  discount?: number;
  quantity?: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
}

// ── plumbing ───────────────────────────────────────────────────────────────

const money = (n: number): number => Math.round(n * 100) / 100;

/** drop `undefined` / empty-string keys so GTM never sees them */
function compact<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as T;
}

function push(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    (window.dataLayer ??= []).push(payload);
    if (process.env.NODE_ENV !== "production") console.debug("[analytics]", payload);
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * "This page-view event already went out a moment ago." The storefront's page content mounts TWICE on a
 * hard load on desktop (`SmoothScroll` swaps its wrapper once it sees a mouse, which remounts everything
 * under it ~100 ms after hydration), so a once-per-mount effect would count every page view twice.
 * Keyed events (view_item, view_item_list, view_promotion) are therefore deduped here by key + time:
 * a real second view of the same thing needs a navigation away and back, which takes longer than this.
 */
const recent = new Map<string, number>();
export function seenRecently(key: string, withinMs = 3000): boolean {
  const now = Date.now();
  const at = recent.get(key);
  if (at !== undefined && now - at < withinMs) return true;
  recent.set(key, now);
  return false;
}

/** an ecommerce event: clear the previous `ecommerce` object, then push the new one */
function pushEcommerce(event: string, ecommerce: Record<string, unknown>): void {
  push({ ecommerce: null });
  push({ event, ecommerce: compact(ecommerce) });
}

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ── item builders ──────────────────────────────────────────────────────────

interface ItemSource {
  sku: string;
  name: string;
  price: number;
  mrp?: number;
  /** a fragrance slug; absent → the Discovery Set */
  fragrance?: string;
  /** the line under the name: "Extrait · 50 ml" / "3 × 10 ml" */
  meta?: string;
}

function buildItem(
  s: ItemSource,
  extra: { quantity?: number; index?: number; list?: string } = {},
): GaItem {
  const isSet = !s.fragrance;
  const ml = mlFromName(s.meta) ?? mlFromName(s.name);
  return compact({
    item_id: s.sku,
    item_name: s.name,
    item_brand: BRAND,
    item_category: isSet ? "Discovery Set" : "Fragrance",
    item_category2: isSet ? undefined : "Extrait de Parfum",
    item_variant: isSet ? s.meta : ml ? `${ml} ml` : undefined,
    price: money(s.price),
    discount: s.mrp && s.mrp > s.price ? money(s.mrp - s.price) : undefined,
    quantity: extra.quantity,
    index: extra.index,
    item_list_id: extra.list ? slugify(extra.list) : undefined,
    item_list_name: extra.list,
  });
}

/** a bag line (quantity = the line's quantity unless `qty` overrides it) */
export function itemFromLine(line: CartLine, qty?: number): GaItem {
  return buildItem(line, { quantity: qty ?? line.qty, list: line.list });
}

/** a catalogue entry (the bag suggestions carry the whole range) */
export function itemFromSuggestion(s: BagSuggestion, list?: string, index?: number): GaItem {
  return buildItem(s, { quantity: 1, list, index });
}

/** the product page's size on show */
export function itemFromProduct(p: {
  sku: string;
  name: string;
  slug?: string;
  volumeMl: number;
  price: number;
  mrp: number;
  isSet?: boolean;
  meta?: string;
}): GaItem {
  return buildItem(
    {
      sku: p.sku,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      fragrance: p.isSet ? undefined : (p.slug ?? "fragrance"),
      meta: p.meta ?? `Extrait · ${p.volumeMl} ml`,
    },
    { quantity: 1 },
  );
}

const total = (items: GaItem[]): number =>
  money(items.reduce((n, i) => n + i.price * (i.quantity ?? 1), 0));

// ── ecommerce events ───────────────────────────────────────────────────────

/** a product list came into view (The Three, the bag's suggestions, …) */
export function viewItemList(listName: string, items: GaItem[]): void {
  if (!items.length) return;
  const listId = slugify(listName);
  if (seenRecently(`view_item_list:${listId}`)) return;
  pushEcommerce("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items: items.map((it, index) =>
      compact({ ...it, index, item_list_id: listId, item_list_name: listName }),
    ),
  });
}

/** a product was chosen from a list */
export function selectItem(listName: string, item: GaItem): void {
  const listId = slugify(listName);
  pushEcommerce("select_item", {
    item_list_id: listId,
    item_list_name: listName,
    items: [compact({ ...item, item_list_id: listId, item_list_name: listName })],
  });
}

/** a product page was opened */
export function viewItem(item: GaItem): void {
  if (seenRecently(`view_item:${item.item_id}`)) return;
  pushEcommerce("view_item", { currency: CURRENCY, value: total([item]), items: [item] });
}

export function addToCart(items: GaItem[]): void {
  if (!items.length) return;
  pushEcommerce("add_to_cart", { currency: CURRENCY, value: total(items), items });
}

export function removeFromCart(items: GaItem[]): void {
  if (!items.length) return;
  pushEcommerce("remove_from_cart", { currency: CURRENCY, value: total(items), items });
}

/** the bag drawer was opened on its bag view */
export function viewCart(items: GaItem[]): void {
  if (!items.length) return;
  pushEcommerce("view_cart", { currency: CURRENCY, value: total(items), items });
}

export function beginCheckout(items: GaItem[], coupon?: string): void {
  if (!items.length) return;
  pushEcommerce("begin_checkout", { currency: CURRENCY, value: total(items), coupon, items });
}

export function addShippingInfo(items: GaItem[], shippingTier: string, coupon?: string): void {
  if (!items.length) return;
  pushEcommerce("add_shipping_info", {
    currency: CURRENCY,
    value: total(items),
    coupon,
    shipping_tier: shippingTier,
    items,
  });
}

export function addPaymentInfo(items: GaItem[], paymentType: string, coupon?: string): void {
  if (!items.length) return;
  pushEcommerce("add_payment_info", {
    currency: CURRENCY,
    value: total(items),
    coupon,
    payment_type: paymentType,
    items,
  });
}

// An order must be counted once, however many times the success path runs (a
// remount, a retry of the confirmation, two tabs): remember the last ids sent.
const SENT_KEY = "rareskin:ga:purchases:v1";
const SENT_KEEP = 25;

function readSent(): string[] {
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rememberSent(id: string): void {
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify([...readSent(), id].slice(-SENT_KEEP)));
  } catch {
    /* private mode — the in-memory guard below still holds for this page */
  }
}
const sentThisPage = new Set<string>();

/**
 * A confirmed order. `value` is the goods revenue: items at the price charged,
 * less any coupon, **excluding** shipping and COD fee (they go in `shipping`).
 * Store credit is a way of paying, not a discount, so it is not subtracted.
 */
export function purchase(order: {
  transactionId: string;
  value: number;
  shipping?: number;
  tax?: number;
  coupon?: string;
  items: GaItem[];
}): void {
  if (typeof window === "undefined" || !order.transactionId || !order.items.length) return;
  if (sentThisPage.has(order.transactionId) || readSent().includes(order.transactionId)) return;
  sentThisPage.add(order.transactionId);
  rememberSent(order.transactionId);
  pushEcommerce("purchase", {
    transaction_id: order.transactionId,
    currency: CURRENCY,
    value: money(order.value),
    shipping: order.shipping !== undefined ? money(order.shipping) : undefined,
    tax: order.tax !== undefined ? money(order.tax) : undefined,
    coupon: order.coupon,
    items: order.items,
  });
}

// ── interaction events ─────────────────────────────────────────────────────

export type InteractionEvent =
  | "login"
  | "sign_up"
  | "generate_lead"
  | "view_promotion"
  | "select_promotion"
  | "select_size"
  | "quiz_complete"
  | "apply_coupon"
  | "payment_failed"
  | "checkout_error"
  | "contact_click";

/** the only parameters the container's interactions tag reads — add one here AND there */
export type InteractionParam =
  | "method"
  | "form_name"
  | "promotion_id"
  | "promotion_name"
  | "creative_slot"
  | "item_id"
  | "item_name"
  | "size_ml"
  | "size_state"
  | "quiz_result"
  | "coupon"
  | "coupon_result"
  | "payment_type"
  | "reason"
  | "contact_method"
  | "link_location";

export function track(
  event: InteractionEvent,
  params: Partial<Record<InteractionParam, string | number | boolean>> = {},
  /** page-view style events: skip when this key already went out a moment ago (see `seenRecently`) */
  onceKey?: string,
): void {
  if (onceKey && seenRecently(onceKey)) return;
  push({ event_params: null });
  push({ event, event_params: compact(params) });
}
