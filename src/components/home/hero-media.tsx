"use client";

import { getImageProps } from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { Flacon } from "@/components/ui/flacon";
import { cloudinaryVariant, FRAGRANCE_SLUGS } from "@/lib/catalog";
import { DEFAULT_HERO_CONCEPT, HERO_FOLLOWS_CARD_CONCEPT } from "@/config/hero.config";
import { HERO_WIDE_FROM } from "@/config/hero-spots";
import {
  getHomeAsset,
  getVariant,
  homeImageSrc,
  isFinal,
  resolveHeroAsset,
  type HomeAsset,
} from "@/lib/home-images";
import { useCardConcept } from "./card-concept";
import { useHero } from "./hero-frame";
import { useHeroVariant } from "./hero-variant";

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

/**
 * The shipped hero (`public/images/homepage/hero-trilogy*.webp`, manifest id
 * "hero"): an art-directed <picture> — the 16:9 master from 1280px up (the picture
 * box is about square there, so it shows the right of the frame, where the three
 * flacons stand), the 4:5 crop below. This is the LCP element, so it is the only
 * homepage picture that loads eagerly with `fetchPriority="high"` (`priority` is
 * deprecated in Next 16; `fetchPriority` is the documented replacement). The
 * intrinsic width/height give the browser the ratio; the box has a fixed height in
 * CSS, so nothing shifts.
 *
 * In the "stage" layout (see `HeroFrame`) the picture is not cropped by CSS `object-fit` but drawn
 * at its own aspect ratio inside `.rh-hero__stage`, a box that reproduces `cover` with container
 * units (app/hero.css); the flacon hotspots passed as `children` sit in that same box, so they are
 * pinned to the bottles at every screen size. The 16:9 master is used from `HERO_WIDE_FROM` px up
 * (a tablet gets the whole wide picture), the 4:5 crop below, and the picture spans the full width
 * of the hero, so its `sizes` is 100vw.
 */
function ShippedHero({
  asset,
  onError,
  stage,
  children,
  overlay,
}: {
  asset: HomeAsset;
  onError: () => void;
  stage: boolean;
  children?: ReactNode;
  overlay?: ReactNode;
}) {
  const desktop = getVariant(asset, "desktop");
  const mobile = getVariant(asset, "mobile");
  const common = {
    alt: asset.alt,
    sizes: stage ? "100vw" : asset.sizes,
    quality: 85,
    loading: "eager" as const,
    fetchPriority: "high" as const,
  };
  const d = getImageProps({
    ...common,
    src: homeImageSrc(desktop.file),
    width: desktop.width,
    height: desktop.height,
  });
  const m = getImageProps({
    ...common,
    src: homeImageSrc(mobile.file),
    width: mobile.width,
    height: mobile.height,
  });
  const picture = (
    <picture>
      <source
        media={stage ? `(min-width: ${HERO_WIDE_FROM}px)` : desktop.media}
        srcSet={d.props.srcSet}
        sizes={common.sizes}
      />
      <img
        {...m.props}
        alt={asset.alt}
        // the focal point of each art-directed variant comes from the manifest;
        // home.css reads these two properties (mobile, and from 1280px desktop)
        style={
          {
            ...m.props.style,
            "--op-m": asset.objectPosition.mobile,
            "--op-d": asset.objectPosition.desktop,
          } as CSSProperties
        }
        onError={onError}
      />
    </picture>
  );
  if (!stage) return picture;
  return (
    <div
      className="rh-hero__art"
      style={
        {
          "--ar-w": desktop.width / desktop.height,
          "--ar-t": mobile.width / mobile.height,
        } as CSSProperties
      }
    >
      <div className="rh-hero__stage">
        <div className="rh-hero__drift">
          {picture}
          {children}
        </div>
      </div>
      {overlay}
    </div>
  );
}

export function HeroMedia({
  photo,
  children,
  overlay,
}: {
  photo?: HeroPhotoSource | null;
  /** the flacon hotspots: drawn only in the stage layout, inside the picture's own box */
  children?: ReactNode;
  /** drawn only in the stage layout, over the picture and pinned to the visible hero rather than to the picture (the plaques) */
  overlay?: ReactNode;
}) {
  const { failed, setFailed, layout } = useHero();
  // the art direction chosen in the preview bar (src/config/hero.config.ts); the baseline hero until a direction's pictures are final
  const cardConcept = useCardConcept();
  // a reference variant (?hero=1..4, or `activeHeroVariant`) beats the card direction; a variant that is still a placeholder falls back to it
  const heroVariant = useHeroVariant();
  const heroAsset = resolveHeroAsset(HERO_FOLLOWS_CARD_CONCEPT ? cardConcept : DEFAULT_HERO_CONCEPT, heroVariant);
  // 1. a photograph uploaded in Site Settings wins; 2. the shipped hero from the
  // manifest once it is final; 3. the illustrated trio
  if (!photo?.url || failed) {
    if (!failed && isFinal(getHomeAsset("hero"))) {
      return (
        <ShippedHero
          key={heroAsset.id}
          asset={heroAsset}
          onError={() => setFailed(true)}
          stage={layout === "stage"}
          overlay={overlay}
        >
          {children}
        </ShippedHero>
      );
    }
    return <Trio />;
  }

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
