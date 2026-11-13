"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { Flacon } from "@/components/ui/flacon";
import { Icon } from "@/components/ui/icon";
import { ListImpression } from "@/components/analytics/list-impression";
import { useCart } from "@/components/providers/cart-provider";
import { itemFromSuggestion } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import {
  DISCOVERY_SET_SLUG,
  formatINR,
  type BagSuggestion,
} from "@/lib/catalog";

/** how long an added card stays in its "Added" state before it folds away */
const ADDED_MS = 750;
const FOLD_MS = 420;

type Phase = "added" | "folding";

/**
 * The bag's one-tap add-ons. The Discovery Set leads as a featured card
 * ("Complete your ritual with the 3 × 10 ml Discovery Set"); whatever is left
 * of the range follows as compact rows. Tapping "+ Add" puts the item in the
 * bag straight away — the card shows "Added", then folds away, so nothing
 * jumps and the shopper never leaves the bag.
 */
export function BagSuggestions({
  heading,
  className,
  style,
}: {
  /** defaults to "Frequently added together" (or "Start your collection" in an empty bag) */
  heading?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { suggestions, lines, addItem } = useCart();
  const [phase, setPhase] = useState<Record<string, Phase>>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const inBag = useMemo(() => new Set(lines.map((l) => l.sku)), [lines]);
  // a card that was just added stays on screen until it has folded away
  const open = suggestions.filter((s) => !inBag.has(s.sku) || phase[s.sku]);
  const featured = open.find((s) => s.slug === DISCOVERY_SET_SLUG) ?? null;
  const rest = open.filter((s) => s !== featured);

  function add(s: BagSuggestion) {
    if (phase[s.sku]) return;
    addItem(
      {
        sku: s.sku,
        name: s.name,
        price: s.price,
        mrp: s.mrp,
        fragrance: s.fragrance,
        href: s.href,
        meta: s.meta,
      },
      "Bag suggestions",
    );
    setPhase((p) => ({ ...p, [s.sku]: "added" }));
    timers.current.push(
      window.setTimeout(
        () => setPhase((p) => ({ ...p, [s.sku]: "folding" })),
        ADDED_MS,
      ),
      window.setTimeout(
        () =>
          setPhase((p) => {
            const next = { ...p };
            delete next[s.sku];
            return next;
          }),
        ADDED_MS + FOLD_MS,
      ),
    );
  }

  if (open.length === 0) {
    if (lines.length === 0 || suggestions.length === 0) return null;
    return (
      <p
        className={cn(
          "px-5 text-[10px] tracking-[0.14em] text-ink-3 uppercase",
          className,
        )}
        style={style}
      >
        You have the whole range in your bag.
      </p>
    );
  }

  return (
    <section className={className} style={style}>
      <h3 className="px-5 text-[9.5px] font-medium tracking-[0.18em] text-ink-3 uppercase">
        {heading ??
          (lines.length > 0 ? "Frequently added together" : "Start your collection")}
      </h3>

      <ul className="mt-3.5 px-5">
        {featured && (
          <Fold key={featured.sku} phase={phase[featured.sku]}>
            <FeaturedCard
              s={featured}
              phase={phase[featured.sku]}
              onAdd={() => add(featured)}
              emptyBag={lines.length === 0}
            />
          </Fold>
        )}
        {rest.map((s) => (
          <Fold key={s.sku} phase={phase[s.sku]}>
            <RangeRow s={s} phase={phase[s.sku]} onAdd={() => add(s)} />
          </Fold>
        ))}
      </ul>
      <ListImpression
        listName="Bag suggestions"
        items={[...(featured ? [featured] : []), ...rest].map((s, i) =>
          itemFromSuggestion(s, "Bag suggestions", i),
        )}
      />
    </section>
  );
}

/** a list item that collapses to nothing once it has been added */
function Fold({
  phase,
  children,
}: {
  phase?: Phase;
  children: React.ReactNode;
}) {
  return (
    <li
      className="grid transition-[grid-template-rows,opacity] duration-[420ms] ease-[var(--ease-out-strong)]"
      style={{
        gridTemplateRows: phase === "folding" ? "0fr" : "1fr",
        opacity: phase === "folding" ? 0 : 1,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </li>
  );
}

function AddButton({
  phase,
  onAdd,
  label,
  className,
}: {
  phase?: Phase;
  onAdd: () => void;
  label: string;
  className?: string;
}) {
  const added = Boolean(phase);
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={added}
      aria-label={added ? `${label} added to bag` : `Add ${label} to bag`}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-[10.5px] font-medium tracking-[0.14em] uppercase transition-[transform,background-color,border-color,color] duration-200 active:scale-95",
        added
          ? "border-gilt/60 bg-gilt/10 text-gilt"
          : "border-ink text-ink hover:bg-ink hover:text-bg",
        className,
      )}
    >
      <Icon name={added ? "check" : "plus"} className="size-3" />
      {added ? "Added" : "Add"}
    </button>
  );
}

function Price({ s, className }: { s: BagSuggestion; className?: string }) {
  const save = s.mrp > s.price;
  return (
    <span className={cn("tabular-nums", className)}>
      <span className="font-medium text-ink">{formatINR(s.price)}</span>
      {save && (
        <span className="ml-1.5 text-[11px] text-ink-3 line-through">
          {formatINR(s.mrp)}
        </span>
      )}
    </span>
  );
}

/** the Discovery Set: all three flacons in a 4:5 well, the offer, one button */
function FeaturedCard({
  s,
  phase,
  onAdd,
  emptyBag,
}: {
  s: BagSuggestion;
  phase?: Phase;
  onAdd: () => void;
  /** nothing in the bag yet: invite them to sample, not to "complete" */
  emptyBag: boolean;
}) {
  return (
    <article className="mb-3 flex items-stretch gap-4 rounded-[4px] border border-line-2 bg-surface-2 p-3.5">
      <div className="relative aspect-[4/5] w-[72px] shrink-0 self-center overflow-hidden rounded-[3px] border border-line bg-surface">
        {s.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-end justify-center gap-[2px] px-1.5 pb-2.5">
            {(["aurevan", "orvelis", "vayren"] as const).map((slug) => (
              <span key={slug} className="block w-[30%]">
                <Flacon fragrance={slug} />
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[12px] leading-snug text-ink-2">
          {emptyBag ? "Sample all three in the" : "Complete your ritual with the"}{" "}
          <span className="font-medium text-ink">{s.meta} Discovery Set</span>
        </p>
        <p className="mt-1 text-[11px] leading-snug text-ink-3">
          All three extraits, in travel size.
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <Price s={s} className="text-[14px]" />
          <AddButton phase={phase} onAdd={onAdd} label={s.name} />
        </div>
      </div>
    </article>
  );
}

/** one of the three extraits, as a thin row */
function RangeRow({
  s,
  phase,
  onAdd,
}: {
  s: BagSuggestion;
  phase?: Phase;
  onAdd: () => void;
}) {
  return (
    <article className="flex items-center gap-4 border-b border-line/70 py-3.5 last:border-b-0">
      {/* the product page's packshot, whole and untransformed (sharp), on its own studio grey */}
      <div className="relative aspect-[7/8] w-[60px] shrink-0 overflow-hidden rounded-[3px] border border-line-2 bg-[#ebeae6]">
        {s.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.image}
            alt={`${s.name} extrait`}
            loading="lazy"
            decoding="async"
            className="absolute -top-[9%] -left-[9%] h-[118%] w-[118%] max-w-none object-cover object-[50%_54%]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            {s.fragrance ? (
              <span className="block w-[46%]">
                <Flacon fragrance={s.fragrance} />
              </span>
            ) : null}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium tracking-[0.1em] text-ink uppercase">
          {s.name}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-3">{s.meta}</p>
        <Price s={s} className="mt-1.5 block text-[12.5px]" />
      </div>
      <AddButton phase={phase} onAdd={onAdd} label={s.name} />
    </article>
  );
}
