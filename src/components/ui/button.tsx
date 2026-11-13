import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

type Variant =
  | "solid"
  | "solidLight"
  | "ghost"
  | "onLight"
  | "onDark"
  | "onCard";
type Size = "lg" | "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-[2px] border text-[11px] uppercase tracking-[0.14em] " +
  "transition-[transform,translate,scale,background-color,border-color,color,opacity] duration-150 ease-[var(--ease-brand)] " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 " +
  // a mouse gets a small lift on hover (the press above is for every pointer); nothing under reduced motion
  "[@media(hover:hover)_and_(pointer:fine)_and_(prefers-reduced-motion:no-preference)]:hover:-translate-y-0.5";

const sizes: Record<Size, string> = {
  lg: "px-8 py-[18px] text-[12px] tracking-[0.16em]",
  md: "px-[26px] py-[15px]",
  sm: "px-[18px] py-3 text-[10px]",
};

const variants: Record<Variant, string> = {
  // `cta-hover` is `#000` in the storefront's light theme (identical to the old
  // `hover:bg-black`) and flips with the admin's scoped dark theme.
  solid: "border-cta bg-cta text-w0 hover:bg-cta-hover",
  // the light card colour — a primary CTA sitting on a dark ground (never raw white: --color-w0 is the theme's paper)
  solidLight: "border-w0 bg-w0 text-cta hover:bg-w1 hover:border-w1",
  // tint the fill on hover instead of swapping colours — never hides the label
  ghost:
    "border-current bg-transparent text-current opacity-80 hover:bg-current/10 hover:opacity-100",
  onLight:
    "border-w0/60 bg-transparent text-w0 hover:border-w0 hover:bg-w0 hover:text-ink",
  onDark:
    "border-ink/40 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-w0",
  // primary CTA sitting on a per-fragrance card — solid in the fragrance's own
  // ink, inverts on hover. Both states are explicit (no currentColor swap that
  // would collapse fill and text to the same colour).
  onCard:
    "border-[var(--txt)] bg-[var(--txt)] text-[var(--txt-inv)] hover:bg-[var(--txt-inv)] hover:text-[var(--txt)]",
};

type StyleProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /**
   * Opt in to a busy state by passing `loading` (true or false). While true the
   * button is disabled (no double submit), reports `aria-busy`, and its label slides
   * out for a spinner + `loadingLabel`. Both labels share one grid cell, so the button
   * keeps the width of the longer one and nothing around it moves. Buttons that never
   * pass `loading` render exactly as before.
   */
  loading?: boolean;
  /** the sentence shown beside the spinner while `loading` ("Sending code…") */
  loadingLabel?: ReactNode;
};

type ButtonProps = StyleProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & { href?: never };

type LinkProps = StyleProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children"> & { href: string };

export function Button({
  variant = "solid",
  size = "md",
  className,
  children,
  loading,
  loadingLabel,
  ...rest
}: ButtonProps | LinkProps) {
  const classes = cn(base, sizes[size], variants[variant], className);

  if (typeof (rest as { href?: unknown }).href === "string") {
    return (
      <Link className={classes} {...(rest as ComponentPropsWithoutRef<typeof Link>)}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as ComponentPropsWithoutRef<"button">;
  // a button that never mentions `loading` keeps its plain children
  if (loading === undefined && loadingLabel === undefined) {
    return (
      <button className={classes} {...buttonProps}>
        {children}
      </button>
    );
  }

  return (
    <button
      className={classes}
      {...buttonProps}
      disabled={buttonProps.disabled || loading}
      aria-busy={loading || undefined}
      data-busy={loading ? "" : undefined}
    >
      <span className="rh-lb" data-loading={loading ? "" : undefined}>
        <span className="rh-lb__idle" aria-hidden={loading || undefined}>
          {children}
        </span>
        <span className="rh-lb__busy" aria-hidden={!loading}>
          <Spinner />
          {loadingLabel}
        </span>
      </span>
    </button>
  );
}
