import { RhIcon } from "@/components/ui/rh-icon";
import { getHomeAsset } from "@/lib/home-images";
import { frameStyle, HomeImage } from "./home-image";

/**
 * "The ritual" — the unboxing and gifting moment (`unboxing-experience.webp`,
 * 3:2). The picture is wide, so on desktop it takes the larger column with the
 * note beside it; on a phone it sits full-bleed under the heading.
 *
 * COPY STATUS: draft and deliberately generic — no promise about what ships in
 * the box (a presentation box, insert, sleeve or note is not approved packaging:
 * see `claimsToVerify` for this asset in public/images/assets-manifest.json).
 */
export function UnboxingRitual() {
  const asset = getHomeAsset("unboxing-experience");
  return (
    <section className="rh-unbox" id="ritual" aria-labelledby="unbox-h">
      <div className="rh-wrap rh-unbox__grid">
        <div className="rh-unbox__copy">
          <p className="rh-eyebrow">The ritual</p>
          <h2 className="rh-h2" id="unbox-h">
            Open it slowly.
          </h2>
          <p className="rh-sub">A fragrance is felt long before it is smelled.</p>
          <p className="rh-lede">
            The weight in the hand, the first lift of the cap, a single spray.
            We design for that first minute, because that is when a scent starts
            to belong to you.
          </p>
          <a className="rh-btn rh-btn--ghost" href="#discovery">
            Start with the Discovery Set <RhIcon name="arrow" />
          </a>
        </div>
        <figure className="rh-frame rh-unbox__media" style={frameStyle(asset)}>
          <HomeImage asset={asset} fill />
        </figure>
      </div>
    </section>
  );
}
