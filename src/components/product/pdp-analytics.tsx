"use client";

import { useEffect, useRef } from "react";
import { itemFromProduct, track, viewItem } from "@/lib/analytics";
import { usePdpVariant } from "./pdp-variants";

/**
 * GA4 for the product page, inside `PdpVariantsProvider` so it follows the size on show:
 *  - `view_item` once, for the size the page opened on (the URL's `?size=` decides it);
 *  - `select_size` each time the visitor switches size — including to a size that is only
 *    "soon" or sold out, which is the quickest read of demand for sizes not yet on sale.
 * Renders nothing.
 */
export function PdpAnalytics({ name, slug }: { name: string; slug: string }) {
  const { selected } = usePdpVariant();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === selected.sku) return; // Strict Mode's second pass, or no real change
    const first = last.current === null;
    last.current = selected.sku;
    if (first) {
      viewItem(
        itemFromProduct({
          sku: selected.sku,
          name,
          slug,
          volumeMl: selected.volumeMl,
          price: selected.price,
          mrp: selected.mrp,
        }),
      );
    } else {
      track("select_size", {
        item_id: selected.sku,
        item_name: name,
        size_ml: selected.volumeMl,
        size_state: selected.state,
      });
    }
  }, [selected, name, slug]);

  return null;
}
