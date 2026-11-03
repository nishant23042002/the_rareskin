import Link from "next/link";

import {
  FounderPhoto,
  type FounderPhotoSource,
} from "@/components/ui/founder-photo";
import { RhIcon } from "@/components/ui/rh-icon";

/**
 * "The first letter" — the founder's note as a dark band: his portrait (never
 * cropped), the letter in his own words, and the visitor cast — truthfully, the
 * store hasn't launched — as one of the first to wear it.
 *
 * The portrait comes from Site Settings → Founder (`founderPortrait`); until one
 * is uploaded (or if it fails to load) `FounderPhoto` shows the bundled fallback.
 */

const QUOTE =
  "I didn’t set out to make another perfume. I wanted to make an experience — a scent that keeps telling your story long after you’ve left the room.";
const CLOSING = "This is only the beginning, and I’m grateful you’re here for it.";

export function FounderNote({
  portrait,
}: {
  portrait?: FounderPhotoSource | null;
}) {
  return (
    <section
      className="rh-founder rh-dark"
      id="founder"
      aria-labelledby="founder-h"
    >
      <div className="rh-founder__tex" aria-hidden="true" />
      <div className="rh-wrap rh-founder__grid">
        <figure className="rh-founder__photo">
          <FounderPhoto
            photo={portrait}
            alt="Vijay More, founder of THE RARESKIN"
            // ≤260px on a phone, up to the 400px column from 900px
            sizes="(min-width: 900px) 400px, min(72vw, 260px)"
          />
        </figure>
        <div className="rh-founder__copy">
          <div className="rh-founder__meta">
            <p className="rh-eyebrow">The first letter</p>
            <p className="rh-eyebrow">Roha, Maharashtra</p>
          </div>
          <h2 className="rh-founder__quote" id="founder-h">
            {QUOTE}
          </h2>
          <p className="rh-lede">{CLOSING}</p>
          <div className="rh-founder__sign">
            <b>Vijay More</b>
            <small>Founder &middot; THE RARESKIN</small>
          </div>
          <p className="rh-founder__first">
            You&rsquo;re among the first to wear it
          </p>
          <Link className="rh-btn rh-btn--light" href="/the-idea">
            Read the whole letter <RhIcon name="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}
