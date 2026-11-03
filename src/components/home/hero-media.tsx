"use client";

import { useState } from "react";

import { Flacon } from "@/components/ui/flacon";
import { cloudinaryVariant, FRAGRANCE_SLUGS } from "@/lib/catalog";

/**
 * The picture half of the homepage hero. A real photograph (Site Settings →
 * Homepage hero) when one is uploaded, drawn as a responsive Cloudinary srcset
 * that is never upscaled past the file's native width. Until then — or if the
 * photograph fails to load — the three flacons stand together on a warm stage,
 * drawn with the same vector bottles the rest of the site uses.
 */

export interface HeroPhotoSource {
  url: string;
  width?: number;
  height?: number;
}

const WIDTHS = [640, 960, 1280, 1600];

// left / width / bottom as a share of the stage, so it holds at any aspect ratio
const TRIO = [
  { slug: FRAGRANCE_SLUGS[0], left: "5%", width: "28%", bottom: "17%" },
  { slug: FRAGRANCE_SLUGS[2], left: "67%", width: "28%", bottom: "17%" },
  { slug: FRAGRANCE_SLUGS[1], left: "34%", width: "32%", bottom: "20%" },
];

function Trio() {
  return (
    <div
      aria-hidden="true"
      className="rh-hero__art"
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(160deg,#2d2721 0%,#5d4c39 52%,#8d7552 100%)",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(58% 46% at 56% 34%,rgba(244,207,145,.6),rgba(228,181,109,.12) 60%,transparent 100%)",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "23%",
          background: "linear-gradient(#bba073,#5f4b32)",
          borderTop: "1px solid rgba(236,217,174,.55)",
        }}
      />
      {TRIO.map((b) => (
        <span
          key={b.slug}
          style={{
            position: "absolute",
            left: b.left,
            width: b.width,
            bottom: b.bottom,
            filter: "drop-shadow(0 26px 22px rgba(0,0,0,.5))",
          }}
        >
          <Flacon fragrance={b.slug} label />
        </span>
      ))}
    </div>
  );
}

export function HeroMedia({ photo }: { photo?: HeroPhotoSource | null }) {
  const [failed, setFailed] = useState(false);
  if (!photo?.url || failed) return <Trio />;

  const native = photo.width;
  const cloud = photo.url.includes("res.cloudinary.com");
  let src = photo.url;
  let srcSet: string | undefined;
  if (cloud) {
    const ws = [
      ...WIDTHS.filter((w) => !native || w < native),
      ...(native ? [native] : []),
    ];
    const list = ws.length ? ws : WIDTHS;
    srcSet = list
      .map((w) => `${cloudinaryVariant(photo.url, { w, q: "auto:best" })} ${w}w`)
      .join(", ");
    src =
      cloudinaryVariant(photo.url, { w: native ?? 1280, q: "auto:best" }) ??
      photo.url;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? "(min-width: 900px) 50vw, 100vw" : undefined}
      width={photo.width}
      height={photo.height}
      alt="The three THE RARESKIN extraits, side by side"
      fetchPriority="high"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
