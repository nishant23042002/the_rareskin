import Link from "next/link";

import { AccountHero } from "@/components/account/account-hero";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";
import { OrderRow } from "@/components/account/order-row";
import { requireUser } from "@/server/auth";
import { listUserOrders } from "@/server/data/orders";

export const metadata = pageMeta({
  title: "Your orders",
  description: "Your THE RARESKIN order history.",
  path: "/account/orders",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { user } = await requireUser("/account/orders");
  const orders = await listUserOrders(user.id);

  return (
    <main id="main" className="ui-surface min-h-svh pb-24">
      <AccountHero
        size="sm"
        width="max-w-[820px]"
        crumbs={
          <>
            <Link href="/account" className="hover:text-ink">
              Account
            </Link>{" "}
            / Orders
          </>
        }
        title="Your orders"
        meta={
          orders.length > 0
            ? `${orders.length} ${orders.length === 1 ? "order" : "orders"} · select any for its full summary, items and journey.`
            : undefined
        }
      />

      <Container className="max-w-[820px] pt-9">
        {orders.length === 0 ? (
          <div className="border border-line bg-surface px-6 py-14 text-center">
            <p className="serif-italic text-[1.4rem] text-ink-2">No orders yet.</p>
            <Button href="/#shop" variant="onDark" size="sm" className="mt-6">
              Shop the three
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line border-y border-line">
              {orders.map((o) => (
                <li key={o.orderNumber}>
                  <OrderRow order={o} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </main>
  );
}
