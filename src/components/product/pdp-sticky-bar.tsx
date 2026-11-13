"use client";

import { useEffect, useState } from "react";

import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/catalog";
import type { FragranceSlug } from "@/lib/catalog";
import { pdpSizeSlides } from "@/lib/pdp-images";
import { usePdpVariant } from "./pdp-variants";

/**
 * A slim buy bar for the product page. It slides up once the buy box has scrolled out of view above,
 * so "Add to bag" is never further than a thumb away while someone reads the scent, the details or the
 * reviews. It steps aside as soon as the bag has something in it (the bag bar takes the bottom strip
 * then, with Checkout), and while the bag drawer is open. While it is up it sets `data-pdp-bar` on
 * <html>, which lifts the floating offer note and the back-to-top button above it (`pdp.css`).
 *
 * It follows the size chosen in the buy box: that size's price, picture and SKU; a size that is not on sale
 * yet shows a quiet "Available soon" in place of the button.
 */
export function PdpStickyBar({
  name,
  slug,
  image,
}: {
  name: string;
  slug: FragranceSlug;
  /** the fragrance's cover picture (the 50 ml's); a size with pictures of its own shows its first */
  image: string | null;
}) {
  const { count, isOpen } = useCart();
  const { selected: v } = usePdpVariant();
  const [past, setPast] = useState(false);

  useEffect(() => {
    const box = document.querySelector("[data-buybox]");
    if (!box || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([e]) => setPast(!e.isIntersecting && e.boundingClientRect.bottom < 0),
      { threshold: 0 },
    );
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const show = past && count === 0 && !isOpen;

  useEffect(() => {
    document.documentElement.toggleAttribute("data-pdp-bar", show);
    return () => document.documentElement.removeAttribute("data-pdp-bar");
  }, [show]);

  const pic = v.isMain ? image : (pdpSizeSlides(slug, v.volumeMl, name, v.gallery)[0]?.tiny ?? image);
  const priced = v.price > 0;

  return (
    <div className={cn("pdp-bar", show && "is-on")} aria-hidden={!show} inert={!show}>
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-14 xl:px-[92px]">
        {pic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pic}
            alt=""
            width={44}
            height={44}
            decoding="async"
            className="size-11 shrink-0 rounded-[3px] border border-line object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] tracking-[0.14em] uppercase">
            {name}
            <span className="text-ink-3"> · {v.volumeMl} ml</span>
          </p>
          <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-2">
            {priced ? formatINR(v.price) : "Price at launch"}
            {priced && v.mrp > v.price && (
              <s className="ml-1.5 text-[11px] text-ink-3">{formatINR(v.mrp)}</s>
            )}
          </p>
        </div>
        {v.state === "available" ? (
          <AddToBagButton
            key={v.sku}
            sku={v.sku}
            name={name}
            price={v.price}
            mrp={v.mrp}
            fragrance={slug}
            href={v.isMain ? `/fragrances/${slug}` : `/fragrances/${slug}?size=${v.volumeMl}`}
            meta={`Extrait · ${v.volumeMl} ml`}
            label="Add to bag"
            list="Product page"
            variant="solid"
            size="sm"
            className="shrink-0"
          />
        ) : (
          <span className="pdp-soon pdp-soon--sm shrink-0" aria-disabled="true">
            {v.state === "soon" ? v.soonLabel || "Available soon" : "Sold out"}
          </span>
        )}
      </div>
    </div>
  );
}
