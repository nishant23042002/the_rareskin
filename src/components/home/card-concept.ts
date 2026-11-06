"use client";

import { useSyncExternalStore } from "react";

import {
  CARD_SWITCHER_ENABLED,
  DEFAULT_CARD_CONCEPT,
  isCardConcept,
  type CardConceptId,
} from "@/config/homepage-assets";

/**
 * Which art direction the product tiles show right now (`@/config/homepage-assets`).
 *
 * Production without the switcher flag: always the default, nothing is read from
 * the URL. Otherwise: the preview bar's choice, else `?concept=<id>`, else the
 * default. A tiny external store (not state in a provider) so the server render and
 * hydration agree on the default and the tiles update the moment the bar is used.
 */

const listeners = new Set<() => void>();
let chosen: CardConceptId | null = null;

function fromUrl(): CardConceptId | null {
  try {
    const v = new URLSearchParams(window.location.search).get("concept");
    return isCardConcept(v) ? v : null;
  } catch {
    return null;
  }
}

function getSnapshot(): CardConceptId {
  if (!CARD_SWITCHER_ENABLED) return DEFAULT_CARD_CONCEPT;
  return chosen ?? fromUrl() ?? DEFAULT_CARD_CONCEPT;
}

function getServerSnapshot(): CardConceptId {
  return DEFAULT_CARD_CONCEPT;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** used by the preview bar; keeps the address in step so a comparison can be shared */
export function setCardConcept(id: CardConceptId): void {
  if (!CARD_SWITCHER_ENABLED) return;
  chosen = id;
  try {
    const url = new URL(window.location.href);
    if (id === DEFAULT_CARD_CONCEPT) url.searchParams.delete("concept");
    else url.searchParams.set("concept", id);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* the address is a convenience only */
  }
  listeners.forEach((cb) => cb());
}

export function useCardConcept(): CardConceptId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
