import type { CSSProperties } from "react";

/**
 * A label whose letters roll up and out and are replaced, one after the other, by a second copy
 * rising from below: the header's hover. Pure markup + CSS (`.rh-roll` in `app/home.css`), so it
 * works from a server or a client component; the two visible rows are hidden from assistive tech
 * and the label is announced once, as plain text.
 */
export function Roll({ children }: { children: string }) {
  const letters = Array.from(children);
  const row = (cls: string) => (
    <span className={cls} aria-hidden="true">
      {letters.map((c, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties}>
          {c === " " ? " " : c}
        </span>
      ))}
    </span>
  );
  return (
    <span className="rh-roll">
      <span className="sr-only">{children}</span>
      {row("rh-roll__a")}
      {row("rh-roll__b")}
    </span>
  );
}
