import type { CSSProperties } from "react";

import { BagButton } from "@/components/cart/bag-button";
import { Flacon } from "@/components/ui/flacon";
import {
  cloudinaryVariant,
  formatINR,
  type DiscoverySetInfo,
  type Fragrance,
} from "@/lib/catalog";
import { getHomeAsset, isFinal } from "@/lib/home-images";
import { HomeImage } from "./home-image";

/**
 * The Discovery Set — a dark band where the picture and the words never share a
 * surface, so real photography can drop in without fighting the type. Wide
 * screens: the picture is the left half, the pitch sits on solid colour beside
 * it. Phones and tablets: heading, a clean 4:3 picture frame, the three vials'
 * names, the credit logic, then ONE full-width champagne bar. The set price is
 * credited in full toward a first 50 ml bottle — that is the whole argument.
 * Data comes from the catalogue (`@/server/data/catalog`).
 */

// where the three vials stand in the picture, as a share of it
const STAND = [
  { i: 0, left: "6%", width: "28%", bottom: "15%", rotate: -9 },
  { i: 2, left: "66%", width: "28%", bottom: "15%", rotate: 9 },
  { i: 1, left: "33%", width: "34%", bottom: "11%", rotate: 0 },
];

function Art({
  set,
  fragrances,
}: {
  set: DiscoverySetInfo;
  fragrances: Fragrance[];
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
  // the shipped picture (`discovery-set-10ml.webp`, 4:5) once it is final; the
  // photograph uploaded for the set in the catalogue (above) still wins
  const shipped = getHomeAsset("discovery-set-10ml");
  if (isFinal(shipped)) {
    return <HomeImage asset={shipped} fill className="rh-dset__art" />;
  }
  return (
    <div
      aria-hidden="true"
      className="rh-dset__art"
      style={{
        background: "var(--onyx)",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(62% 62% at 50% 48%,color-mix(in srgb,var(--champagne) 14%,transparent),transparent)",
        }}
      />
      {STAND.map((s) => {
        const f = fragrances[s.i];
        if (!f) return null;
        return (
          <span
            key={f.slug}
            style={
              {
                position: "absolute",
                left: s.left,
                width: s.width,
                bottom: s.bottom,
                transform: `rotate(${s.rotate}deg)`,
                transformOrigin: "50% 92%",
                filter: "drop-shadow(0 22px 20px rgba(0,0,0,.55))",
              } as CSSProperties
            }
          >
            <Flacon fragrance={f.slug} label />
          </span>
        );
      })}
    </div>
  );
}

export function DiscoverySet({
  set,
  fragrances,
}: {
  set: DiscoverySetInfo;
  fragrances: Fragrance[];
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
        <Art set={set} fragrances={fragrances} />
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
