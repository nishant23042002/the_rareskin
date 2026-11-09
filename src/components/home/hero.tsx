import Link from "next/link";

import { RhIcon } from "@/components/ui/rh-icon";
import { Ticker } from "@/components/ui/ticker";
import { formatINR, type Fragrance } from "@/lib/catalog";
import { HeroFrame } from "./hero-frame";
import { HeroMedia, type HeroPhotoSource } from "./hero-media";

/**
 * Homepage hero — a calm split: the headline on a panel that is lit by the picture
 * beside it (`HeroFrame` tints it from the picture's own edge), the picture to its
 * right (stacked on a phone, picture below). One idea, one button; under it a quiet
 * index of the three, because the picture shows three and the visitor should be one
 * click from each. On a phone the launch price sits under the button so the offer is
 * on the first screen.
 */
export function Hero({
  photo,
  price,
  mrp,
  fragrances,
}: {
  /** Site Settings → Homepage hero; the illustrated trio shows when absent */
  photo?: HeroPhotoSource | null;
  /** launch price + MRP, rupees */
  price: number;
  mrp: number;
  /** the three, for the index under the button (name, first notes, link) */
  fragrances: Fragrance[];
}) {
  return (
    <HeroFrame hasPhoto={Boolean(photo?.url)}>
      <div className="rh-hero__text">
        <div className="rh-hero__copy">
          <p className="rh-eyebrow rh-hero__eyebrow">
            <span className="rh-hero__rule" aria-hidden="true" />
            The launch collection
          </p>
          <h1 className="rh-display" id="hero-h">
            Three
            <br />
            Extraits
          </h1>
          <p className="rh-hero__sub rh-serif">Scents that stay with you.</p>
          <a className="rh-btn rh-btn--solid" href="#collection">
            Shop the three <RhIcon name="arrow" />
          </a>
          {mrp > price && (
            <p className="rh-hero__offer">
              <span className="rh-pill">Launch offer</span>
              <span className="rh-tnum">
                <b>
                  <Ticker text={formatINR(price)} />
                </b>
                <s>{formatINR(mrp)}</s>
              </span>
            </p>
          )}
          {fragrances.length > 0 && (
            <ol className="rh-hero__index" aria-label="The three extraits">
              {fragrances.map((f, i) => (
                <li key={f.slug}>
                  <Link href={`/fragrances/${f.slug}`}>
                    <span className="rh-hero__no rh-tnum" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <b>{f.name}</b>
                    <em>{f.notes.slice(0, 2).join(" · ")}</em>
                    <RhIcon name="arrow" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <div className="rh-hero__media rh-grain">
        <HeroMedia photo={photo} />
      </div>
    </HeroFrame>
  );
}
