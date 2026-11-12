"use client";

import { useRef, useState } from "react";

import { Container } from "@/components/ui/container";
import { DISCOVERY_SET_GALLERY, pdpPhotoSrc } from "@/config/pdp-gallery";
import { PdpViewer, type ViewerSlide } from "./pdp-viewer";

/**
 * The Discovery Set in pictures (the set page): the trio on a plain ground, in the dark studio, the "Meet all three"
 * card and the three steps. Four square cells; the packshot (1000x1150) is cropped to a square around the bottles.
 * A click on any picture opens the same viewer as a product page (`PdpViewer`: the picture lifts out of the page,
 * zoom, swipe / arrows, thumbnails, Esc) and it flies back to its cell when closed.
 * Files: `public/images/pdp/discovery-set/`, config: `DISCOVERY_SET_GALLERY` in `@/config/pdp-gallery`.
 */
const SLUG = "discovery-set";

const SLIDES: ViewerSlide[] = DISCOVERY_SET_GALLERY.map((p) => ({
  key: p.stem,
  full: pdpPhotoSrc(SLUG, p, "full"),
  thumb: pdpPhotoSrc(SLUG, p, "small"),
  tiny: pdpPhotoSrc(SLUG, p, "tiny"),
  alt: p.alt,
  ar: p.width / p.height,
}));

export function DiscoverySetGallery() {
  const [viewer, setViewer] = useState({ open: false, index: 0 });
  const [viewing, setViewing] = useState(false);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const lastIndex = useRef(0);

  const open = (i: number) => {
    lastIndex.current = i;
    setViewing(true);
    setViewer({ open: true, index: i });
  };

  return (
    <Container className="max-w-[1180px] pt-[clamp(40px,7vw,88px)]">
      <h2 data-rv className="eyebrow mb-[clamp(20px,3vw,32px)]">
        The set, in pictures
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {DISCOVERY_SET_GALLERY.map((p, i) => (
          <li key={p.stem} data-rv className="overflow-hidden rounded-[3px] border border-line">
            <button
              type="button"
              ref={(n) => {
                cells.current[i] = n;
              }}
              onClick={() => open(i)}
              aria-label={`Open picture ${i + 1} of ${DISCOVERY_SET_GALLERY.length}: ${p.alt}`}
              className="group relative block w-full cursor-zoom-in overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pdpPhotoSrc(SLUG, p, "full")}
                srcSet={`${pdpPhotoSrc(SLUG, p, "small")} ${p.small}w, ${pdpPhotoSrc(SLUG, p, "full")} ${p.width}w`}
                sizes="(min-width: 1180px) 580px, (min-width: 640px) 48vw, 100vw"
                alt=""
                width={p.width}
                height={p.height}
                loading={i < 2 ? "eager" : "lazy"}
                decoding="async"
                className="aspect-square h-auto w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
                style={viewing && viewer.index === i ? { visibility: "hidden" } : undefined}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3 right-3 grid size-9 place-items-center rounded-full border border-black/10 bg-white/80 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <PdpViewer
        open={viewer.open}
        index={viewer.index}
        slides={SLIDES}
        name="The Discovery Set"
        originFor={() => cells.current[viewer.index]?.getBoundingClientRect() ?? null}
        onIndexChange={(i) => {
          lastIndex.current = i;
          setViewer((v) => ({ ...v, index: i }));
        }}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
        onClosed={() => {
          setViewing(false);
          cells.current[lastIndex.current]?.focus({ preventScroll: true });
        }}
      />
    </Container>
  );
}
