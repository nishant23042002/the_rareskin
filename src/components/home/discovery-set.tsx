import Link from "next/link";

import { BagButton } from "@/components/cart/bag-button";
import { RhIcon } from "@/components/ui/rh-icon";
import {
  cloudinaryVariant,
  formatINR,
  type DiscoverySetInfo,
  type Fragrance,
} from "@/lib/catalog";
import { DiscoveryStage } from "./discovery-stage";

/**
 * The Discovery Set — a band where the picture and the words never share a surface. Wide screens: the picture is the
 * left half, the pitch sits on solid colour beside it. Phones and tablets: heading, a clean 4:3 picture frame, the
 * three vials' names, the credit logic, then ONE full-width bar. The set price is credited in full toward a first
 * 50 ml bottle — that is the whole argument. Data comes from the catalogue (`@/server/data/catalog`).
 *
 * Two uses, one DARK look (onyx; the quiz above it is the light band, so the page alternates):
 *  - `home`: the whole picture is a link to /discovery-set.
 *  - `page`: the set page's own band; each bottle links to its 10 ml page.
 * (`.rh-dset--light` in home.css and the light stage files are kept, unused.)
 * The picture is the interactive stage (`DiscoveryStage`: the three bottles lift, light up and drift on the pointer);
 * a photograph uploaded for the set in the catalogue still wins over it. (The flat dark picture of the manifest,
 * `discovery-set-10ml`, is kept but no longer drawn.)
 */

function Art({
  set,
  fragrances,
  variant,
}: {
  set: DiscoverySetInfo;
  fragrances: Fragrance[];
  variant: "home" | "page";
}) {
  const photo = cloudinaryVariant(set.image, { w: 1400, q: "auto:best" });
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={`${set.name}: three ${set.perVialMl} ml extraits`}
        loading="lazy"
        decoding="async"
        className="rh-dset__art object-cover"
      />
    );
  }
  return (
    <DiscoveryStage
      tone="dark"
      fragrances={fragrances.map((f) => ({ slug: f.slug, name: f.name, mood: f.mood, notes: f.notes ?? [] }))}
      href={variant === "home" ? "/discovery-set" : undefined}
      linkBottles={variant === "page"}
      flight={variant === "home" ? "from" : "to"}
      label={
        variant === "home"
          ? `${set.name}: three ${set.perVialMl} ml extraits, ${fragrances.map((f) => f.name).join(", ")}. Open the set`
          : `${set.name}: ${fragrances.map((f) => f.name).join(", ")}`
      }
    />
  );
}

export function DiscoverySet({
  set,
  fragrances,
  variant = "home",
}: {
  set: DiscoverySetInfo;
  fragrances: Fragrance[];
  variant?: "home" | "page";
}) {
  // "Meet all three. Keep the one that becomes yours." → a heading + an italic line
  const [lead, ...rest] = set.headline.split(/(?<=[.!?])\s+/);
  const tail = rest.join(" ");

  const line = {
    sku: set.sku,
    name: set.name,
    price: set.price,
    mrp: set.mrp,
    href: "/discovery-set",
    meta: `${set.vialCount} × ${set.perVialMl} ml`,
  };

  return (
    <section
      className="rh-dset rh-dark"
      id="discovery"
      aria-labelledby="dset-h"
    >
      <div className="rh-dset__scene">
        <Art set={set} fragrances={fragrances} variant={variant} />
      </div>
      <div className="rh-wrap rh-dset__in">
        <p className="rh-eyebrow">The Discovery Set</p>
        <h2 className="rh-dset__h" id="dset-h">
          {lead}
        </h2>
        {tail && <p className="rh-dset__h2 rh-serif">{tail}</p>}
        <p className="rh-dset__detail">{set.detail}</p>
        <BagButton
          line={line}
          list="Discovery Set"
          className="rh-dset__cta"
          added={<span style={{ margin: "0 auto" }}>Added ✓</span>}
        >
          <span>Add the set</span>
          <span className="rh-tnum">
            {formatINR(set.price)}
            {set.mrp > set.price && <s>{formatINR(set.mrp)}</s>}
          </span>
        </BagButton>
        <p className="rh-dset__fine">
          <span>One credit per customer</span>
          <span className="rh-dset__fine-x">
            {" "}
            &middot; COD available &middot; Free shipping across India
          </span>
        </p>
        {variant === "home" && (
          <Link className="rh-link-u rh-dset__more" href="/discovery-set">
            Explore the set <RhIcon name="arrow" small />
          </Link>
        )}
        <div className="rh-dset__vials">
          {fragrances.map((f) => (
            <div key={f.slug}>
              <b>{f.name}</b>
              <span>
                {f.mood[0]} &middot; {set.perVialMl} ml
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
