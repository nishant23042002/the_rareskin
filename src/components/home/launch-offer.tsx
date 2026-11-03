import { RhIcon, type RhIconName } from "@/components/ui/rh-icon";
import { formatINR } from "@/lib/catalog";

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
}: {
  price: number;
  mrp: number;
  volumeMl: number;
}) {
  const hasOffer = mrp > price;
  const pct = hasOffer ? Math.round((1 - price / mrp) * 100) : 0;

  return (
    <>
      {hasOffer && (
        <div className="rh-ticket-wrap" id="offer">
          <aside className="rh-ticket" aria-label="Launch offer">
            <div className="rh-ticket__a">
              <p className="rh-eyebrow">Launch offer</p>
              <p className="rh-ticket__price">
                <b className="rh-tnum">{formatINR(price)}</b>
                <s className="rh-tnum">{formatINR(mrp)}</s>
              </p>
            </div>
            <span className="rh-ticket__perf" aria-hidden="true" />
            <div className="rh-ticket__b">
              <p className="rh-ticket__save">
                <span className="rh-pill rh-tnum">&minus;{pct}%</span>
                <span>
                  Save {formatINR(mrp - price)} on every {volumeMl}&nbsp;ml
                  extrait.
                </span>
              </p>
              <p className="rh-ticket__fine">
                <span>All-inclusive price</span>
                <span className="rh-ticket__fine-b">
                  Free shipping across India
                </span>
              </p>
            </div>
          </aside>
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
