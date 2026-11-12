"use client";

import { useEffect, useRef, useState } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/cn";
import type { FragranceImages, FragranceSlug } from "@/lib/catalog";
import { pdpSlides } from "@/lib/pdp-images";
import { PdpViewer } from "./pdp-viewer";

/**
 * PDP gallery — a draggable frame with dots, plus a thumbnail strip. A click on the frame (or its
 * enlarge button) opens `PdpViewer`: the picture lifts out of the page into a full-screen viewer with zoom,
 * swipe, thumbnails, and flies back when it is closed.
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
  // the full-screen viewer: open / which picture, and whether the page's own picture is hidden (it is
  // while the viewer holds it, so the one that flies is never doubled)
  const [viewer, setViewer] = useState({ open: false, index: 0 });
  const [viewing, setViewing] = useState(false);
  // the aspect of a picture whose size the config does not know (an upload), measured when it loads
  const [measured, setMeasured] = useState<Record<number, number>>({});
  const frameRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const downX = useRef<number | null>(null);
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

  const openViewer = (i: number) => {
    if (!slides) return;
    want(i - 1, i, i + 1);
    setViewing(true);
    setViewer({ open: true, index: i });
  };
  const viewerSlides = (slides ?? []).map((s, i) => ({
    key: s.key,
    full: s.full,
    thumb: s.thumb,
    tiny: s.tiny,
    alt: s.alt,
    ar: s.thumbWidth && s.thumbHeight ? s.thumbWidth / s.thumbHeight : (measured[i] ?? 1),
  }));

  return (
    <div
      className="grid gap-3 lg:sticky lg:top-[calc(var(--announce-h)+var(--header-h)+24px)]"
      onPointerDownCapture={() => want(active - 1, active + 1)}
      onPointerEnter={() => want(active + 1)}
      onFocusCapture={() => want(active - 1, active + 1)}
    >
      <div
        ref={frameRef}
        className={cn("pdp-frame", slides && "is-viewable")}
        data-viewing={viewing ? "" : undefined}
        onPointerDown={(e) => {
          downX.current = e.clientX;
        }}
        onClick={(e) => {
          if (!slides || (e.target as HTMLElement).closest("button")) return;
          // a drag that ended on the frame is a swipe, not a click
          if (downX.current != null && Math.abs(e.clientX - downX.current) > 6) return;
          openViewer(active);
        }}
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
                    onLoad={(e) => {
                      if (s.thumbWidth) return;
                      const el = e.currentTarget;
                      if (el.naturalWidth && el.naturalHeight)
                        setMeasured((m) => (m[idx] ? m : { ...m, [idx]: el.naturalWidth / el.naturalHeight }));
                    }}
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
        {slides && (
          <button
            ref={expandRef}
            type="button"
            className="pdp-expand"
            onClick={() => openViewer(active)}
            aria-label={`Enlarge ${name} picture ${active + 1}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}
      </div>

      {slides && (
        <PdpViewer
          open={viewer.open}
          index={viewer.index}
          slides={viewerSlides}
          name={name}
          originFor={() => frameRef.current?.getBoundingClientRect() ?? null}
          onIndexChange={(i) => {
            setViewer((v) => ({ ...v, index: i }));
            go(i);
          }}
          onClose={() => setViewer((v) => ({ ...v, open: false }))}
          onClosed={() => {
            setViewing(false);
            expandRef.current?.focus({ preventScroll: true });
          }}
        />
      )}

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
