import { RhIcon } from "@/components/ui/rh-icon";
import { getHomeAsset } from "@/lib/home-images";
import { HomeImage } from "./home-image";

/**
 * "On skin" — a full-bleed mood break (`scent-on-skin-lifestyle.webp`, 16:9).
 * The words sit over the picture, so a scrim (`.rh-skin__scrim`) guarantees the
 * text contrast whatever the photograph is: from the left on desktop, from the
 * bottom on a phone, where the frame is 4:5 and the photograph is cropped to its
 * centre. WCAG AA (4.5:1) is checked in the scrim comment in home.css.
 */
export function ScentOnSkin() {
  const asset = getHomeAsset("scent-on-skin");
  return (
    <section className="rh-skin rh-dark" id="on-skin" aria-labelledby="skin-h">
      <div className="rh-skin__media">
        <HomeImage asset={asset} fill />
      </div>
      <span className="rh-skin__scrim" aria-hidden="true" />
      <div className="rh-wrap rh-skin__in">
        <div className="rh-skin__copy">
          <p className="rh-eyebrow">On skin</p>
          <h2 className="rh-skin__h rh-serif" id="skin-h">
            Worn close, it becomes yours.
          </h2>
          <p className="rh-skin__sub">
            An extrait warms slowly on the pulse points. What opens bright
            settles into skin.
          </p>
          <a className="rh-btn rh-btn--light" href="#quiz">
            Find your match <RhIcon name="arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}
