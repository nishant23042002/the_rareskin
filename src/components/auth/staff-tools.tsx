"use client";

import dynamic from "next/dynamic";

import { StaffOnly } from "./staff-only";

/**
 * The founder's preview tooling (the colour-theme dock and the homepage "Preview" tab), behind
 * `StaffOnly`. Each is loaded with `next/dynamic`, so its code is a separate chunk that is only
 * requested once a signed-in staff account is actually looking at the page: a shopper never
 * downloads, parses or hydrates either of them. (Importing them directly, even under `StaffOnly`,
 * puts them in the bundle every visitor gets.)
 */
const ThemeSwitcher = dynamic(
  () => import("@/components/ui/theme-switcher").then((m) => m.ThemeSwitcher),
  { ssr: false },
);
const ConceptSwitcher = dynamic(
  () => import("@/components/home/concept-switcher").then((m) => m.ConceptSwitcher),
  { ssr: false },
);

export function StaffThemeSwitcher() {
  return (
    <StaffOnly>
      <ThemeSwitcher />
    </StaffOnly>
  );
}

export function StaffConceptSwitcher() {
  return (
    <StaffOnly>
      <ConceptSwitcher />
    </StaffOnly>
  );
}
