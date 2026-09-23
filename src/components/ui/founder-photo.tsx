"use client";

import { useEffect, useRef, useState } from "react";

import { Mark } from "@/components/ui/mark";
import { cloudinaryVariant } from "@/lib/catalog";

/**
 * The founder's photo — shared by the homepage "first letter" card and
 * /the-idea.
 *
 * Never cropped: the image sits in normal flow at its own proportions
 * (`width`/`height` from the stored media ref reserve the space, so there's no
 * layout shift), and the frame around it takes whatever height that gives.
 *
 * Never soft: a Cloudinary `srcset` of uncropped variants at `q_auto:best`,
 * capped at the file's native width — never upscaled — so the browser picks the
 * right size for the box + DPR and always has the native-resolution rendition
 * available for large or high-density screens.
 *
 * Fallback: `FOUNDER_FALLBACK` (committed in /public) shows when no portrait is
 * set in Site Settings, or the configured one fails to load. If even that fails
 * a quiet mark is left in its place.
 */

export const FOUNDER_FALLBACK = {
  url: "/founder/founder-fallback.webp",
  width: 1254,
  height: 1223,
};

const WIDTHS = [360, 540, 720, 960, 1280];

export interface FounderPhotoSource {
  url: string;
  width?: number;
  height?: number;
}

export function FounderPhoto({
  photo,
  alt,
  sizes,
  className = "",
  priority = false,
}: {
  /** the configured portrait (Cloudinary); the fallback shows when absent/broken */
  photo?: FounderPhotoSource | null;
  alt: string;
  /** the `sizes` attribute — the rendered width of the image at each breakpoint */
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<"primary" | "fallback" | null>(null);
  const ref = useRef<HTMLImageElement>(null);

  const usePrimary = Boolean(photo?.url) && failed === null;
  const useFallback = !usePrimary && failed !== "fallback";

  const fail = () =>
    setFailed((f) => (f === null && photo?.url ? "primary" : "fallback"));

  // An `error` can fire before hydration attaches `onError` — catch that case.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) {
      setFailed((f) => (f === null && photo?.url ? "primary" : "fallback"));
    }
  }, [photo?.url]);

  if (!usePrimary && !useFallback) {
    return (
      <span
        aria-hidden
        className="flex min-h-[260px] w-full items-center justify-center"
      >
        <Mark className="w-14 text-ink/12" strokeWidth={1.4} />
      </span>
    );
  }

  const shown = usePrimary && photo ? photo : FOUNDER_FALLBACK;
  const cloud = usePrimary && shown.url.includes("res.cloudinary.com");
  const native = shown.width;

  let srcSet: string | undefined;
  let src = shown.url;
  if (cloud) {
    // widths up to (never past) the native size, plus the native size itself
    const ws = [...WIDTHS.filter((w) => !native || w < native), ...(native ? [native] : [])];
    const list = ws.length ? ws : WIDTHS;
    srcSet = list
      .map((w) => `${cloudinaryVariant(shown.url, { w, q: "auto:best" })} ${w}w`)
      .join(", ");
    src = cloudinaryVariant(shown.url, { w: native ?? 960, q: "auto:best" }) ?? shown.url;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // remount when switching primary → fallback so the browser re-fetches
      key={usePrimary ? "primary" : "fallback"}
      ref={ref}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={shown.width}
      height={shown.height}
      alt={alt}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      onError={fail}
      className={`block h-auto w-full ${className}`}
    />
  );
}
