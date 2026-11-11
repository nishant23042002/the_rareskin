import Link from "next/link";

import { AccountHero } from "@/components/account/account-hero";
import { Container } from "@/components/ui/container";
import { AccountReviews } from "@/components/account/account-reviews";
import { pageMeta } from "@/lib/seo";
import { requireUser } from "@/server/auth";
import { getMyReviews, getReviewableItems } from "@/server/data/reviews";

export const metadata = pageMeta({
  title: "Your reviews",
  description: "Review the fragrances you've received from THE RARESKIN.",
  path: "/account/reviews",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function AccountReviewsPage() {
  const { user } = await requireUser("/account/reviews");
  const [reviewable, mine] = await Promise.all([
    getReviewableItems(user.id),
    getMyReviews(user.id),
  ]);

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
            / Reviews
          </>
        }
        title="Reviews"
        meta="Share how a fragrance wears once you’ve lived in it. Only delivered orders can be reviewed, and our team checks each one before it goes live."
      />

      <Container className="max-w-[760px] pt-9">
        <div>
          <AccountReviews
            reviewable={reviewable}
            mine={mine}
            avatarUrl={user.avatarUrl}
            userName={user.name}
          />
        </div>
      </Container>
    </main>
  );
}
