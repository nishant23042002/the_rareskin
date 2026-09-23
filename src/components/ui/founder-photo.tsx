"use client";

import { useEffect, useRef, useState } from "react";

import { Mark } from "@/components/ui/mark";
import { cloudinaryVariant } from "@/lib/catalog";

/**
 * The founder's photo — shared by the homepage "first letter" card and
 * /the-idea. Fills its (relatively-positioned) parent.
 *
 * Responsive: a Cloudinary `srcset` of width-limited, uncropped variants, so the
 * browser fetches the right size for the box + DPR, and CSS `object-cover` with a
 * face-anchored `object-position` does the cropping — the same photo works in a
 * wide 4:3 mobile banner and a tall desktop column without a crop per breakpoint.
 *
 * Fallback: `FOUNDER_FALLBACK` (committed in /public) shows when no portrait is
 * set in Site Settings, or the configured one fails to load. If even that fails
 * the parent's gradient + mark is left showing.
 */

export const FOUNDER_FALLBACK = "/founder/founder-fallback.webp";

const WIDTHS = [360, 540, 720, 960, 1280];

export function FounderPhoto({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
}: {
  /** the configured portrait URL (Cloudinary); falls back when absent/broken */
  src?: string | null;
  alt: string;
  /** the `sizes` attribute — the rendered width of the box at each breakpoint */
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<"primary" | "fallback" | null>(null);
  const ref = useRef<HTMLImageElement>(null);

  const usePrimary = Boolean(src) && failed === null;
  const useFallback = !usePrimary && failed !== "fallback";

  // An `error` can fire before hydration attaches `onError` — catch that case.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) {
      setFailed((f) => (f === null && src ? "primary" : "fallback"));
    }
  }, [src]);

  if (!usePrimary && !useFallback) {
    return (
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <Mark className="w-14 text-ink/12" strokeWidth={1.4} />
      </span>
    );
  }

  const cloud = usePrimary && src?.includes("res.cloudinary.com");
  const srcSet = cloud
    ? WIDTHS.map((w) => `${cloudinaryVariant(src, { w })} ${w}w`).join(", ")
    : undefined;
  const url = usePrimary
    ? ((cloud ? cloudinaryVariant(src, { w: 720 }) : src) as string)
    : FOUNDER_FALLBACK;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // remount when switching primary → fallback so the browser re-fetches
      key={usePrimary ? "primary" : "fallback"}
      ref={ref}
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      onError={() =>
        setFailed((f) => (f === null && src ? "primary" : "fallback"))
      }
      className={`absolute inset-0 size-full object-cover object-[50%_30%] ${className}`}
    />
  );
}
