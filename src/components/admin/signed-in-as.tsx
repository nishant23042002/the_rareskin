"use client";

import { useEffect, useState } from "react";

import { maskPhone } from "@/lib/auth";

/**
 * "Signed in as …" on the no-access screen, read on the client from the same
 * `/api/auth/session` the storefront's `AuthProvider` uses. It used to be read on
 * the server (`getCurrentUser()` inside `NoAccess`), but Next renders the root
 * `forbidden.tsx` into every page's tree whether or not anything is forbidden, so
 * that cookie + session lookup ran on every storefront render for every signed-in
 * visitor. Here it only runs on the screen that shows it.
 */
export function SignedInAs() {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/auth/session", {
      cache: "no-store",
      signal: ac.signal,
      headers: { accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { email?: string | null; phone?: string | null } | null } | null) => {
        const user = data?.user;
        setAccount(user?.email || (user?.phone ? maskPhone(user.phone) : null));
      })
      .catch(() => {
        /* the line is a courtesy: no account name is not an error */
      });
    return () => ac.abort();
  }, []);

  if (!account) return null;
  return (
    <p className="mt-5 text-[12px] tracking-[0.04em] text-ink-3">
      Signed in as <span className="text-ink">{account}</span>
    </p>
  );
}
