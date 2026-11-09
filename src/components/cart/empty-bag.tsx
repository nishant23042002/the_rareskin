import Link from "next/link";
import type { CSSProperties } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const TRI_JUICE =
  "linear-gradient(90deg, #e0d7bf 0%, #c5872f 52%, #3d2712 100%)";

/**
 * The bag with nothing in it: a bag outline, a plain sentence, and (rendered
 * right below it by the bag view) one-tap add buttons for the whole range.
 * The link goes to the collection on the homepage.
 */
export function EmptyBag({
  onNavigate,
  className,
  style,
}: {
  /** closes the drawer; called when the link is followed */
  onNavigate: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center px-8 pt-12 pb-9 text-center",
        className,
      )}
      style={style}
    >
      <span className="relative mb-6 grid size-[68px] place-items-center rounded-full border border-line-2">
        <Icon
          name="bag"
          strokeWidth={1.1}
          className="size-[30px] text-ink-2"
        />
        <span
          aria-hidden
          className="absolute inset-x-5 -bottom-px h-[2px]"
          style={{ backgroundImage: TRI_JUICE }}
        />
      </span>

      <h3 className="serif-italic text-[1.7rem] leading-tight text-ink">
        Your shopping bag is empty
      </h3>
      <p className="mx-auto mt-3 max-w-[32ch] text-[13px] leading-relaxed text-ink-2">
        Discover our signature extrait de parfum collection or sample them all.
      </p>

      <Link
        href="/#collection"
        onClick={onNavigate}
        className="group mt-5 inline-flex items-center gap-2 px-2 py-2 text-[10.5px] tracking-[0.16em] text-ink-3 uppercase transition-colors hover:text-ink"
      >
        Explore the collection
        <Icon
          name="arrowRight"
          className="size-3 transition-transform duration-300 group-hover:translate-x-1"
        />
      </Link>
    </div>
  );
}
