/**
 * The base of the drawer: a direct line to the concierge. WhatsApp when the store has a number (the same number the site footer's "WhatsApp
 * concierge" uses), otherwise the contact page.
 */
export function MenuFooter({ whatsapp = null }: { whatsapp?: string | null }) {
  const digits = whatsapp?.replace(/\D/g, "") ?? "";
  const href = digits ? `https://wa.me/${digits}` : "/contact";
  const external = Boolean(digits);

  return (
    <div className="rh-sb__foot">
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
