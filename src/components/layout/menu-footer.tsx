import { formatINR } from "@/lib/catalog";

/**
 * The base of the drawer: one whisper of reassurance and a direct line to the
 * concierge. WhatsApp when the store has a number (the same number the site
 * footer's "WhatsApp concierge" uses), otherwise the contact page.
 *
 * The delivery promise follows the admin setting: "above ₹999" while a
 * free-delivery threshold is set, "Pan-India" when every order ships free. The
 * two phrases are separate spans so that on a phone, where they cannot share a
 * line, they stack cleanly instead of leaving the "·" dangling at a line end.
 */
export function MenuFooter({
  whatsapp = null,
  freeShippingAbove = 0,
}: {
  whatsapp?: string | null;
  /** order value (rupees) from which delivery is free; 0 = always free */
  freeShippingAbove?: number;
}) {
  const digits = whatsapp?.replace(/\D/g, "") ?? "";
  const href = digits ? `https://wa.me/${digits}` : "/contact";
  const external = Boolean(digits);

  return (
    <div className="rh-sb__foot">
      <p className="rh-sb__assure">
        <span>
          {freeShippingAbove > 0
            ? `Complimentary Delivery above ${formatINR(freeShippingAbove)}`
            : "Complimentary Pan-India Delivery"}
        </span>{" "}
        <span className="rh-sb__sep" aria-hidden="true">
          ·
        </span>{" "}
        <span>Artisanal Extrait de Parfum</span>
      </p>
      <a
        href={href}
        className="rh-sb__concierge"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        Need guidance? <span>Speak with a specialist</span>
      </a>
    </div>
  );
}
