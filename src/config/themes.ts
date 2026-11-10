/**
 * The colour themes the founder can preview live (`ThemeSwitcher`, the dock at the
 * bottom-right of the storefront). The tokens themselves live in `app/themes.css`
 * under `:root[data-theme="<id>"]`; this file is only the list: names, the luxury
 * archetype, the six palette hexes shown as swatches in the dock (the source
 * palettes, exactly), and the page colour for the browser's `theme-color`.
 * `default` is the original look and has no rules of its own.
 */
interface ThemeDef {
  id: string;
  name: string;
  archetype: string;
  /** the six palette colours, dark to light as in the source palettes */
  swatch: readonly [string, string, string, string, string, string];
  /** the accent role (the dot on the collapsed dock) */
  accent: string;
  /** the canvas, for `<meta name="theme-color">` */
  canvas: string;
}

export const THEMES = [
  {
    id: "default",
    name: "Original",
    archetype: "Warm Linen & Obsidian",
    swatch: ["#100e0c", "#232120", "#6b6963", "#c5a880", "#d89a4d", "#f2f1ed"],
    accent: "#c5a880",
    canvas: "#f2f1ed",
  },
  {
    id: "botanical",
    name: "Botanical",
    archetype: "Forest & Linen",
    swatch: ["#0F1F17", "#1E3A2E", "#3E5A3F", "#6B7F67", "#C7CBB8", "#3D4337"],
    accent: "#6B7F67",
    canvas: "#F4F5F0",
  },
  {
    id: "verdant",
    name: "Verdant Atelier",
    archetype: "Mineral Sage, Linen & Forest Obsidian",
    swatch: ["#0F1F17", "#1E3527", "#3E453B", "#8E997C", "#C7CBB8", "#F2F4EE"],
    accent: "#8E997C",
    canvas: "#F2F4EE",
  },
] as const satisfies readonly ThemeDef[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "default";

/** where the founder's choice is remembered (this browser only) */
export const THEME_STORAGE_KEY = "rareskin_theme_preview";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/**
 * Runs in <head> before the first paint, so a stored theme is on <html> before
 * anything is drawn (no flash of the default). The storefront only: the admin
 * keeps its own theme. A stored id that is no longer in the list (a theme that
 * was retired) is never applied, so the page renders the original look, and the
 * stale entry is cleared.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var t=localStorage.getItem(k);var ok=${JSON.stringify(
  THEMES.filter((x) => x.id !== DEFAULT_THEME).map((x) => x.id),
)};if(t&&location.pathname.indexOf("/admin")!==0){if(ok.indexOf(t)>-1){document.documentElement.setAttribute("data-theme",t)}else if(t!==${JSON.stringify(
  DEFAULT_THEME,
)}){localStorage.removeItem(k)}}}catch(e){}})();`;
