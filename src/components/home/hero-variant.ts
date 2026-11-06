"use client";

import { useSyncExternalStore } from "react";

import { CARD_SWITCHER_ENABLED } from "@/config/homepage-assets";
import { activeHeroVariant, isHeroVariant, type HeroVariantNumber } from "@/config/hero.config";

/**
 * Which reference-benchmark hero variant (1-4) the hero shows right now
 * (`@/config/hero.config`: `activeHeroVariant`).
 *
 * Production without the switcher flag: always `activeHeroVariant`, nothing is read
 * from the URL. Otherwise: the preview bar's choice, else `?hero=<1..4>`, else
 * `activeHeroVariant`. `null` = no variant (the hero follows the card preview bar).
 * A tiny external store like `card-concept.ts`, so the server render and hydration
 * agree on the default and the hero updates the moment the bar is used.
 */

const listeners = new Set<() => void>();
/** undefined = the bar has not been used yet */
let chosen: HeroVariantNumber | null | undefined;

function fromUrl(): HeroVariantNumber | null {
  try {
    const v = Number(new URLSearchParams(window.location.search).get("hero"));
    return isHeroVariant(v) ? v : null;
  } catch {
    return null;
  }
}

function getSnapshot(): HeroVariantNumber | null {
  if (!CARD_SWITCHER_ENABLED) return activeHeroVariant;
  if (chosen !== undefined) return chosen;
  return fromUrl() ?? activeHeroVariant;
}

function getServerSnapshot(): HeroVariantNumber | null {
  return activeHeroVariant;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** used by the preview bar (null = back to following the card directions); keeps the address in step so a comparison can be shared */
export function setHeroVariant(n: HeroVariantNumber | null): void {
  if (!CARD_SWITCHER_ENABLED) return;
  chosen = n;
  try {
    const url = new URL(window.location.href);
    if (n === null) url.searchParams.delete("hero");
    else url.searchParams.set("hero", String(n));
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* the address is a convenience only */
  }
  listeners.forEach((cb) => cb());
}

export function useHeroVariant(): HeroVariantNumber | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
