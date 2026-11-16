"use client";

import { useEffect } from "react";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

/**
 * What a shopper sees when a page throws (`app/error.tsx`, `app/(store)/error.tsx`).
 *
 * Without an error boundary a render error unmounts the whole app and leaves a bare
 * "Application error" page with nothing to tap: to the shopper the site is dead. This
 * keeps them moving: try the page again (re-fetches it), or go home with a full page
 * load that does not depend on the router that may be what broke.
 *
 * A stale tab after a deploy (its JS chunks are gone) shows up here as a chunk-load
 * error; that one is cured by a reload, so it is done once, automatically.
 */

const CHUNK_ERROR = /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i;
const RELOAD_KEY = "rareskin:chunk-reload";
/** a second chunk error inside this window is not a stale tab: show the page instead of reloading again */
const RELOAD_GUARD_MS = 60_000;

export function ErrorView({
  error,
  retry,
  chrome = true,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  /** true inside the storefront shell (the fixed header sits above the content) */
  chrome?: boolean;
}) {
  useEffect(() => {
    console.error(error);
    if (!CHUNK_ERROR.test(`${error?.name ?? ""} ${error?.message ?? ""}`)) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last < RELOAD_GUARD_MS) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      return; // no storage: cannot tell a loop from a first time, so never reload on our own
    }
    window.location.reload();
  }, [error]);

  return (
    <main
      id="main"
      className={`flex min-h-svh flex-col items-center justify-center text-center ${
        chrome ? "pt-[calc(var(--announce-h)+var(--header-h))]" : ""
      }`}
    >
      <Container className="max-w-[560px]">
        <p className="eyebrow">Something slipped</p>
        <h1 className="mt-3 text-[clamp(1.8rem,5vw,2.8rem)]">This page lost its footing.</h1>
        <p className="serif-italic mx-auto mt-3.5 max-w-[34ch] text-[1.1rem] leading-[1.5] text-ink-2">
          That was on our side, not yours. Try again, or head back home. Your bag is safe.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Button variant="solid" size="sm" onClick={() => retry()}>
            Try again
          </Button>
          <Button variant="onDark" size="sm" onClick={() => window.location.assign(new URL("/", window.location.origin))}>
            Home
          </Button>
        </div>
        {error?.digest ? (
          <p className="mt-6 text-[10px] tracking-[0.12em] text-ink-3 uppercase">
            Reference {error.digest}
          </p>
        ) : null}
      </Container>
    </main>
  );
}
