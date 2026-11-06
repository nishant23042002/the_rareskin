"use client";

import {
  CARD_CONCEPTS,
  CARD_SLUGS,
  CARD_SWITCHER_ENABLED,
  cardAssetId,
} from "@/config/homepage-assets";
import { findHomeAsset, isFinal } from "@/lib/home-images";
import { setCardConcept, useCardConcept } from "./card-concept";

/**
 * Preview bar for "The Three": flips the tiles between the art directions so the
 * live page can judge them. Renders nothing in a production build unless it was
 * made with NEXT_PUBLIC_CARD_SWITCHER=1 (`@/config/homepage-assets`). Each button
 * says how many of the three pictures of that direction are final; a direction
 * that is not ready shows the current picture on the tiles it lacks.
 */
export function ConceptSwitcher() {
  const current = useCardConcept();
  if (!CARD_SWITCHER_ENABLED) return null;

  return (
    <div className="rh-cswitch" role="radiogroup" aria-label="Card picture direction (preview only)">
      <span className="rh-cswitch__t">Cards</span>
      {CARD_CONCEPTS.map((c) => {
        const ready = CARD_SLUGS.filter((s) => {
          const a = findHomeAsset(cardAssetId(c.id, s));
          return !!a && isFinal(a);
        }).length;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={current === c.id}
            title={c.blurb}
            data-ready={ready === CARD_SLUGS.length ? "all" : ready > 0 ? "some" : "none"}
            onClick={() => setCardConcept(c.id)}
          >
            {c.label}
            {c.id !== "current" && (
              <span className="rh-cswitch__n">
                {ready}/{CARD_SLUGS.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
