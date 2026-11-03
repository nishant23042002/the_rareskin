import type { ReactElement } from "react";

import { cn } from "@/lib/cn";

/**
 * The homepage / chrome glyph set, drawn on a 24-grid at the same hairline
 * weight as the rest of the site (stroke width + size come from the `.rh-ico`
 * rule in `home.css`, so a glyph always matches the label it sits beside).
 * Server-safe: no state, no effects.
 */
const PATHS = {
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  menu: <path d="M4 9h16M4 15h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevD: <path d="M6 9l6 6 6-6" />,
  chevL: <path d="M15 5l-7 7 7 7" />,
  chevR: <path d="M9 5l7 7-7 7" />,
  arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  truck: (
    <>
      <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="1" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v.01M18 14.5v.01" />
    </>
  ),
  returns: (
    <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  pause: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5.5v13l10-6.5z" />,
} satisfies Record<string, ReactElement>;

export type RhIconName = keyof typeof PATHS;

export function RhIcon({
  name,
  small = false,
  className,
}: {
  name: RhIconName;
  /** the 12px size used inside inline links */
  small?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("rh-ico", small && "rh-ico--s", className)}
    >
      {PATHS[name]}
    </svg>
  );
}
