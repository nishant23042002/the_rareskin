"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useCart } from "@/components/providers/cart-provider";
import { Icon } from "@/components/ui/icon";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isThemeId,
  type ThemeId,
} from "@/config/themes";
import { cn } from "@/lib/cn";

/**
 * Theme preview dock (bottom-right, above the back-to-top button): a small pill
 * that opens a frosted panel listing the six themes, each with its six-colour
 * palette, name and archetype, and a "Reset to Original". Choosing one sets
 * `data-theme` on <html> at once (the tokens in `app/themes.css` re-point, nothing
 * re-renders) and remembers it in `localStorage` (`rareskin_theme_preview`); the
 * inline script in `app/layout.tsx` re-applies it before first paint on the next
 * visit. The dock itself is painted from the active theme's own tokens.
 */

// ── the one piece of state: the attribute on <html> ──────────────────────────
const listeners = new Set<() => void>();

function readTheme(): ThemeId {
  const t = document.documentElement.getAttribute("data-theme");
  return isThemeId(t) ? t : DEFAULT_THEME;
}

function applyTheme(id: ThemeId, remember = true): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", id);
  if (remember) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* private mode: the choice just lasts until reload */
    }
  }
  // the browser chrome (mobile address bar) follows the canvas
  const def = THEMES.find((t) => t.id === id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (def && meta) meta.setAttribute("content", def.canvas);
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function PaletteGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.9 2-1.9 0-1.5-1.2-1.6-1.2-2.8 0-.9.7-1.5 1.7-1.5h2.2a3.3 3.3 0 0 0 3.3-3.3C20 7 16.5 3.5 12 3.5Z" />
      <circle cx="7.6" cy="11.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.2" cy="7.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="7.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThemeSwitcher() {
  const current = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const [receding, setReceding] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { count, isOpen: bagOpen } = useCart();

  // sit one button-height above back-to-top, which rides above the bag bar when
  // there is something in the bag
  const lifted = count > 0 && !bagOpen;

  // reconcile with the stored choice once mounted (the boot script normally did
  // this already, before paint), and hand the page back to the default if the
  // storefront unmounts (the admin has its own theme)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeId(saved) && saved !== readTheme()) applyTheme(saved, false);
    } catch {
      /* no storage: stay on whatever is set */
    }
    return () => document.documentElement.removeAttribute("data-theme");
  }, []);

  // close on Escape (focus returns to the pill) and on a tap outside
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      pillRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // stay out of the way while the page is being scrolled: the pill recedes, and
  // comes back a moment after the scrolling stops
  useEffect(() => {
    let t = 0;
    const onScroll = () => {
      setReceding(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setReceding(false), 420);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(t);
    };
  }, []);

  const active = THEMES.find((t) => t.id === current) ?? THEMES[0];

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed right-[max(16px,env(safe-area-inset-right))] z-[99] flex flex-col items-end gap-2.5 transition-[bottom] duration-300",
        lifted
          ? "bottom-[calc(142px+env(safe-area-inset-bottom))]"
          : "bottom-[calc(74px+env(safe-area-inset-bottom))]",
      )}
    >
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Colour theme preview"
          className="theme-dock-in w-[min(344px,calc(100vw-32px))] rounded-[14px] border border-line bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] p-3 text-ink shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          <div className="flex items-center justify-between px-1 pb-2.5">
            <span className="text-[10px] font-medium tracking-[0.22em] text-ink-3 uppercase">
              Theme preview
            </span>
            <button
              type="button"
              aria-label="Close theme preview"
              onClick={() => {
                setOpen(false);
                pillRef.current?.focus();
              }}
              className="-mr-1 grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>

          <div role="radiogroup" aria-label="Colour theme" className="grid gap-1">
            {THEMES.map((t) => {
              const on = t.id === current;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => applyTheme(t.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] border px-2.5 py-2 text-left transition-colors",
                    on
                      ? "border-ink bg-surface-2"
                      : "border-transparent hover:bg-ink/[0.06]",
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-[88px] shrink-0 overflow-hidden rounded-full ring-1 ring-black/10"
                  >
                    {t.swatch.map((hex) => (
                      <i
                        key={hex}
                        className="block h-full flex-1"
                        style={{ background: hex }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-tight font-medium text-ink">
                      {t.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] leading-tight text-ink-3">
                      {t.archetype}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-[18px] shrink-0 place-items-center rounded-full border",
                      on
                        ? "border-ink bg-ink text-w0"
                        : "border-line-2 text-transparent",
                    )}
                  >
                    <Icon name="check" className="size-2.5" strokeWidth={2.2} />
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => applyTheme(DEFAULT_THEME)}
            disabled={current === DEFAULT_THEME}
            className="mt-2.5 w-full rounded-full border border-line-2 py-2.5 text-[10.5px] font-medium tracking-[0.18em] text-ink uppercase transition-colors hover:bg-ink hover:text-w0 disabled:pointer-events-none disabled:opacity-40"
          >
            Reset to Original
          </button>
        </div>
      )}

      <button
        ref={pillRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Colour theme: ${active.name}. Open the theme preview`}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border border-line bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] pr-3.5 pl-3 text-ink shadow-[0_10px_28px_-16px_rgba(0,0,0,0.5)] backdrop-blur-md transition-[opacity,transform,background-color] duration-300 hover:bg-surface",
          receding && !open && "translate-y-1 opacity-25",
        )}
      >
        <PaletteGlyph className="size-[18px]" />
        <span className="hidden text-[10.5px] font-medium tracking-[0.16em] uppercase sm:inline">
          {active.name}
        </span>
        <span
          aria-hidden
          className="size-2.5 rounded-full ring-2 ring-surface"
          style={{ background: active.accent }}
        />
      </button>
    </div>
  );
}
