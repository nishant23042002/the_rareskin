import { cn } from "@/lib/cn";

/**
 * The brand's busy mark: a hairline arc travelling round a faint ring, in the
 * colour of the text it sits beside (`currentColor`), sized in `em` so it follows
 * the type. Under reduced motion it breathes instead of turning (see micro.css).
 * Decorative: whatever is busy says so in words (`aria-busy`, a live region).
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("rh-spinner", className)}>
      <circle className="rh-spinner__track" cx="16" cy="16" r="13" />
      <circle className="rh-spinner__arc" cx="16" cy="16" r="13" />
    </svg>
  );
}

/**
 * A tick that draws itself when `on` becomes true (pathLength is normalised to 1,
 * so the dash maths never depends on the size). Under reduced motion it simply
 * appears.
 */
export function TickMark({ on = true, className }: { on?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("rh-tick", on && "is-on", className)}
    >
      <path d="M5 12.5l4.5 4.5L19 7" pathLength={1} />
    </svg>
  );
}
