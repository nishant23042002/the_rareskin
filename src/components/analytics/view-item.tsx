"use client";

import { useEffect, useRef } from "react";
import { viewItem, type GaItem } from "@/lib/analytics";

/** GA4 `view_item` for a page that is about one product but has no size chooser (the Discovery Set). Renders nothing. */
export function ViewItem({ item }: { item: GaItem }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === item.item_id) return;
    sent.current = item.item_id;
    viewItem(item);
  }, [item]);
  return null;
}
