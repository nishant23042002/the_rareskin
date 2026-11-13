import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

/**
 * A figure that ROLLS to its new value whenever it changes (a price after a coupon,
 * a quantity after a tap, a total after the pin code is known). Every digit is a
 * column of 0-9 that slides to its value on `transform` only, in a short stagger
 * from the left (see `.rh-num` in micro.css); the figure is in the markup, so the
 * first paint is already right, and anyone with reduced motion just sees it change.
 *
 * Digits are keyed by their place counted from the right (units, tens, ...), so
 * when 999 becomes 1,299 the existing columns keep their identity and roll, and
 * only the new one appears. Server-safe: no state, no effect. (`Ticker` is the
 * play-once version for what is on screen at load.)
 */
export function Odometer({ text, className }: { text: string; className?: string }) {
  const chars = [...text];
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className={cn("rh-num", className)} aria-hidden="true">
        {chars.map((ch, i) => {
          const fromRight = chars.length - 1 - i;
          if (!/\d/.test(ch)) {
            return (
              <span key={`c${fromRight}`} className="rh-num__c">
                {ch}
              </span>
            );
          }
          const k = text.slice(0, i).replace(/\D/g, "").length;
          return (
            <span key={`d${fromRight}`} className="rh-num__d">
              <span
                className="rh-num__s"
                style={{ "--n": Number(ch), "--k": k } as CSSProperties}
              />
            </span>
          );
        })}
      </span>
    </>
  );
}
