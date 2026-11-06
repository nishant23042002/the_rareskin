import { RhIcon, type RhIconName } from "@/components/ui/rh-icon";
import { LaunchTicket, type TicketItem } from "./launch-ticket";

/**
 * The launch-offer ticket straddling the hero's seam, then the four promises.
 * The ticket exists only while the launch price is genuinely below the list
 * price — set both in the catalogue and this follows. On a phone it becomes a
 * two-tier stub (price + a round "−33%" seal, a dashed perforation, the saving).
 */

const PROMISES: { icon: RhIconName; label: string }[] = [
  { icon: "truck", label: "Free shipping" },
  { icon: "cash", label: "Cash on delivery" },
  { icon: "returns", label: "7-day returns" },
  { icon: "lock", label: "Secured by Razorpay" },
];

export function LaunchOffer({
  price,
  mrp,
  volumeMl,
  items,
}: {
  price: number;
  mrp: number;
  volumeMl: number;
  /** the fragrances the launch price applies to (name + slug), for the ticket's links */
  items: TicketItem[];
}) {
  const hasOffer = mrp > price;

  return (
    <>
      {hasOffer && (
        <div className="rh-ticket-wrap" id="offer">
          <LaunchTicket price={price} mrp={mrp} volumeMl={volumeMl} items={items} />
        </div>
      )}
      <section
        className="rh-promises"
        id="promises"
        aria-label="Why shop with us"
      >
        <div className="rh-wrap">
          <ul>
            {PROMISES.map((p) => (
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
