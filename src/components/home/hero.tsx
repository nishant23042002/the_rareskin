import { RhIcon } from "@/components/ui/rh-icon";
import { Ticker } from "@/components/ui/ticker";
import { formatINR, type Fragrance } from "@/lib/catalog";
import { HeroFrame } from "./hero-frame";
import { HeroIndex, HeroPlaques, HeroSpots, type HeroExploreItem } from "./hero-explore";
import { HeroMedia, type HeroPhotoSource } from "./hero-media";

/**
 * Homepage hero: the picture, explorable, with the headline standing on its wall.
 *
 * From 1024px the shipped picture fills the hero and the headline, one button, the launch price and a
 * numbered index of the three sit on its empty left; below that (tablet, phone) the text panel is above
 * and the picture below, so nothing ever overlaps a bottle. The picture is alive: a dot on every flacon,
 * a focus frame and plaque on hover, the index linked to them, the text and the
 * dots arriving in sequence (see `HeroFrame`, `HeroExplore`, `app/hero.css`). A photograph uploaded in
 * Site Settings, or one of the preview bar's other art directions, keeps the plain split layout, because
 * the hotspots are measured on the shipped picture only (`config/hero-spots.ts`).
 *
 * The launch price is stated here, on the first screen, with the reason it is special: it is a launch
 * price, and it will not last. The full offer is the pass right below (`LaunchOffer`).
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
  /** the three: the index, the dots and the plaques */
  fragrances: Fragrance[];
}) {
  const items: HeroExploreItem[] = fragrances.map((f) => ({
    slug: f.slug,
    name: f.name,
    title: f.title,
    notes: f.notes,
  }));
  const hasOffer = mrp > price;
  const pct = hasOffer ? Math.round((1 - price / mrp) * 100) : 0;

  return (
    <HeroFrame hasPhoto={Boolean(photo?.url)}>
      <div className="rh-hero__text">
        <div className="rh-hero__copy">
          <p className="rh-eyebrow rh-hero__eyebrow">
            <span className="rh-hero__rule" aria-hidden="true" />
            The launch collection
          </p>
          <h1 className="rh-display" id="hero-h">
            <span className="rh-hero__ln">
              <span>Three</span>
            </span>{" "}
            <span className="rh-hero__ln">
              <span>Extraits</span>
            </span>
          </h1>
          <p className="rh-hero__sub rh-serif">Scents that stay with you.</p>
          <div className="rh-hero__cta">
            <a
              className="rh-btn rh-btn--solid"
              href="#collection"
              data-ga-promo="Hero · Shop the three"
              data-ga-slot="hero"
              data-ga-view
            >
              Shop the three <RhIcon name="arrow" />
            </a>
            <a className="rh-hero__alt" href="#quiz" data-ga-promo="Hero · Find your scent" data-ga-slot="hero">
              <span>Find your scent</span>
            </a>
          </div>
          {hasOffer && (
            <p className="rh-hero__offer">
              <span className="rh-hero__tag">
                <i aria-hidden="true" />
                Launch price · limited time
              </span>
              <span className="rh-hero__amt rh-tnum">
                <b>
                  <Ticker text={formatINR(price)} />
                </b>
                <s>
                  <span className="sr-only">was </span>
                  {formatINR(mrp)}
                </s>
                <em>
                  <span className="sr-only">, </span>&minus;{pct}%
                </em>
              </span>
            </p>
          )}
          {items.length > 0 && <HeroIndex items={items} />}
        </div>
      </div>
      <div className="rh-hero__media rh-grain">
        <HeroMedia photo={photo} overlay={<HeroPlaques items={items} price={price} mrp={mrp} />}>
          <HeroSpots items={items} price={price} />
        </HeroMedia>
      </div>
      <span className="rh-hero__light" aria-hidden="true" />
      <span className="rh-hero__cue" aria-hidden="true">
        <i />
        Scroll
      </span>
    </HeroFrame>
  );
}
