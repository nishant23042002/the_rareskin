"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-provider";

const noopSubscribe = () => () => {};

/**
 * Renders its children only for a signed-in **staff** account (owner, admin,
 * staff…). Used for founder/preview tooling — the "Preview" tab and the colour
 * theme pill — that must never reach shoppers.
 *
 * Auth state arrives on the client (`AuthProvider`), so this renders nothing on
 * the server and on the hydration pass (`useSyncExternalStore` returns `false`
 * there), then switches on for staff. That keeps the page static and avoids a
 * hydration mismatch when the session comes from the sessionStorage cache.
 * This is presentation only: it hides UI, it is not an access check.
 */
export function StaffOnly({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const { user } = useAuth();
  return mounted && user?.isStaff ? <>{children}</> : null;
}
