import Link from "next/link";

import { RhIcon } from "@/components/ui/rh-icon";
import { getHomeAsset } from "@/lib/home-images";
import { frameStyle, HomeImage } from "./home-image";

/**
 * "The atelier" — the brand narrative, told through the perfumer's bench. A calm
 * two-up: the picture (4:3, `atelier-story.webp`) and a short note. On a phone the
 * heading comes first, then the picture, then the note.
 *
 * COPY STATUS: draft, written to the brand's voice and deliberately free of any
 * factual claim about how the juice is made (the founder letter doesn't say).
 * Confirm the wording with the founder before launch.
 */
export function AtelierStory() {
  const asset = getHomeAsset("atelier-story");
  return (
    <section className="rh-atelier" id="atelier" aria-labelledby="atelier-h">
      <div className="rh-wrap rh-atelier__grid">
        <figure className="rh-frame rh-atelier__media" style={frameStyle(asset)}>
          <HomeImage asset={asset} fill />
        </figure>
        <div className="rh-atelier__copy">
          <p className="rh-eyebrow">The atelier</p>
          <h2 className="rh-atelier__h rh-serif" id="atelier-h">
            Every extrait begins as a few drops, a notebook and a strip of
            paper.
          </h2>
          <p className="rh-lede">
            Before there is a bottle, there is a formula &mdash; smelled, noted,
            put away, and smelled again the next morning. We work slowly so the
            result can be quiet.
          </p>
          <Link className="rh-link-u" href="/the-idea">
            The idea behind it <RhIcon name="arrow" small />
          </Link>
        </div>
      </div>
    </section>
  );
}
