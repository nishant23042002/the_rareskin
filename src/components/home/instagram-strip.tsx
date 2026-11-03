"use client";

import Link from "next/link";
import { useRef } from "react";

import { RhIcon } from "@/components/ui/rh-icon";
import { useDragX } from "@/hooks/use-drag-x";
import { cloudinaryVariant } from "@/lib/catalog";
import type { ShowcasePhoto } from "@/server/data/reviews";

/**
 * "@THERARESKIN" — six portrait tiles (the way a feed photo actually sits): a
 * six-up row from 900px, a scroll-snap row below that which a mouse can drag like
 * a phone. The visual-proof layer between the founder and the footer. Each tile
 * goes to the Instagram profile when one is set in Site Settings, else to the
 * photo's own page, else nowhere.
 */

const MAX = 6;

function Tile({
  photo,
  profileHref,
}: {
  photo: ShowcasePhoto;
  profileHref?: string;
}) {
  const src =
    cloudinaryVariant(photo.url, { w: 420, h: 525, fill: true }) ?? photo.url;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={photo.alt}
      loading="lazy"
      decoding="async"
      className="size-full object-cover transition-transform duration-[800ms] ease-[var(--ease-brand)] group-hover:scale-[1.04]"
    />
  );
  const cls = "rh-ig__tile group rh-grain bg-[var(--stone)]";
  if (profileHref) {
    return (
      <a
        href={profileHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        aria-label="See more on Instagram"
      >
        {img}
      </a>
    );
  }
  if (photo.href) {
    return (
      <Link href={photo.href} className={cls}>
        {img}
      </Link>
    );
  }
  return <span className={cls}>{img}</span>;
}

export function InstagramStrip({
  photos,
  profileHref,
  handle = "@therareskin",
}: {
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

  const tiles = photos.slice(0, MAX);
  if (tiles.length === 0) return null;

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
        {tiles.map((p, i) => (
          <Tile key={`${p.url}-${i}`} photo={p} profileHref={profileHref} />
        ))}
      </div>
    </section>
  );
}
