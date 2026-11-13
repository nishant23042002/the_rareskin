"use client";

import { useEffect, useRef } from "react";
import { viewItemList, type GaItem } from "@/lib/analytics";

/**
 * GA4 `view_item_list` — "this list of products was on screen". Drop it as a child
 * of the element that holds the list; it renders nothing visible and watches its
 * PARENT, firing once per mount when ≥ `threshold` of the parent is in view (a
 * page view = a mount, so a visitor who comes back to the home page counts again).
 *
 * `items` may be rebuilt on every render — only the first fire reads them.
 */
export function ListImpression({
  listName,
  items,
  threshold = 0.3,
}: {
  listName: string;
  items: GaItem[];
  threshold?: number;
}) {
  const marker = useRef<HTMLElement>(null);
  const itemsRef = useRef(items);
  const sent = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  });

  useEffect(() => {
    const target = marker.current?.parentElement;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (sent.current || !entries.some((e) => e.isIntersecting)) return;
        sent.current = true;
        io.disconnect();
        viewItemList(listName, itemsRef.current);
      },
      { threshold },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [listName, threshold]);

  return <i ref={marker} hidden aria-hidden="true" />;
}
