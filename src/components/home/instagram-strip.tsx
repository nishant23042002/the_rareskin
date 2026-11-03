"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type ReactNode } from "react";

import { Flacon } from "@/components/ui/flacon";
import { RhIcon } from "@/components/ui/rh-icon";
import { useDragX } from "@/hooks/use-drag-x";
import { cloudinaryVariant, type FragranceSlug } from "@/lib/catalog";
import type { ShowcasePhoto } from "@/server/data/reviews";

/**
 * "@THERARESKIN" — six portrait tiles (the way a feed photo actually sits): a
 * six-up row from 900px, a scroll-snap row below that which a mouse can drag like
 * a phone. The visual-proof layer between the founder and the footer. Each tile
 * goes to the Instagram profile when one is set in Site Settings, else to the
 * photo's own page, else nowhere.
 *
 * Real photos (customer review photos, then product packshots) come first. Any
 * slots still empty are filled with illustrated placeholders — a flacon shot at
 * different angles, distances and grounds, the way a feed varies — so the band is
 * always full and on-brand until the real feed is wired in.
 */

const MAX = 6;

type Stand = {
  slug: FragranceSlug;
  /** the picture's ground */
  ground: string;
  /** diagonal stripe colour laid over it */
  stripe: string;
  /** flacon width as a share of the tile */
  width: number;
  /** left / top of the flacon box, as a share of the tile */
  left: number;
  top: number;
  rotate: number;
};

// Six compositions: a straight packshot, a tight close-up, a dark ground, a
// tilted hero, a small off-centre bottle, and a big tilted crop.
const PLACEHOLDERS: Stand[] = [
  {
    slug: "aurevan",
    ground: "linear-gradient(158deg,#f4efe2,#e7ddc5 56%,#d9cfb8)",
    stripe: "rgba(255,255,255,.4)",
    width: 46,
    left: 27,
    top: 26.2,
    rotate: 0,
  },
  {
    slug: "orvelis",
    ground: "linear-gradient(158deg,#f3e5c8,#e7cf9d 54%,#d6b673)",
    stripe: "rgba(255,249,228,.5)",
    width: 92,
    left: 6.5,
    top: 8.4,
    rotate: -4,
  },
  {
    slug: "vayren",
    ground: "linear-gradient(158deg,#3d2f24,#281f16 56%,#150d07)",
    stripe: "rgba(216,154,77,.2)",
    width: 48,
    left: 23.5,
    top: 23.6,
    rotate: 0,
  },
  {
    slug: "aurevan",
    ground: "linear-gradient(160deg,#e9e5da,#cdc7b6)",
    stripe: "rgba(255,255,255,.5)",
    width: 72,
    left: 29,
    top: 10.4,
    rotate: 14,
  },
  {
    slug: "orvelis",
    ground: "linear-gradient(160deg,#d9cbb0,#b7a27c)",
    stripe: "rgba(255,248,226,.45)",
    width: 44,
    left: 20.5,
    top: 30.8,
    rotate: -6,
  },
  {
    slug: "vayren",
    ground: "linear-gradient(160deg,#c9bda5,#9c8b6c)",
    stripe: "rgba(255,255,255,.3)",
    width: 76,
    left: 19.5,
    top: 13.2,
    rotate: 8,
  },
];

const STRIPES =
  "linear-gradient(205deg,#000,transparent 72%)"; /* fades the stripes out */

const CLS = "rh-ig__tile group rh-grain";

/** The tile's frame: the Instagram profile, else the photo's page, else static. */
function Shell({
  profileHref,
  href,
  style,
  label,
  children,
}: {
  profileHref?: string;
  href?: string | null;
  style?: CSSProperties;
  label?: string;
  children: ReactNode;
}) {
  if (profileHref) {
    return (
      <a
        href={profileHref}
        target="_blank"
        rel="noopener noreferrer"
        className={CLS}
        style={style}
        aria-label="See more on Instagram"
      >
        {children}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={CLS} style={style} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <span className={CLS} style={style} role="img" aria-label={label}>
      {children}
    </span>
  );
}

function PhotoTile({
  photo,
  profileHref,
}: {
  photo: ShowcasePhoto;
  profileHref?: string;
}) {
  const src =
    cloudinaryVariant(photo.url, { w: 420, h: 525, fill: true }) ?? photo.url;
  return (
    <Shell
      profileHref={profileHref}
      href={photo.href}
      style={{ background: "var(--stone)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className="size-full object-cover transition-transform duration-[800ms] ease-[var(--ease-brand)] group-hover:scale-[1.04]"
      />
    </Shell>
  );
}

function PlaceholderTile({
  stand,
  profileHref,
}: {
  stand: Stand;
  profileHref?: string;
}) {
  return (
    <Shell
      profileHref={profileHref}
      style={{ background: stand.ground }}
      label="THE RARESKIN, worn"
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(106deg,transparent 0 34px,${stand.stripe} 34px 78px)`,
          WebkitMaskImage: STRIPES,
          maskImage: STRIPES,
        }}
      />
      <span
        aria-hidden="true"
        className="transition-transform duration-[800ms] ease-[var(--ease-brand)] group-hover:scale-[1.04]"
        style={{
          position: "absolute",
          left: `${stand.left}%`,
          top: `${stand.top}%`,
          width: `${stand.width}%`,
          // rotate about the bottle's base, as a hand-held shot would pivot
          transform: `rotate(${stand.rotate}deg)`,
          transformOrigin: "50% 81%",
          filter: "drop-shadow(0 18px 18px rgba(0,0,0,.32))",
        }}
      >
        <Flacon fragrance={stand.slug} label />
      </span>
    </Shell>
  );
}

export function InstagramStrip({
  photos,
  profileHref,
  handle = "@therareskin",
}: {
  /** real photos only — empty slots fill with illustrated placeholders */
  photos: ShowcasePhoto[];
  profileHref?: string;
  handle?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const from = useRef(0);

  // when the row scrolls sideways (below 900px) a mouse can drag it
  useDragX(rowRef, {
    mouseOnly: true,
    enabled: () => {
      const r = rowRef.current;
      return !!r && r.scrollWidth > r.clientWidth + 2;
    },
    start: () => {
      const r = rowRef.current;
      if (!r) return;
      from.current = r.scrollLeft;
      r.style.scrollSnapType = "none";
    },
    move: (dx) => {
      const r = rowRef.current;
      if (r) r.scrollLeft = from.current - dx;
    },
    end: () => {
      window.setTimeout(() => {
        const r = rowRef.current;
        if (r) r.style.scrollSnapType = "";
      }, 50);
    },
    cancel: () => {
      const r = rowRef.current;
      if (r) r.style.scrollSnapType = "";
    },
  });

  const real = photos.slice(0, MAX);
  const fill = PLACEHOLDERS.slice(real.length, MAX);

  return (
    <section className="rh-ig" aria-labelledby="ig-h">
      <div className="rh-wrap rh-ig__head">
        <div>
          <p className="rh-eyebrow">On the skin</p>
          <h2 id="ig-h">{handle}</h2>
        </div>
        {profileHref && (
          <a
            className="rh-link-u"
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow <RhIcon name="arrow" small />
          </a>
        )}
      </div>
      <div className="rh-ig__row" ref={rowRef}>
        {real.map((p, i) => (
          <PhotoTile key={`${p.url}-${i}`} photo={p} profileHref={profileHref} />
        ))}
        {fill.map((s, i) => (
          <PlaceholderTile
            key={`ph-${real.length + i}`}
            stand={s}
            profileHref={profileHref}
          />
        ))}
      </div>
    </section>
  );
}
