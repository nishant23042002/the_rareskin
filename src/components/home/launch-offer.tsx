import { RhIcon, type RhIconName } from "@/components/ui/rh-icon";
import { formatINR } from "@/lib/catalog";
import { LaunchPass, type PassItem } from "./launch-pass";

/**
 * The launch pass straddling the hero's lower edge, then the four promises. The pass exists only while
 * the launch price is genuinely below the list price: set both in the catalogue and this follows.
 * On a phone it is a full-width card, the figure and the round seal first.
 */

export function LaunchOffer({
  price,
  mrp,
  volumeMl,
  items,
  freeShippingAbove = 0,
  endsAt = null,
}: {
  price: number;
  mrp: number;
  volumeMl: number;
  /** the fragrances the launch price applies to (name + slug), for the pass's links */
  items: PassItem[];
  /** order value (rupees) from which delivery is free; 0 = always free */
  freeShippingAbove?: number;
  /** ISO date the launch pricing ends (Site Settings → Campaign), when one is set and still ahead */
  endsAt?: string | null;
}) {
  const hasOffer = mrp > price;
  // the shipping promise says what the checkout does (the store's own threshold), never more
  const promises: { icon: RhIconName; label: string }[] = [
    {
      icon: "truck",
      label: freeShippingAbove > 0 ? `Free shipping above ${formatINR(freeShippingAbove)}` : "Free shipping",
    },
    { icon: "cash", label: "Cash on delivery" },
    { icon: "returns", label: "7-day returns" },
    { icon: "lock", label: "Secured by Razorpay" },
  ];

  return (
    <>
      {hasOffer && (
        <div className="rh-pass-wrap" id="offer">
          <LaunchPass price={price} mrp={mrp} volumeMl={volumeMl} items={items} endsAt={endsAt} />
        </div>
      )}
      <section className="rh-promises" id="promises" aria-label="Why shop with us">
        <div className="rh-wrap">
          <ul>
            {promises.map((p) => (
              <li key={p.label}>
                <RhIcon name={p.icon} />
                {p.label}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
