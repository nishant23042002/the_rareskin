"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  CARD_CONCEPTS,
  CARD_SLUGS,
  CARD_SWITCHER_ENABLED,
  cardAssetId,
} from "@/config/homepage-assets";
import { HERO_VARIANTS, heroVariantAssetId } from "@/config/hero.config";
import { findHomeAsset, isFinal } from "@/lib/home-images";
import { setCardConcept, useCardConcept } from "./card-concept";
import { setHeroVariant, useHeroVariant } from "./hero-variant";

/**
 * Preview controls: the first group flips the tiles of "The Three" between the art
 * directions (and, by default, the hero with them), the second picks one of the four
 * reference-benchmark hero variants (`@/config/hero.config`) for the hero only.
 * They render nothing in a production build unless it was made with
 * NEXT_PUBLIC_CARD_SWITCHER=1 (`@/config/homepage-assets`). Each card button says
 * how many of the three pictures of that direction are final; a direction that is
 * not ready shows the current picture on the tiles it lacks, and a hero variant
 * that is not ready shows the hero it would have shown anyway.
 *
 * They used to be two wide bars floating over the page at all times. Now there is
 * one slim "Preview" tab on the left edge (mid-height, where no page content, bag
 * bar, back-to-top or campaign note lives); it opens a panel holding the same two
 * radio groups, and the panel closes on Escape or on a tap anywhere outside it.
 * What the buttons do, and the `?concept=` / `?hero=` addresses, are unchanged.
 */
export function ConceptSwitcher() {
  const current = useCardConcept();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // close on Escape (focus returns to the tab) and on a tap outside the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      tabRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  if (!CARD_SWITCHER_ENABLED) return null;

  return (
    <div ref={rootRef} className="rh-prev" data-open={open}>
      <button
        ref={tabRef}
        type="button"
        className="rh-prev__tab"
        aria-expanded={open}
        aria-controls={panelId}
        title="Preview the homepage art directions"
        onClick={() => setOpen((v) => !v)}
      >
        Preview
      </button>

      {open && (
        <div
          id={panelId}
          className="rh-prev__panel"
          role="group"
          aria-label="Homepage preview options"
        >
          <div className="rh-prev__head">
            <span className="rh-prev__title">Preview</span>
            <button
              type="button"
              className="rh-prev__x"
              aria-label="Close preview options"
              onClick={() => {
                setOpen(false);
                tabRef.current?.focus();
              }}
            >
              ×
            </button>
          </div>

          <HeroSwitcher />

          <div
            className="rh-cswitch"
            role="radiogroup"
            aria-label="Card picture direction (preview only)"
          >
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
                  data-ready={
                    ready === CARD_SLUGS.length ? "all" : ready > 0 ? "some" : "none"
                  }
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
        </div>
      )}
    </div>
  );
}

/** the four reference-benchmark hero variants; "Follow cards" = no variant, the hero follows the card group */
function HeroSwitcher() {
  const variant = useHeroVariant();
  return (
    <div
      className="rh-cswitch"
      role="radiogroup"
      aria-label="Hero picture variant (preview only)"
    >
      <span className="rh-cswitch__t">Hero</span>
      <button
        type="button"
        role="radio"
        aria-checked={variant === null}
        title="The hero follows the card directions"
        data-ready="all"
        onClick={() => setHeroVariant(null)}
      >
        Follow cards
      </button>
      {HERO_VARIANTS.map((v) => {
        const a = findHomeAsset(heroVariantAssetId(v.n));
        const ready = !!a && isFinal(a);
        return (
          <button
            key={v.n}
            type="button"
            role="radio"
            aria-checked={variant === v.n}
            title={
              ready
                ? v.blurb
                : `${v.blurb} (pictures not made yet: the hero stays as it is)`
            }
            data-ready={ready ? "all" : "none"}
            onClick={() => setHeroVariant(v.n)}
          >
            {v.n} {v.label}
            <span className="rh-cswitch__n">{ready ? "ready" : "—"}</span>
          </button>
        );
      })}
    </div>
  );
}
