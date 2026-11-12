import Link from "next/link";

import { Container } from "@/components/ui/container";
import { AccountHero, AccountStats } from "@/components/account/account-hero";
import { AccountActions } from "@/components/account/account-actions";
import { ProfilePhoto } from "@/components/account/profile-photo";
import { OrderRow } from "@/components/account/order-row";
import { pageMeta } from "@/lib/seo";
import { maskPhone } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { requireUser, listUserSessions } from "@/server/auth";
import { listUserOrders } from "@/server/data/orders";
import { listAddresses } from "@/server/data/addresses";
import { getAccountOverview } from "@/server/data/account";
import { getReviewableItems } from "@/server/data/reviews";
import { getStoreCreditBalance } from "@/server/commerce";

export const metadata = pageMeta({
  title: "Your account",
  description: "Your THE RARESKIN account.",
  path: "/account",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, session } = await requireUser("/account");
  const [
    sessions,
    orders,
    addresses,
    creditPaise,
    overview,
    reviewable,
  ] = await Promise.all([
    listUserSessions(user.id, session._id),
    listUserOrders(user.id),
    listAddresses(user.id),
    getStoreCreditBalance(user.id),
    getAccountOverview(user.id),
    getReviewableItems(user.id),
  ]);
  const recent = orders.slice(0, 4);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  return (
    <main id="main" className="ui-surface min-h-svh pb-24">
      <AccountHero
        width="max-w-[860px]"
        crumbs="Account"
        title={user.name ? user.name : "Welcome"}
        meta={
          <>
            {overview.memberSince ? `Member since ${overview.memberSince} · ` : ""}
            {maskPhone(user.phone)}
            {user.email ? ` · ${user.email}` : ""}
          </>
        }
        aside={<ProfilePhoto initial={user.avatarUrl} name={user.name} />}
      />

      <Container className="max-w-[860px]">
        {/* ── at-a-glance: dark tiles straddling the band's lower edge ───── */}
        <AccountStats
          items={[
            { label: "Orders", value: String(overview.orderCount) },
            {
              label: "In progress",
              value: String(overview.inProgress),
              muted: overview.inProgress === 0,
            },
            {
              label: creditPaise > 0 ? "Store credit" : "Lifetime",
              value:
                creditPaise > 0
                  ? formatPaise(creditPaise)
                  : formatPaise(Math.round(overview.lifetimeSpend * 100)),
              accent: creditPaise > 0,
            },
          ]}
        />

        {/* ── recent orders ──────────────────────────────────────── */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Recent orders
            </h2>
            {orders.length > recent.length && (
              <Link
                href="/account/orders"
                className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase hover:text-ink"
              >
                All {orders.length} →
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="mt-4 border border-line bg-surface px-5 py-8 text-center">
              <p className="serif-italic text-[1.25rem] text-ink-2">
                No orders yet.
              </p>
              <Link
                href="/#shop"
                className="nav-underline mt-3 inline-block text-[11px] font-medium tracking-[0.14em] text-ink uppercase"
              >
                Shop the three →
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-[11.5px] text-ink-3">
                Select an order to see its items, totals and where it is.
              </p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {recent.map((o) => (
                  <li key={o.orderNumber}>
                    <OrderRow order={o} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ── review prompt ─────────────────────────────────────── */}
        {reviewable.length > 0 && (
          <Link
            href="/account/reviews"
            className="ac-bar ac-dark group mt-8 flex items-center justify-between gap-3 px-5 py-4"
          >
            <span className="text-[12.5px] text-ink-2">
              {reviewable.length === 1
                ? `Share how ${reviewable[0].name} is wearing`
                : `${reviewable.length} pieces from your orders are waiting for a review`}
            </span>
            <span className="shrink-0 text-[10.5px] font-medium tracking-[0.12em] text-gilt uppercase transition-transform duration-300 group-hover:translate-x-1">
              Review →
            </span>
          </Link>
        )}

        {/* ── delivery + support ─────────────────────────────────── */}
        <div className="mt-10 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
          <section className="bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
                Delivery address
              </h2>
              <Link
                href="/account/addresses"
                className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase hover:text-ink"
              >
                Manage →
              </Link>
            </div>
            {defaultAddress ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
                <span className="text-ink">{defaultAddress.name}</span>
                <br />
                {defaultAddress.line1}
                {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}
                <br />
                {defaultAddress.city}, {defaultAddress.state} —{" "}
                {defaultAddress.pincode}
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-ink-2">
                You&rsquo;ll add one at checkout.
              </p>
            )}
          </section>

          <section className="ac-card ac-dark p-5">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Store credit
            </h2>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
              {creditPaise > 0 ? (
                <>
                  <span className="serif text-[1.7rem] leading-none text-gilt">
                    {formatPaise(creditPaise)}
                  </span>
                  <br />
                  applied automatically at checkout.
                </>
              ) : (
                "Buy the Discovery Set and its value comes back as credit toward a full-size bottle."
              )}
            </p>
          </section>
        </div>

        {/* ── devices ────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            Signed-in devices
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-[13px]"
              >
                <span className="text-ink">
                  {[s.device.browser, s.device.os].filter(Boolean).join(" · ") ||
                    "Unknown device"}
                  {s.current && (
                    <span className="ml-2 inline-block bg-ink px-1.5 py-[3px] align-[1px] text-[9px] leading-none font-medium tracking-[0.12em] text-w0 uppercase">
                      This device
                    </span>
                  )}
                </span>
                <span className="text-[12px] text-ink-3">
                  {s.ip ?? "—"} · last seen{" "}
                  {new Date(s.lastSeenAt).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10">
          <AccountActions />
        </div>
      </Container>
    </main>
  );
}
