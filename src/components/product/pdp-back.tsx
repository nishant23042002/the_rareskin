"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * Back button of the product page: takes the customer back to where they came from (the Collection, a search, another product, the bag...).
 * It steps back in history only when the page before is one of this site's (Navigation API `entries()` where there is one, else a same-origin
 * `document.referrer`); a page opened straight from a link, a message or a bookmark has nothing to go back to, so it goes to the Collection.
 * Browser back from here to the homepage flies the picture back to its tile (`components/providers/pdp-flight.tsx`).
 */
export function PdpBack() {
  const router = useRouter();

  const goBack = () => {
    let inSite = false;
    try {
      const nav = (window as unknown as { navigation?: { currentEntry?: { index: number }; entries: () => { url: string | null }[] } }).navigation;
      if (nav?.currentEntry && nav.currentEntry.index > 0) {
        const prev = nav.entries()[nav.currentEntry.index - 1];
        inSite = !!prev?.url && new URL(prev.url).origin === window.location.origin;
      } else if (!nav) {
        inSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
      }
    } catch {
      inSite = false;
    }
    if (inSite) router.back();
    else router.push("/#collection");
  };

  return (
    <button type="button" onClick={goBack} aria-label="Go back" className="pdp-back">
      <Icon name="arrowLeft" className="size-[15px]" strokeWidth={1.6} />
    </button>
  );
}
