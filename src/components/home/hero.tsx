import { RhIcon } from "@/components/ui/rh-icon";
import { formatINR } from "@/lib/catalog";
import { HeroMedia, type HeroPhotoSource } from "./hero-media";

/**
 * Homepage hero — a calm split: the headline on a warm stone panel, the picture
 * beside it (stacked on a phone, picture below). One idea, one button. On a phone
 * the launch price sits under the button so the offer is on the first screen.
 */
export function Hero({
  photo,
  price,
  mrp,
}: {
  /** Site Settings → Homepage hero; the illustrated trio shows when absent */
  photo?: HeroPhotoSource | null;
  /** launch price + MRP, rupees */
  price: number;
  mrp: number;
}) {
  return (
    <section className="rh-hero" aria-labelledby="hero-h">
      <div className="rh-hero__text">
        <div className="rh-hero__copy">
          <p className="rh-eyebrow">The launch collection</p>
          <h1 className="rh-display" id="hero-h">
            Three
            <br />
            Extraits
          </h1>
          <p className="rh-hero__sub rh-serif">Scents that stay with you.</p>
          <a className="rh-btn rh-btn--ghost" href="#collection">
            Shop the three <RhIcon name="arrow" />
          </a>
          {mrp > price && (
            <p className="rh-hero__offer">
              <span className="rh-pill">Launch offer</span>
              <span className="rh-tnum">
                <b>{formatINR(price)}</b>
                <s>{formatINR(mrp)}</s>
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="rh-hero__media rh-grain">
        <HeroMedia photo={photo} />
      </div>
    </section>
  );
}
