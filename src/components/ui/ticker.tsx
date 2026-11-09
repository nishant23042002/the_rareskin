import type { CSSProperties } from "react";

/**
 * A price that rolls into place like an odometer, in pure CSS (see `.rh-odo` in
 * motion.css): every digit is a column of 0-9 that slides to its value once, on
 * `transform` only, in a short stagger from the left. The real text is in the
 * markup (screen readers and crawlers get it from the visually hidden copy, and
 * so does anyone with reduced motion, who sees the final figure at once), and a
 * column is exactly one line high, so nothing shifts while it runs.
 *
 * Server-safe: no state, no effect. It plays when it mounts, so use it for what is
 * on screen at load (the hero price, the product page price).
 */
export function Ticker({ text }: { text: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="rh-odo" aria-hidden="true">
        {[...text].map((ch, i) => {
          if (!/\d/.test(ch)) {
            return (
              <span key={i} className="rh-odo__c">
                {ch}
              </span>
            );
          }
          // the digit's position among the digits only: the stagger runs left to right
          const k = text.slice(0, i).replace(/\D/g, "").length;
          return (
            <span key={i} className="rh-odo__d">
              {/* the 0-9 column is generated content (motion.css), so the page text is just the price */}
              <span
                className="rh-odo__s"
                style={{ "--n": Number(ch), "--k": k } as CSSProperties}
              />
            </span>
          );
        })}
      </span>
    </>
  );
}
