"use client";

import type { CSSProperties, ReactNode } from "react";

import { DEFAULT_HERO_CONCEPT, HERO_FOLLOWS_CARD_CONCEPT } from "@/config/hero.config";
import { resolveHeroAsset } from "@/lib/home-images";
import { useCardConcept } from "./card-concept";
import { useHeroVariant } from "./hero-variant";

/**
 * The hero section, tinted by its own picture. The text panel beside a photograph is
 * not a free choice of colour: it is the picture's light. Each final hero picture
 * carries `panel` in `public/images/assets-manifest.json` (sampled from the picture's
 * own edge by `scripts/hero-panel-tones.py`): a vertical gradient that continues the
 * picture's left edge on desktop, one colour that continues its top edge when the
 * panel sits above it on a phone, and a `tone` (light | dark) that decides the type
 * colour. The panel and the picture meet on a clean edge (no fade, no overlay): the panel
 * simply continues the picture's own light. The baseline pedestal hero has no
 * `panel`: it keeps the warm stone it was designed with. A photograph uploaded in
 * Site Settings also keeps the stone (we cannot know its light).
 */
export function HeroFrame({ hasPhoto, children }: { hasPhoto: boolean; children: ReactNode }) {
  const concept = useCardConcept();
  const variant = useHeroVariant();
  const asset = resolveHeroAsset(HERO_FOLLOWS_CARD_CONCEPT ? concept : DEFAULT_HERO_CONCEPT, variant);
  const panel = hasPhoto ? undefined : asset.panel;
  const style = panel
    ? ({
        "--hp-grad": `linear-gradient(180deg, ${panel.desktop.join(", ")})`,
        "--hp-bg": panel.desktop[Math.floor(panel.desktop.length / 2)],
        "--hp-m": panel.mobile,
      } as CSSProperties)
    : undefined;
  return (
    <section className="rh-hero" aria-labelledby="hero-h" data-panel={panel?.tone} style={style}>
      {children}
    </section>
  );
}
