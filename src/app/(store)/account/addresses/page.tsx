import Link from "next/link";

import { AccountHero } from "@/components/account/account-hero";
import { Container } from "@/components/ui/container";
import { AddressBook } from "@/components/account/address-book";
import { pageMeta } from "@/lib/seo";
import { requireUser } from "@/server/auth";
import { listAddresses } from "@/server/data/addresses";

export const metadata = pageMeta({
  title: "Your addresses",
  description: "Manage your THE RARESKIN delivery addresses.",
  path: "/account/addresses",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const { user } = await requireUser("/account/addresses");
  const addresses = await listAddresses(user.id);

  return (
    <main id="main" className="ui-surface min-h-svh pb-24">
      <AccountHero
        size="sm"
        width="max-w-[760px]"
        crumbs={
          <>
            <Link href="/account" className="hover:text-ink">
              Account
            </Link>{" "}
            / Addresses
          </>
        }
        title="Delivery addresses"
        meta="Saved addresses appear at checkout. One is always the default."
      />

      <Container className="max-w-[760px] pt-9">
        <div>
          <AddressBook initial={addresses} />
        </div>
      </Container>
    </main>
  );
}
