"use client";

import { useEffect, useState } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/cn";
import type { FragranceImages, FragranceSlug } from "@/lib/catalog";
import { pdpSlides } from "@/lib/pdp-images";

/**
 * PDP gallery — a draggable frame with dots, plus a thumbnail strip.
 *
 * The official product photographs (`@/config/pdp-gallery`, six per extrait) come
 * first; a photograph uploaded in the admin catalogue (`images.hero|flat|box`)
 * follows them. With neither, it falls back to the vector flacon in three label
 * states (packshot / detail / carton), so the swipe + dot + thumb mechanic is
 * always real.
 */

const VECTOR_VIEWS = [
  { key: "packshot", label: true, volume: true },
  { key: "detail", label: false, volume: false },
  { key: "carton", label: true, volume: false },
] as const;

const FRAME_BG =
  "linear-gradient(165deg, var(--color-w0), var(--color-w1) 60%, var(--color-w2))";

export function PdpGallery({
  slug,
  name,
  images,
}: {
  slug: FragranceSlug;
  name: string;
  images: FragranceImages;
}) {
  const [active, setActive] = useState(0);
  // The slides whose pictures are fetched. Only the first is, to begin with: the others are 100-550 KB
  // each (about 1.1 MB for the set) and every byte of them competes with the picture the page is waiting
  // on. The next one is warmed when the browser is idle or on the first touch / hover / focus (a drag
  // shows the neighbour, so it has to be there), and each swipe or thumbnail tap loads that slide and its
  // neighbours. Slides never un-load, so going back never flashes.
  const [wanted, setWanted] = useState<number[]>([0]);
  const want = (...at: number[]) =>
    setWanted((w) => {
      const next = new Set(w);
      for (const i of at) if (i >= 0) next.add(i);
      return next.size === w.length ? w : [...next];
    });
  const go = (i: number) => {
    setActive(i);
    want(i - 1, i, i + 1);
  };

  useEffect(() => {
    const warm = () => setWanted((w) => (w.includes(1) ? w : [...w, 1]));
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(id);
  }, []);

  // the order lives in `@/lib/pdp-images`, shared with every other surface that
  // shows this product's first picture
  const all = pdpSlides(slug, images, name);
  const slides = all.length > 0 ? all : null;

  return (
    <div
      className="grid gap-3 lg:sticky lg:top-[calc(var(--announce-h)+var(--header-h)+24px)]"
      onPointerDownCapture={() => want(active - 1, active + 1)}
      onPointerEnter={() => want(active + 1)}
      onFocusCapture={() => want(active - 1, active + 1)}
    >
      <Carousel
        ariaLabel={`${name} images`}
        dotsInside
        activeIndex={active}
        onActiveChange={go}
        viewportClassName="rounded-[3px] border border-line"
      >
        {slides
          ? slides.map((s, idx) => (
              <div
                key={s.key}
                className="relative aspect-[1/1.06] overflow-hidden"
                style={{ background: FRAME_BG }}
              >
                {wanted.includes(idx) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.full}
                    srcSet={s.srcSet}
                    sizes={s.srcSet ? "(min-width: 1024px) 560px, 100vw" : undefined}
                    alt={s.alt}
                    className="h-full w-full object-cover"
                    // a slide that was asked for is fetched now (a lazy image inside a clipped, sliding
                    // track is not reliably "near"); the one on show is the priority, a neighbour is not
                    loading="eager"
                    fetchPriority={idx === active ? "high" : "low"}
                    decoding="async"
                  />
                )}
              </div>
            ))
          : VECTOR_VIEWS.map((v) => (
              <div
                key={v.key}
                className="relative grid aspect-[1/1.06] place-items-center overflow-hidden"
                style={{ background: FRAME_BG }}
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    background:
                      "linear-gradient(112deg, transparent 42%, rgba(255,255,255,0.5) 52%, transparent 62%)",
                  }}
                />
                <span className="relative z-[1] block w-[46%]">
                  <Flacon fragrance={slug} label={v.label} volume={v.volume} />
                </span>
              </div>
            ))}
      </Carousel>

      <div className="flex gap-2.5">
        {slides
          ? slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => go(i)}
                onPointerEnter={() => want(i)}
                aria-label={`${name} — view ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "aspect-square flex-1 overflow-hidden rounded-[2px] border transition-colors",
                  i === active ? "border-ink-2" : "border-line hover:border-line-2",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.tiny}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))
          : VECTOR_VIEWS.map((v, i) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${name} — view ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "grid aspect-square flex-1 place-items-center rounded-[2px] border transition-colors",
                  i === active ? "border-ink-2" : "border-line hover:border-line-2",
                )}
                style={{ background: FRAME_BG }}
              >
                <span className="block w-[42%]">
                  <Flacon fragrance={slug} label={v.label} volume={v.volume} />
                </span>
              </button>
            ))}
      </div>
    </div>
  );
}
