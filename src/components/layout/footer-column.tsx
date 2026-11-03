"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * One footer link group. Below 768px the title is a disclosure button
 * (`aria-expanded` / `aria-controls`, a 58px row: small spaced capitals, an
 * optional hint — the Collection's three juice dots — and a hairline `+` that
 * folds to `−` when open) over a collapsible list; from 768px up it's a plain
 * heading over an open list.
 *
 * Both headings are in the markup and swapped with `display`, so there's no
 * hydration swap, no layout shift, and no inert-but-focusable button on
 * desktop. `defaultOpen` is the server-rendered state — the Collection opens
 * first so a phone shows the range without a tap.
 */
export function FooterColumn({
  title,
  defaultOpen = false,
  hint,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  /** quiet decoration beside the title on phones (e.g. the fragrance dots) */
  hint?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div
      className="rs-acc group/acc border-t border-champagne/10 md:border-t-0"
      data-open={open}
    >
      <h3 className="hidden text-[10px] font-normal tracking-[0.22em] text-brass uppercase md:mb-5 md:block">
        {title}
      </h3>

      <h3 className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[58px] w-full items-center gap-3 text-left text-[11px] leading-none font-normal tracking-[0.24em] text-champagne uppercase"
        >
          <span className="flex-1">{title}</span>
          {hint}
          <span
            aria-hidden
            className="relative block size-[11px] shrink-0 text-brass"
          >
            <i className="rs-acc__bar" />
            <i className="rs-acc__bar rs-acc__bar--v" />
          </span>
        </button>
      </h3>

      <div id={panelId} className="rs-acc__panel">
        <div>{children}</div>
      </div>
    </div>
  );
}
