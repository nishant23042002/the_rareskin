"use client";

import type { ReactNode } from "react";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { Ticker } from "@/components/ui/ticker";
import { formatINR, flOz, type FragranceSlug } from "@/lib/catalog";
import { PdpSizes } from "./pdp-sizes";
import { usePdpVariant } from "./pdp-variants";

/**
 * The buy box: the price of the size on show, the size chooser, and one button. Everything here follows the
 * chosen size: a size on sale shows its price and "Add to bag"; a size that is not on sale yet shows its price
 * (or "Price at launch") with a quiet, disabled "Available soon" and a way back to the size that is.
 * `children` is the row of reassurances, which the server renders.
 */
export function PdpBuyBox({
  name,
  slug,
  juice,
  children,
}: {
  name: string;
  slug: FragranceSlug;
  juice: string;
  children: ReactNode;
}) {
  const { variants, selected: v, main, select } = usePdpVariant();
  const priced = v.price > 0;
  const savePct = priced && v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;
  const soon = v.state === "soon";
  const sold = v.state === "soldout";
  const href = v.isMain ? `/fragrances/${slug}` : `/fragrances/${slug}?size=${v.volumeMl}`;

  return (
    <div
      data-buybox
      className="mt-7 rounded-[4px] border border-line-2 bg-surface p-[clamp(18px,3vw,28px)] [box-shadow:var(--sh-card)]"
    >
      <div
        className="flex min-h-[clamp(2rem,3.8vw,2.6rem)] flex-wrap items-center gap-x-3 gap-y-2"
        aria-live="polite"
      >
        {priced ? (
          <span className="text-[clamp(2rem,3.8vw,2.6rem)] leading-none font-light tracking-[0.01em]">
            <Ticker key={v.slug} text={formatINR(v.price)} />
          </span>
        ) : (
          <span className="serif-italic text-[clamp(1.4rem,2.8vw,1.8rem)] leading-none text-ink-2">
            Price at launch
          </span>
        )}
        {priced && v.mrp > v.price && <s className="text-[15px] text-ink-3">{formatINR(v.mrp)}</s>}
        {soon ? (
          <span className="rounded-full border border-line-2 px-2.5 py-1 text-[9.5px] tracking-[0.14em] text-ink-2 uppercase">
            {v.soonLabel || "Available soon"}
          </span>
        ) : sold ? (
          <span className="rounded-full border border-line-2 px-2.5 py-1 text-[9.5px] tracking-[0.14em] text-ink-2 uppercase">
            Sold out
          </span>
        ) : (
          savePct > 0 && (
            <span className="rounded-full bg-cta px-2.5 py-1 text-[9.5px] tracking-[0.14em] text-w0 uppercase">
              Launch price · {savePct}% off
            </span>
          )
        )}
      </div>
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
        {v.volumeMl} ml ({flOz(v.volumeMl)} fl oz) · inclusive of all taxes
        {priced && v.mrp > v.price ? ` · you save ${formatINR(v.mrp - v.price)}` : ""}
      </p>

      {variants.length > 1 && (
        <div className="pdp-sizes">
          <p className="pdp-sizes__head">
            <span>Size</span>
            <b>{v.volumeMl} ml</b>
          </p>
          <PdpSizes slug={slug} variants={variants} selectedMl={v.volumeMl} juice={juice} onSelect={select} />
        </div>
      )}

      {v.state === "available" ? (
        <AddToBagButton
          key={v.sku}
          sku={v.sku}
          name={name}
          price={v.price}
          mrp={v.mrp}
          fragrance={slug}
          href={href}
          meta={`Extrait · ${v.volumeMl} ml`}
          label={`Add to bag · ${formatINR(v.price)}`}
          list="Product page"
          variant="solid"
          size="lg"
          className="mt-5 w-full"
        />
      ) : (
        <>
          <button type="button" className="pdp-soon mt-5" disabled aria-disabled="true">
            {soon ? v.soonLabel || "Available soon" : "Sold out"}
          </button>
          {!v.isMain && main.state === "available" && (
            <p className="pdp-soon__alt">
              The {main.volumeMl} ml is on sale now.{" "}
              <button type="button" onClick={() => select(main.volumeMl)}>
                Shop the {main.volumeMl} ml
              </button>
            </p>
          )}
        </>
      )}

      {children}
    </div>
  );
}
