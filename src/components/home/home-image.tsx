import Image from "next/image";
import type { CSSProperties } from "react";

import {
  getVariant,
  homeAlt,
  homeImageSrc,
  type HomeAsset,
} from "@/lib/home-images";

/**
 * One homepage picture, drawn from the manifest (`@/lib/home-images`).
 *
 * - `fill` (the common case): the parent reserves the box (`frameStyle` gives it
 *   the manifest aspect ratio), the picture covers it with the manifest focal
 *   point. No layout shift, whatever the file's real pixel size.
 * - without `fill`: intrinsic width / height from the manifest, scaled to the
 *   container's width.
 *
 * Never pass `priority` / `preload` here: only the hero is the LCP element, and
 * it is drawn by `hero-media.tsx` (art-directed `<picture>`, `fetchPriority="high"`).
 * Alt text is the real description once the file is final, and empty while it is
 * a tonal placeholder (a decorative plate must not be announced as a photograph).
 */
export function HomeImage({
  asset,
  variant = "default",
  fill = false,
  sizes,
  className,
  style,
}: {
  asset: HomeAsset;
  variant?: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const v = getVariant(asset, variant);
  const objectPosition = asset.objectPosition[v.key] ?? asset.objectPosition.default ?? "50% 50%";
  const alt = homeAlt(asset);
  const common = {
    src: homeImageSrc(v.file),
    sizes: sizes ?? asset.sizes,
    quality: 85,
    className,
  };

  if (fill) {
    return (
      <Image
        {...common}
        alt={alt}
        fill
        style={{ objectFit: "cover", objectPosition, ...style }}
      />
    );
  }
  return (
    <Image
      {...common}
      alt={alt}
      width={v.width}
      height={v.height}
      style={{ width: "100%", height: "auto", objectPosition, ...style }}
    />
  );
}

/** the box a `fill` picture lives in: the manifest's aspect ratio, so the page never shifts */
export function frameStyle(asset: HomeAsset, variant = "default"): CSSProperties {
  const v = getVariant(asset, variant);
  return { aspectRatio: `${v.width} / ${v.height}` };
}
