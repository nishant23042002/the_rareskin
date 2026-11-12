"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FragranceVariant } from "@/lib/catalog";

/**
 * Which size of the fragrance the product page is showing. One client provider around the page, so the
 * gallery, the buy box, the sticky bar and the small "Extrait de Parfum · 50 ml" line all follow the same
 * choice. The server renders the size the URL asks for (`?size=10`), so a shared link opens on it with no flash;
 * a choice made on the page rewrites the URL in place (no navigation, no history entry, no refetch).
 */

interface PdpVariantState {
  variants: FragranceVariant[];
  /** the size on show */
  selected: FragranceVariant;
  /** the fragrance's own (main) size */
  main: FragranceVariant;
  select: (volumeMl: number) => void;
  /** how many times the visitor has switched: 0 until they do (the gallery only animates after one) */
  swaps: number;
}

const Ctx = createContext<PdpVariantState | null>(null);

export function PdpVariantsProvider({
  variants,
  initialMl,
  children,
}: {
  variants: FragranceVariant[];
  initialMl: number;
  children: ReactNode;
}) {
  const main = variants.find((v) => v.isMain) ?? variants[0];
  const [pick, setPick] = useState({ ml: initialMl, swaps: 0 });
  const selected = variants.find((v) => v.volumeMl === pick.ml) ?? main;

  const select = useCallback(
    (volumeMl: number) => {
      const next = variants.find((v) => v.volumeMl === volumeMl);
      if (!next) return;
      setPick((p) => (p.ml === next.volumeMl ? p : { ml: next.volumeMl, swaps: p.swaps + 1 }));
      try {
        const url = new URL(window.location.href);
        if (next.isMain) url.searchParams.delete("size");
        else url.searchParams.set("size", String(next.volumeMl));
        window.history.replaceState(window.history.state, "", url);
      } catch {
        /* an address that cannot be rewritten is not worth a failed choice */
      }
    },
    [variants],
  );

  const value = useMemo(
    () => ({ variants, selected, main, select, swaps: pick.swaps }),
    [variants, selected, main, select, pick.swaps],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePdpVariant(): PdpVariantState {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePdpVariant must be used inside <PdpVariantsProvider>");
  return v;
}

/** "Extrait de Parfum · 10 ml" — the size line above the name, following the choice */
export function PdpSizeLine({ prefix }: { prefix: string }) {
  const { selected } = usePdpVariant();
  return (
    <>
      {prefix}
      {selected.volumeMl} ml
    </>
  );
}
