"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

import { DEFAULT_HERO_CONCEPT, HERO_FOLLOWS_CARD_CONCEPT } from "@/config/hero.config";
import { HERO_SPOTS, type HeroSpotSet } from "@/config/hero-spots";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { isFinal, resolveHeroAsset } from "@/lib/home-images";
import { useCardConcept } from "./card-concept";
import { useHeroVariant } from "./hero-variant";

/**
 * The hero section. It decides how the hero is laid out and holds what its parts share.
 *
 * Two layouts:
 *  - "stage": the picture has a set of hotspots (`config/hero-spots.ts`: the baseline pedestal picture and
 *    STONE, the finalized hero). The picture is explorable: a dot on each flacon, a focus frame and a plaque
 *    on hover, the index beside the headline linked to them (the shared `hot` fragrance below), and on a
 *    mouse a warm light follows the pointer. Nothing in the picture moves or scales on hover or with the
 *    pointer: hover changes light and opacity only. Its `form` is "overlay" (the headline stands on the
 *    picture's empty wall) or "split" (the headline on the picture-tinted panel beside it) from 1024px;
 *    below that the text is above and the picture below.
 *  - "split": everything else (a photograph uploaded in Site Settings, the other art directions, the
 *    reference variants, the illustrated trio when the picture fails to load): the headline on a panel
 *    beside the picture, as before, without hotspots.
 * The panel is tinted from the picture's own edge (`panel` in `public/images/assets-manifest.json`,
 * sampled by `scripts/hero-panel-tones.py`): a gradient that continues the picture's left edge on
 * desktop, one colour that continues its top edge when the panel sits above it. The baseline has no
 * `panel` and keeps the warm stone; so does an uploaded photograph (we cannot know its light).
 */

interface HeroShared {
  /** the fragrance slug the visitor is pointing at (a dot, a plaque or an index row), or null */
  hot: string | null;
  setHot: (slug: string | null) => void;
  /** the picture could not be loaded: the hero falls back to the illustrated trio in the split layout */
  failed: boolean;
  setFailed: (failed: boolean) => void;
  layout: "stage" | "split";
  /** the hotspot set of the picture on show (stage layout only) */
  spots: HeroSpotSet | null;
}

const HeroContext = createContext<HeroShared>({
  hot: null,
  setHot: () => {},
  failed: false,
  setFailed: () => {},
  layout: "split",
  spots: null,
});

export const useHero = () => useContext(HeroContext);

export function HeroFrame({ hasPhoto, children }: { hasPhoto: boolean; children: ReactNode }) {
  const concept = useCardConcept();
  const variant = useHeroVariant();
  const reduced = useReducedMotion();
  const asset = resolveHeroAsset(HERO_FOLLOWS_CARD_CONCEPT ? concept : DEFAULT_HERO_CONCEPT, variant);
  const [hot, setHot] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const spots = !hasPhoto && isFinal(asset) ? (HERO_SPOTS[asset.id] ?? null) : null;
  const layout = spots && !failed ? "stage" : "split";
  const form = layout === "stage" ? spots!.form : null;

  // the picture-tinted panel: every split hero, and the stage's split form; not the overlay (the text is on the picture)
  const panel = hasPhoto || form === "overlay" ? undefined : asset.panel;
  const style = panel
    ? ({
        "--hp-grad": `linear-gradient(180deg, ${panel.desktop.join(", ")})`,
        "--hp-bg": panel.desktop[Math.floor(panel.desktop.length / 2)],
        "--hp-m": panel.mobile,
      } as CSSProperties)
    : undefined;

  // ---- pointer: a warm light follows the mouse across the scene ----
  // Two pixel offsets as custom properties on the section, set from a single animation frame; CSS turns
  // them into a `translate` on the light (a separate overlay: the picture itself never moves), so nothing
  // here re-renders React. Mouse only, from 1024px, and never under reduced motion.
  const ref = useRef<HTMLElement>(null);
  const raf = useRef(0);
  const onMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (layout !== "stage" || reduced || e.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el || !window.matchMedia("(min-width: 1024px)").matches) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--lx", `${(clientX - r.left).toFixed(0)}px`);
        el.style.setProperty("--ly", `${(clientY - r.top).toFixed(0)}px`);
        el.dataset.pointer = "1";
      });
    },
    [layout, reduced],
  );
  const onLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const el = ref.current;
    if (!el) return;
    delete el.dataset.pointer;
  }, []);

  const shared: HeroShared = { hot, setHot, failed, setFailed, layout, spots: layout === "stage" ? spots : null };

  return (
    <HeroContext.Provider value={shared}>
      <section
        ref={ref}
        className="rh-hero"
        aria-labelledby="hero-h"
        data-layout={layout}
        data-form={form ?? undefined}
        data-panel={panel?.tone}
        data-hot={hot ?? undefined}
        style={style}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        {children}
      </section>
    </HeroContext.Provider>
  );
}
