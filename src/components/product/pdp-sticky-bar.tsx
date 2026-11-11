"use client";

import { useEffect, useState } from "react";

import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/catalog";
import type { FragranceSlug } from "@/lib/catalog";

/**
 * A slim buy bar for the product page. It slides up once the buy box has scrolled out of view above,
 * so "Add to bag" is never further than a thumb away while someone reads the scent, the details or the
 * reviews. It steps aside as soon as the bag has something in it (the bag bar takes the bottom strip
 * then, with Checkout), and while the bag drawer is open. While it is up it sets `data-pdp-bar` on
 * <html>, which lifts the floating offer note and the back-to-top button above it (`pdp.css`).
 */
export function PdpStickyBar({
  sku,
  name,
  price,
  mrp,
  slug,
  volumeMl,
  image,
}: {
  sku: string;
  name: string;
  price: number;
  mrp: number;
  slug: FragranceSlug;
  volumeMl: number;
  image: string | null;
}) {
  const { count, isOpen } = useCart();
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

  return (
    <div className={cn("pdp-bar", show && "is-on")} aria-hidden={!show} inert={!show}>
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-14 xl:px-[92px]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            width={44}
            height={44}
            decoding="async"
            className="size-11 shrink-0 rounded-[3px] border border-line object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] tracking-[0.14em] uppercase">{name}</p>
          <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-2">
            {formatINR(price)}
            <s className="ml-1.5 text-[11px] text-ink-3">{formatINR(mrp)}</s>
          </p>
        </div>
        <AddToBagButton
          sku={sku}
          name={name}
          price={price}
          mrp={mrp}
          fragrance={slug}
          href={`/fragrances/${slug}`}
          meta={`Extrait · ${volumeMl} ml`}
          label="Add to bag"
          variant="solid"
          size="sm"
          className="shrink-0"
        />
      </div>
    </div>
  );
}
