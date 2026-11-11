import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

/**
 * The dark band every account page opens with (styles: `app/account.css`): the
 * announcement bar's obsidian, a hairline of brass along its lower edge, and
 * the page's identity in it: where you are (`crumbs`), the title, one line of
 * detail (`meta`), something on the right (`aside`: the profile photo, an
 * order's status) and anything that belongs under the title (`children`: an
 * order's progress, the invoice link). It also carries the storefront's colour
 * tokens re-pointed for a dark ground (`.ac-dark`), so what is placed in it is
 * written like everything else on the page.
 *
 * It starts under the fixed announcement bar + header, which is why the pages no
 * longer pad their own top. `size="sm"` is the shorter band for the list pages.
 */
export function AccountHero({
  crumbs,
  title,
  meta,
  aside,
  size = "lg",
  width,
  children,
}: {
  crumbs: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  size?: "lg" | "sm";
  /** the content column's max-width class, so the band lines up with what is under it */
  width: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("ac-hero ac-dark", size === "sm" && "ac-hero--sm")}>
      <Container className={width}>
        <p className="eyebrow ac-rise mb-3" style={{ "--i": 0 } as React.CSSProperties}>
          {crumbs}
        </p>
        <div className="ac-hero__row">
          <div className="ac-rise min-w-0" style={{ "--i": 1 } as React.CSSProperties}>
            <h1 className="ac-hero__title">{title}</h1>
            {meta ? <div className="ac-hero__meta">{meta}</div> : null}
          </div>
          {aside ? (
            <div className="ac-rise shrink-0" style={{ "--i": 2 } as React.CSSProperties}>
              {aside}
            </div>
          ) : null}
        </div>
        {children ? (
          <div className="ac-rise mt-7" style={{ "--i": 3 } as React.CSSProperties}>
            {children}
          </div>
        ) : null}
      </Container>
    </section>
  );
}

/**
 * Three figures in dark tiles that straddle the band's lower edge (half on the
 * obsidian, half on the paper): the account at a glance. A tile lifts and draws
 * a brass line under itself on hover.
 */
export function AccountStats({
  items,
}: {
  items: { label: string; value: string; muted?: boolean; accent?: boolean }[];
}) {
  return (
    <div className="ac-stats">
      {items.map((s) => (
        <div key={s.label} className="ac-stat ac-dark">
          <div
            className={cn(
              "serif text-[1.4rem] leading-none tabular-nums sm:text-[1.75rem]",
              s.accent ? "text-ok" : s.muted ? "text-ink-3" : "text-ink",
            )}
          >
            {s.value}
          </div>
          <div className="mt-2 text-[9px] font-medium tracking-[0.08em] text-ink-3 uppercase sm:text-[9.5px] sm:tracking-[0.16em]">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
