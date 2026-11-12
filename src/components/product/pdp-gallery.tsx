"use client";

import { useEffect, useRef, useState } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/cn";
import { sizeScale, type FragranceImages, type FragranceSlug, type FragranceVariant } from "@/lib/catalog";
import { pdpSizeSlides, pdpSlides } from "@/lib/pdp-images";
import { PdpViewer } from "./pdp-viewer";
import { usePdpVariant } from "./pdp-variants";

/**
 * PDP gallery — a draggable frame with dots, plus a thumbnail strip. A click on the frame (or its
 * enlarge button) opens `PdpViewer`: the picture lifts out of the page into a full-screen viewer with zoom,
 * swipe, thumbnails, and flies back when it is closed.
 *
 * Every size has a gallery of its own, and choosing a size swaps the whole gallery (`PdpGallery` keys the body
 * by the size, so the frame, the strip, the loaded pictures and the viewer all start over for the new bottle).
 * The 50 ml is the fragrance's own: the official product photographs (`@/config/pdp-gallery`, six per extrait)
 * come first, then any photograph uploaded in the admin catalogue (`images.hero|flat|box`) and its extra
 * gallery. A 10 ml or 100 ml has what was uploaded to that size's own record (admin → Catalogue → the size →
 * Product images). Until there is a picture, a size shows its bottle drawn in vector, at its size, in three
 * views (the bottle, the three sizes side by side, a close detail), so the swipe + dot + thumb mechanic is
 * always real and it is clear which bottle is on show.
 */

const VIEWS = ["packshot", "sizes", "detail"] as const;
type View = (typeof VIEWS)[number];

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
  const { selected, variants, swaps } = usePdpVariant();
  return (
    <GalleryBody
      key={selected.slug}
      slug={slug}
      name={name}
      images={images}
      variant={selected}
      variants={variants}
      swapped={swaps > 0}
    />
  );
}

/** The bottle drawn at its size: `packshot` with its label, `detail` bare, `sizes` the whole family, the one on show lit. */
function Placeholder({
  view,
  slug,
  variant,
  variants,
  thumb = false,
}: {
  view: View;
  slug: FragranceSlug;
  variant: FragranceVariant;
  variants: FragranceVariant[];
  thumb?: boolean;
}) {
  const ml = variant.volumeMl;
  // the 100 ml fills the frame's height; the others are drawn smaller by the same ratio as the real bottles
  const base = thumb ? 44 : 46;
  if (view === "sizes") {
    return (
      <span className="absolute inset-0 flex items-end justify-center gap-[5%] px-[8%] pb-[9%]">
        {variants.map((v) => (
          <span
            key={v.slug}
            className="flex flex-col items-center gap-[5%] transition-opacity duration-500"
            style={{ width: `${base * 0.6 * sizeScale(v.volumeMl)}%`, opacity: v.volumeMl === ml ? 1 : 0.34 }}
          >
            <Flacon fragrance={slug} />
            {!thumb && (
              <i className="text-[10.5px] tracking-[0.14em] text-ink-3 not-italic uppercase">{v.volumeMl} ml</i>
            )}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="relative z-[1] block" style={{ width: `${base * sizeScale(ml)}%` }}>
      <Flacon fragrance={slug} label={view === "packshot"} volume={view === "packshot"} ml={ml} />
    </span>
  );
}

function GalleryBody({
  slug,
  name,
  images,
  variant,
  variants,
  swapped,
}: {
  slug: FragranceSlug;
  name: string;
  images: FragranceImages;
  variant: FragranceVariant;
  variants: FragranceVariant[];
  /** the visitor has chosen a size: this gallery arrives with a short fade (never on first load) */
  swapped: boolean;
}) {
  const label = variant.isMain ? name : `${name} ${variant.volumeMl} ml`;
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
  const all = variant.isMain
    ? pdpSlides(slug, images, name, variant.gallery)
    : pdpSizeSlides(slug, variant.volumeMl, name, variant.gallery);
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
      className={cn(
        "pdp-gal grid gap-3 lg:sticky lg:top-[calc(var(--announce-h)+var(--header-h)+24px)]",
        swapped && "is-swap",
      )}
      onPointerDownCapture={() => want(active - 1, active + 1)}
      onPointerEnter={() => want(active + 1)}
      onFocusCapture={() => want(active - 1, active + 1)}
    >
      <div
        ref={frameRef}
        data-flight-frame={variant.isMain ? slug : undefined}
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
          ariaLabel={`${label} images`}
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
            : VIEWS.map((v) => (
                <div
                  key={v}
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
                  <Placeholder view={v} slug={slug} variant={variant} variants={variants} />
                </div>
              ))}
        </Carousel>
        {slides && (
          <button
            ref={expandRef}
            type="button"
            className="pdp-expand"
            onClick={() => openViewer(active)}
            aria-label={`Enlarge ${label} picture ${active + 1}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}
        {/* a size with no photography yet says so, so the drawn bottle is never taken for the real thing */}
        {!slides && !variant.isMain && (
          <p className="pdp-note" role="status">
            <i aria-hidden />
            {variant.state === "soon"
              ? `${variant.soonLabel || "Available soon"} · pictures at launch`
              : `Photography of the ${variant.volumeMl} ml is on its way`}
          </p>
        )}
      </div>

      {slides && (
        <PdpViewer
          open={viewer.open}
          index={viewer.index}
          slides={viewerSlides}
          name={label}
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
                aria-label={`${label} — view ${i + 1}`}
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
          : VIEWS.map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${label} — view ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative grid aspect-square flex-1 place-items-center overflow-hidden rounded-[2px] border transition-colors",
                  i === active ? "border-ink-2" : "border-line hover:border-line-2",
                )}
                style={{ background: FRAME_BG }}
              >
                <Placeholder view={v} slug={slug} variant={variant} variants={variants} thumb />
              </button>
            ))}
      </div>
    </div>
  );
}
