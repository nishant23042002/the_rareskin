/**
 * The colour themes the founder can preview live (`ThemeSwitcher`, the dock at the
 * bottom-right of the storefront). The tokens themselves live in `app/themes.css`
 * under `:root[data-theme="<id>"]`; this file is only the list: names, the luxury
 * archetype, the six palette hexes shown as swatches in the dock (the source
 * palettes, exactly), and the page colour for the browser's `theme-color`.
 * `default` is the original look and has no rules of its own.
 */
export interface ThemeDef {
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
    id: "azure",
    name: "Azure",
    archetype: "Glacial & Royal Navy",
    swatch: ["#0B1D3A", "#1E3A8A", "#3B82B8", "#93C5FD", "#DBEAFE", "#F8FAFC"],
    accent: "#3B82B8",
    canvas: "#F8FAFC",
  },
  {
    id: "celestial",
    name: "Celestial",
    archetype: "Midnight Indigo & Amber",
    swatch: ["#0B132B", "#1C2541", "#3A506B", "#5BC0DE", "#F4D6B0", "#D97706"],
    accent: "#D97706",
    canvas: "#FAF7F2",
  },
  {
    id: "amethyst",
    name: "Amethyst",
    archetype: "Royal Violet & Lilac Fog",
    swatch: ["#0B0720", "#25134D", "#6A2FC8", "#9D71E8", "#D1B8FF", "#F2E9FF"],
    accent: "#9D71E8",
    canvas: "#FAF8FD",
  },
  {
    id: "titanium",
    name: "Titanium",
    archetype: "Slate & Cool Platinum",
    swatch: ["#0F172A", "#334155", "#64748B", "#94A3B8", "#E2E8F0", "#F8FAFC"],
    accent: "#94A3B8",
    canvas: "#F8FAFC",
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
 * keeps its own theme.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var ok=${JSON.stringify(
  THEMES.filter((x) => x.id !== DEFAULT_THEME).map((x) => x.id),
)};if(t&&ok.indexOf(t)>-1&&location.pathname.indexOf("/admin")!==0){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
