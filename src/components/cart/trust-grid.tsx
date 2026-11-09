import { Icon, type IconName } from "@/components/ui/icon";
import { PaymentBadges } from "@/components/ui/payment-marks";
import { cn } from "@/lib/cn";

/**
 * Four reasons to buy and the payment marks, above the checkout button. Every
 * line says only what the rest of the site already says (FAQ: dispatched within
 * 24–48 hours with tracking by email / SMS; checkout: Razorpay; COD follows the
 * admin switch), so the bag never promises more than the policy pages do.
 */
export function TrustGrid({
  codEnabled,
  className,
  style,
}: {
  /** cash on delivery is switched on in the admin settings */
  codEnabled: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const items: { icon: IconName; title: string; note: string }[] = [
    {
      icon: "shield",
      title: "100% authentic extrait",
      note: "High-concentration extrait de parfum",
    },
    {
      icon: "truck",
      title: "Dispatched in 24–48 hrs",
      note: "Tracked delivery across India",
    },
    {
      icon: "lock",
      title: "Secured by Razorpay",
      note: "256-bit SSL encryption",
    },
    codEnabled
      ? {
          icon: "banknote",
          title: "Cash on Delivery",
          note: "Pay at your doorstep",
        }
      : {
          icon: "returns",
          title: "7-day safe delivery",
          note: "Free replacement if damaged",
        },
  ];

  return (
    <section
      aria-label="Why shop with confidence"
      className={cn("px-5 pb-7", className)}
      style={style}
    >
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line">
        {items.map((item) => (
          <li
            key={item.title}
            className="group flex flex-col gap-2 bg-surface p-3.5 transition-colors duration-300 hover:bg-surface-2"
          >
            <Icon
              name={item.icon}
              strokeWidth={1.3}
              className="size-[18px] text-gilt transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            <span>
              <span className="block text-[10.5px] leading-snug font-medium tracking-[0.1em] text-ink uppercase">
                {item.title}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                {item.note}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-center">
        <p className="text-[9.5px] tracking-[0.18em] text-ink-3 uppercase">
          We accept
        </p>
        <PaymentBadges className="mt-2.5" />
      </div>
    </section>
  );
}
