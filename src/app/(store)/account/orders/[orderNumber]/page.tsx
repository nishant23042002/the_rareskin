import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountHero } from "@/components/account/account-hero";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { pageMeta } from "@/lib/seo";
import { formatPaise } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { CONTACT } from "@/lib/site";
import { StatusPill } from "@/components/account/status-pill";
import { OrderProgress } from "@/components/account/order-progress";
import { OrderThumb } from "@/components/account/order-thumb";
import { requireUser } from "@/server/auth";
import { getUserOrder } from "@/server/data/orders";

export const metadata = pageMeta({
  title: "Order",
  description: "Your THE RARESKIN order.",
  path: "/account/orders",
  noindex: true,
});

export const dynamic = "force-dynamic";

const P = (rupees: number) => formatPaise(Math.round(rupees * 100));
// The shop and its customers are in India, but the server renders in UTC — pin IST
// so an order placed at 1:31 am on the 11th isn't shown as "10 Nov, 8:01 pm".
const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function OrderDetailPage({
  params,
}: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const { user } = await requireUser(`/account/orders/${orderNumber}`);
  const order = await getUserOrder(user.id, decodeURIComponent(orderNumber));
  if (!order) notFound();

  const a = order.shippingAddress;
  const g = order.pricing.gst;
  const showTax = g.total > 0;
  const paid = order.paymentStatus === "paid";

  return (
    <main id="main" className="ui-surface min-h-svh pb-24">
      {/* the dark band: the order number, where it stands, the invoice */}
      <AccountHero
        width="max-w-[780px]"
        crumbs={
          <>
            <Link href="/account" className="hover:text-ink">
              Account
            </Link>{" "}
            /{" "}
            <Link href="/account/orders" className="hover:text-ink">
              Orders
            </Link>{" "}
            / <span className="text-ink-2">{order.orderNumber}</span>
          </>
        }
        title={<span className="serif">{order.orderNumber}</span>}
        meta={
          <>
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"} · placed{" "}
            {fmtDay(order.placedAt)}
          </>
        }
        aside={
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <StatusPill status={order.status} />
            <span
              className={`text-[10px] font-medium tracking-[0.12em] uppercase ${
                paid ? "text-ok" : "text-ink-3"
              }`}
            >
              {paid
                ? "Paid"
                : order.method === "cod"
                  ? "Cash on delivery"
                  : order.paymentStatus}
            </span>
          </div>
        }
      >
        <OrderProgress status={order.status} onDark />

        {order.status !== "cancelled" && (
          <a
            href={`/api/account/orders/${encodeURIComponent(
              order.orderNumber,
            )}/invoice`}
            className="mt-7 inline-flex items-center gap-2 border border-line-2 px-3.5 py-2 text-[10.5px] font-medium tracking-[0.12em] text-ink-2 uppercase transition-colors hover:border-ink hover:bg-ink hover:text-bg"
          >
            <Icon name="download" className="size-[15px]" />
            Download invoice
          </a>
        )}
      </AccountHero>

      <Container className="max-w-[780px]">
        {/* ── the pieces ─────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            {order.lineCount === 1 ? "Your piece" : "Your pieces"}
          </h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((i) => {
              const media = (
                <OrderThumb
                  slug={i.slug}
                  image={i.image}
                  isFragrance={i.isFragrance}
                  alt={i.name}
                  className="size-[84px] rounded-[3px]"
                  flaconClass="w-8"
                />
              );
              return (
                <li
                  key={i.sku}
                  className="flex gap-4 border border-line bg-surface p-3.5"
                >
                  {i.href ? (
                    <Link
                      href={i.href}
                      className="group relative shrink-0 outline-none"
                      aria-label={`View ${i.name}`}
                    >
                      {media}
                      <span className="pointer-events-none absolute inset-0 border border-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </Link>
                  ) : (
                    media
                  )}

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {i.href ? (
                          <Link
                            href={i.href}
                            className="text-[14px] tracking-[0.01em] text-ink underline-offset-4 hover:underline"
                          >
                            {i.name}
                          </Link>
                        ) : (
                          <span className="text-[14px] tracking-[0.01em] text-ink">
                            {i.name}
                          </span>
                        )}
                        <p className="mt-0.5 text-[11px] text-ink-3">
                          {i.isFragrance
                            ? "Extrait de Parfum · 50 ml"
                            : "Discovery Set · 3 × 10 ml"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="block text-[13.5px] tabular-nums text-ink">
                          {P(i.lineTotal)}
                        </span>
                        <span className="block text-[10.5px] tabular-nums text-ink-3">
                          {i.qty} × {P(i.unitPrice)}
                        </span>
                      </div>
                    </div>

                    {i.notes.length > 0 && (
                      <ul className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
                        {i.notes.map((n) => (
                          <li
                            key={n}
                            className="border border-line-2 px-1.5 py-0.5 text-[9.5px] tracking-[0.06em] text-ink-3 uppercase"
                          >
                            {n}
                          </li>
                        ))}
                      </ul>
                    )}

                    {order.status === "delivered" && i.href && (
                      <Link
                        href="/account/reviews"
                        className="mt-2.5 inline-flex w-fit items-center gap-1.5 text-[10.5px] font-medium tracking-[0.1em] text-ink-2 uppercase underline-offset-4 hover:text-ink hover:underline"
                      >
                        <Icon name="star" className="size-3.5" />
                        Write a review
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ── total ────────────────────────────────────────────── */}
          <div className="mt-4 border border-line bg-surface">
          <dl className="space-y-2 px-5 py-4 text-[12.5px]">
            <Row label="Subtotal" value={P(order.pricing.itemsSubtotal)} />
            {order.pricing.discount > 0 && (
              <Row
                label={
                  order.coupon ? `Discount · ${order.coupon.code}` : "Discount"
                }
                value={`− ${P(order.pricing.discount)}`}
                tone="ok"
              />
            )}
            {order.pricing.creditApplied > 0 && (
              <Row
                label="Store credit"
                value={`− ${P(order.pricing.creditApplied)}`}
                tone="ok"
              />
            )}
            <Row
              label="Shipping"
              value={
                order.pricing.shipping === 0
                  ? "Free"
                  : P(order.pricing.shipping)
              }
              tone={order.pricing.shipping === 0 ? "ok" : undefined}
            />
            {order.pricing.codFee > 0 && (
              <Row label="Cash-on-delivery fee" value={P(order.pricing.codFee)} />
            )}
          </dl>
          {/* the figure that matters, on the obsidian */}
          <div className="ac-card ac-dark flex items-baseline justify-between px-5 py-4">
            <span className="text-[11px] tracking-[0.16em] text-ink-3 uppercase">
              {paid ? "Paid" : "Total"}
            </span>
            <span className="serif text-[1.7rem] leading-none tabular-nums text-gilt">
              {P(order.pricing.grandTotal)}
            </span>
          </div>
          {showTax && (
            <p className="px-5 py-3 text-[11px] leading-relaxed text-ink-3">
              Inclusive of {g.ratePercent}% GST
              {g.igst > 0
                ? ` — IGST ${P(g.igst)}`
                : ` — CGST ${P(g.cgst)} + SGST ${P(g.sgst)}`}
              . Taxable value {P(order.pricing.taxableValue)}.
            </p>
          )}
          </div>
        </section>

        {/* ── delivery + payment ─────────────────────────────────── */}
        <div className="mt-9 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
          <section className="bg-surface p-5">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Delivering to
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              <span className="text-ink">{a.name}</span>
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.landmark ? (
                <>
                  {a.landmark}
                  <br />
                </>
              ) : null}
              {a.city}, {a.state} — {a.pincode}
              <br />
              {a.phone}
            </p>
          </section>
          <section className="bg-surface p-5">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Payment
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              {order.method === "cod"
                ? "Cash on delivery"
                : "Card · UPI · Netbanking · Wallet"}
              <br />
              <span className="text-ink-3">
                {paid
                  ? "Received in full"
                  : order.method === "cod"
                    ? "Due on delivery"
                    : `Status: ${order.paymentStatus}`}
              </span>
            </p>
            {order.customerNote && (
              <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
                <span className="text-ink-2">Your note:</span>{" "}
                {order.customerNote}
              </p>
            )}
          </section>
        </div>

        {/* ── the journey ────────────────────────────────────────── */}
        <section className="mt-9">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            The journey
          </h2>
          <ol className="mt-4 space-y-0">
            {order.timeline.map((t, i) => {
              const last = i === order.timeline.length - 1;
              return (
                <li key={i} className="relative flex gap-3.5 pb-5 last:pb-0">
                  <span className="relative flex flex-col items-center">
                    <span
                      className={`mt-0.5 size-[9px] shrink-0 rounded-full ${
                        i === 0 ? "bg-ink" : "border border-line-2 bg-surface"
                      }`}
                    />
                    {!last && (
                      <span className="w-px flex-1 bg-line-2" aria-hidden />
                    )}
                  </span>
                  <div className="-mt-0.5 min-w-0 flex-1">
                    <p className="text-[12.5px] text-ink">
                      {ORDER_STATUS_LABEL[t.status]}
                      <span className="mx-2 text-ink-3">·</span>
                      <span className="text-[11.5px] text-ink-3">
                        {fmtFull(t.at)}
                      </span>
                    </p>
                    {t.note && (
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
                        {t.note}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── help ───────────────────────────────────────────────── */}
        <p className="mt-10 border-t border-line pt-5 text-[12px] leading-relaxed text-ink-3">
          Something not right with this order?{" "}
          <a
            href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(
              `Order ${order.orderNumber}`,
            )}`}
            className="text-ink underline-offset-4 hover:underline"
          >
            Email us
          </a>{" "}
          and quote the order number.
        </p>
      </Container>
    </main>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className={`tabular-nums ${tone === "ok" ? "text-ok" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}
