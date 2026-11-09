/**
 * Homepage image pipeline helper — reads public/images/assets-manifest.json.
 *
 *   pnpm home:images check            # every file exists, right pixel size and aspect, sensible weight
 *   pnpm home:images placeholders     # write the tonal WebP placeholders that are missing
 *   pnpm home:images placeholders --force   # rewrite all placeholder-status files
 *   pnpm home:images table            # asset → component → file → ratio summary
 *
 * Placeholders are smooth two-tone plates (no text, no fake photography) at the
 * exact target pixel size, so the layout, aspect ratio and srcset are identical
 * to the final photograph. The real images are produced with the route in
 * ASSET_PROMPT_SHEET.md and dropped in at the same path.
 *
 * `sharp` is a dependency of `next` (not a direct one), so it is resolved from
 * next's own location rather than added to package.json.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// the few bits of sharp this script uses (its types are not resolvable from the repo root)
type SharpImg = {
  metadata(): Promise<{ width?: number; height?: number; format?: string }>;
  webp(o: { quality: number; effort: number }): { toFile(path: string): Promise<unknown> };
  resize(w: number, h: number): SharpImg;
  extract(r: { left: number; top: number; width: number; height: number }): SharpImg;
  removeAlpha(): SharpImg;
  raw(): SharpImg;
  toBuffer(): Promise<Buffer>;
};
type Sharp = (input: Buffer | string) => SharpImg;

interface Variant {
  key: string;
  file: string;
  width: number;
  height: number;
  aspect: string;
  media?: string;
}
interface Asset {
  id: string;
  concept?: string;
  section: string;
  component: string;
  status: "placeholder" | "final";
  route: string;
  variants: Variant[];
  placeholderTone: [string, string];
}

const ROOT = resolve(__dirname, "..");
const MANIFEST = join(ROOT, "public", "images", "assets-manifest.json");
const OUT = join(ROOT, "public", "images", "homepage");

function loadSharp(): Sharp {
  const req = createRequire(require.resolve("next/package.json", { paths: [ROOT] }));
  return req("sharp") as Sharp;
}

function readManifest(): { basePath: string; assets: Asset[] } {
  return JSON.parse(readFileSync(MANIFEST, "utf8"));
}

const CARD_SLUGS = ["aurevan", "orvelis", "vayren"];
const CARD_CONCEPTS = ["grounded_stone", "chiaroscuro_studio", "mineral_bed", "liquid_caustics"];
// the reference-benchmark hero variants (src/config/hero.config.ts, public/images/hero-manifest.json → referenceVariants)
const HERO_VARIANTS = ["variant_1_uncapping", "variant_2_spraying", "variant_3_cylinders", "variant_4_geometric_risers"];
const REQUIRED_IDS = [
  "hero",
  "aurevan-product",
  "vayren-product",
  "orvelis-product",
  // the pedestal-free card directions: public/images/prompt-manifest.json has a plate prompt for each
  ...CARD_CONCEPTS.flatMap((c) => CARD_SLUGS.map((s) => `${s}-card-${c}`)),
  // the pedestal-free hero directions (public/images/hero-manifest.json has their plate prompts)
  ...CARD_CONCEPTS.map((c) => `hero-${c}`),
  ...HERO_VARIANTS.map((v) => `hero-${v}`),
  "extrait-atomizer-craft",
  "unboxing-experience",
  "discovery-set-10ml",
];

function ratio(a: string): number {
  const [w, h] = a.split(":").map(Number);
  return w / h;
}

/** a calm two-tone diagonal plate with a soft vignette, as SVG → WebP */
function plateSvg(w: number, h: number, [c1, c2]: [string, string]): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>` +
      `<radialGradient id="v" cx="50%" cy="42%" r="75%"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></radialGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#v)"/></svg>`,
  );
}

async function placeholders(force: boolean) {
  const sharp = loadSharp();
  mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const a of readManifest().assets) {
    if (a.status !== "placeholder") continue;
    for (const v of a.variants) {
      const file = join(OUT, v.file);
      if (existsSync(file) && !force) continue;
      mkdirSync(dirname(file), { recursive: true });
      await sharp(plateSvg(v.width, v.height, a.placeholderTone)).webp({ quality: 78, effort: 5 }).toFile(file);
      n++;
      console.log("wrote", v.file, `${v.width}x${v.height}`, `${(statSync(file).size / 1024).toFixed(0)} KB`);
    }
  }
  console.log(n ? `${n} placeholder file(s) written to public/images/homepage` : "nothing to write (all placeholders exist)");
}

async function check(): Promise<number> {
  const sharp = loadSharp();
  const m = readManifest();
  let errors = 0;
  const err = (s: string) => {
    errors++;
    console.error("ERROR", s);
  };
  for (const id of REQUIRED_IDS) if (!m.assets.some((a) => a.id === id)) err(`manifest is missing asset "${id}"`);
  const files = new Set<string>();
  for (const a of m.assets) {
    if (!a.variants.length) err(`${a.id}: no variants`);
    for (const v of a.variants) {
      if (files.has(v.file)) err(`${a.id}: file name ${v.file} is used twice`);
      files.add(v.file);
      if (!v.file.endsWith(".webp")) err(`${a.id}: ${v.file} is not .webp`);
      if (Math.abs(v.width / v.height - ratio(v.aspect)) > 0.005) err(`${a.id}/${v.key}: ${v.width}x${v.height} is not ${v.aspect}`);
      const p = join(OUT, v.file);
      if (!existsSync(p)) {
        err(`${a.id}/${v.key}: ${v.file} is missing (run: pnpm home:images placeholders)`);
        continue;
      }
      const meta = await sharp(p).metadata();
      if (meta.format !== "webp") err(`${v.file}: format is ${meta.format}`);
      const kb = statSync(p).size / 1024;
      if (a.status === "placeholder") {
        if (meta.width !== v.width || meta.height !== v.height) err(`${v.file}: placeholder is ${meta.width}x${meta.height}, manifest says ${v.width}x${v.height}`);
        if (kb > 120) console.warn("WARN", v.file, `placeholder is ${kb.toFixed(0)} KB`);
      } else {
        // a final photograph may be larger, but its aspect ratio must match the frame the layout reserves
        if (Math.abs((meta.width ?? 0) / (meta.height ?? 1) - ratio(v.aspect)) > 0.01) err(`${v.file}: ${meta.width}x${meta.height} is not ${v.aspect}`);
        if ((meta.width ?? 0) < v.width * 0.75) console.warn("WARN", v.file, `is ${meta.width}px wide, the manifest target is ${v.width}px`);
        if (kb > 600) console.warn("WARN", v.file, `is ${kb.toFixed(0)} KB: consider a lower WebP quality`);
      }
    }
  }
  for (const a of m.assets) {
    if (a.id.startsWith("hero-") && a.status === "final" && !(a as unknown as { panel?: unknown }).panel) err(`${a.id}: final hero without a \`panel\` (run: pnpm home:images panels)`);
  }
  errors += checkPrompts(m);
  errors += checkHeroPrompts(m);
  console.log(errors ? `${errors} error(s)` : `OK: ${m.assets.length} assets, ${files.size} files, 12 card prompts`);
  return errors ? 1 : 0;
}

/** public/images/prompt-manifest.json: 12 plate prompts (4 concepts x 3 fragrances), each tied to a manifest asset */
function checkPrompts(m: { assets: Asset[] }): number {
  let errors = 0;
  const err = (s: string) => {
    errors++;
    console.error("ERROR", s);
  };
  const path = join(ROOT, "public", "images", "prompt-manifest.json");
  if (!existsSync(path)) {
    err("public/images/prompt-manifest.json is missing");
    return errors;
  }
  const doc = JSON.parse(readFileSync(path, "utf8")) as {
    prompts: { fragrance: string; concept_id: string; aspect_ratio: string; prompt: string; midjourney: string; negative: string; asset_id: string }[];
  };
  const seen = new Set<string>();
  // the plate prompts must stay product-free: a generator that is told about a bottle or a stand draws one
  const productWords = /(bottle|flacon|perfume|pedestal|plinth|stand|stool|podium|vessel|vase|label|cake)/i;
  for (const p of doc.prompts) {
    const key = `${p.fragrance}/${p.concept_id}`;
    if (seen.has(key)) err(`prompt-manifest: ${key} is listed twice`);
    seen.add(key);
    if (p.aspect_ratio !== "4:5") err(`prompt-manifest: ${key} is ${p.aspect_ratio}, not 4:5`);
    if (!p.prompt || !p.midjourney || !p.negative) err(`prompt-manifest: ${key} lacks a prompt, midjourney or negative field`);
    if (!p.midjourney.includes("--ar 4:5")) err(`prompt-manifest: ${key} midjourney string lacks --ar 4:5`);
    const hit = productWords.exec(p.prompt);
    if (hit) err(`prompt-manifest: ${key} plate prompt mentions "${hit[0]}" (plates are product-free; put exclusions in "negative")`);
    if (!m.assets.some((a) => a.id === p.asset_id)) err(`prompt-manifest: ${key} points at "${p.asset_id}", which is not in assets-manifest.json`);
  }
  for (const c of CARD_CONCEPTS) for (const f of CARD_SLUGS) {
    const name = { aurevan: "AURÉVAN", orvelis: "ORVÉLIS", vayren: "VAYRÉN" }[f];
    if (!seen.has(`${name}/${c}`)) err(`prompt-manifest: no prompt for ${name} / ${c}`);
  }
  return errors;
}

/** public/images/hero-manifest.json: one 16:9 and one 4:5 plate prompt per direction, product-free, each tied to a manifest asset */
function checkHeroPrompts(m: { assets: Asset[] }): number {
  let errors = 0;
  const err = (s: string) => {
    errors++;
    console.error("ERROR", s);
  };
  const path = join(ROOT, "public", "images", "hero-manifest.json");
  if (!existsSync(path)) {
    err("public/images/hero-manifest.json is missing");
    return errors;
  }
  const doc = JSON.parse(readFileSync(path, "utf8")) as {
    concepts: { concept_id: string; asset_id: string; prompts: Record<string, { aspect_ratio: string; prompt: string }> }[];
    referenceVariants?: {
      variant: number;
      id: string;
      asset_id: string;
      brief?: { prompt?: string };
      aspect_ratios?: { desktop?: string; mobile?: string };
      files?: { desktop?: string; mobile?: string };
      plate?: { desktop?: { aspect_ratio: string; prompt: string } };
      allowsPlinthWords?: boolean;
    }[];
  };
  // a plate prompt that names the product (or a place where something stands) makes the generator draw it (round 1 of the Mineral bed hero drew three stone stools, the Liquid light one three men)
  const productWords = ["bottle", "flacon", "perfume", "vessel", "vase", "label", "cake", "stool", "podium", "pedestal", "plinth"];
  const bannedIn = (text: string, allowPlinth = false) =>
    productWords.filter((w) => !(allowPlinth && (w === "pedestal" || w === "plinth"))).find((w) => text.toLowerCase().includes(w));
  const seen = new Set(doc.concepts.map((c) => c.concept_id));
  for (const c of CARD_CONCEPTS) if (!seen.has(c)) err(`hero-manifest: no direction ${c}`);
  for (const c of doc.concepts) {
    if (!m.assets.some((a) => a.id === c.asset_id)) err(`hero-manifest: ${c.concept_id} points at "${c.asset_id}", which is not in assets-manifest.json`);
    for (const [k, want] of [["desktop", "16:9"], ["mobile", "4:5"]] as const) {
      const p = c.prompts[k];
      if (!p || !p.prompt) err(`hero-manifest: ${c.concept_id}/${k} has no prompt`);
      else {
        if (p.aspect_ratio !== want) err(`hero-manifest: ${c.concept_id}/${k} is ${p.aspect_ratio}, not ${want}`);
        const hit = bannedIn(p.prompt);
        if (hit) err(`hero-manifest: ${c.concept_id}/${k} plate prompt mentions "${hit}" (plates are product-free)`);
        if (/standing places?/i.test(p.prompt)) console.warn("WARN", `hero-manifest: ${c.concept_id}/${k} says "standing place(s)": the generator fills it with stools or people`);
      }
    }
  }
  // the four reference-benchmark variants: verbatim brief prompt, a product-free plate prompt, 16:9 + 4:5, files under hero/<id>/
  const variants = doc.referenceVariants ?? [];
  for (const id of HERO_VARIANTS) if (!variants.some((v) => v.id === id)) err(`hero-manifest: no reference variant ${id}`);
  for (const v of variants) {
    const a = m.assets.find((x) => x.id === v.asset_id);
    if (!a) err(`hero-manifest: variant ${v.id} points at "${v.asset_id}", which is not in assets-manifest.json`);
    else {
      for (const [k, file] of [["desktop", v.files?.desktop], ["mobile", v.files?.mobile]] as const) {
        if (!file || !a.variants.some((x) => x.key === k && x.file === file)) err(`hero-manifest: variant ${v.id}/${k} file "${file}" is not the manifest asset's ${k} file`);
      }
    }
    if (!v.brief?.prompt) err(`hero-manifest: variant ${v.id} has no brief prompt`);
    if (v.aspect_ratios?.desktop !== "16:9" || v.aspect_ratios?.mobile !== "4:5") err(`hero-manifest: variant ${v.id} aspect ratios must be 16:9 / 4:5`);
    if (!v.plate?.desktop?.prompt) err(`hero-manifest: variant ${v.id} has no plate prompt`);
    else {
      if (v.plate.desktop.aspect_ratio !== "16:9") err(`hero-manifest: variant ${v.id} plate is ${v.plate.desktop.aspect_ratio}, not 16:9`);
      const hit = bannedIn(v.plate.desktop.prompt, !!v.allowsPlinthWords);
      if (hit) err(`hero-manifest: variant ${v.id} plate prompt mentions "${hit}" (plates are product-free)`);
      if (/standing places?/i.test(v.plate.desktop.prompt)) err(`hero-manifest: variant ${v.id} plate prompt says "standing place(s)"`);
    }
  }
  return errors;
}

/**
 * `pnpm home:images panels`: sample each FINAL hero picture's own edge and write `panel` into its manifest entry
 * (the hero's text panel is tinted by it: src/components/home/hero-frame.tsx). Desktop: the picture's left edge as the
 * hero box shows it at 1440 px (box 713 x 739, `cover`, the manifest's object-position), as 6 stops of a top-to-bottom
 * gradient. Phone: the top edge of the 376 x 301 box (the panel sits above the picture there), one colour. `tone` says
 * which type colour the panel needs. The baseline `hero` is skipped: it keeps the warm stone it was designed with.
 */
async function panels() {
  const sharp = loadSharp();
  const m = JSON.parse(readFileSync(MANIFEST, "utf8")) as { assets: (Asset & { objectPosition: Record<string, string>; panel?: unknown })[] };
  const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const pos = (s: string) => s.split(/\s+/).map((t) => parseFloat(t) / 100) as [number, number];
  let n = 0;
  for (const a of m.assets) {
    if (!a.id.startsWith("hero-") || a.status !== "final") continue;
    const d = a.variants.find((v) => v.key === "desktop")!;
    const mo = a.variants.find((v) => v.key === "mobile")!;
    // desktop: the left edge of the visible window
    const [px] = pos(a.objectPosition.desktop);
    const BW = 713, BH = 739;
    const W2 = Math.round((d.width / d.height) * BH);
    const off = Math.round((W2 - BW) * px);
    const col = await sharp(join(OUT, d.file)).resize(W2, BH).extract({ left: off + 2, top: 0, width: 28, height: BH }).removeAlpha().raw().toBuffer();
    const rows: number[][] = [];
    for (let y = 0; y < BH; y++) {
      let r = 0, g = 0, b = 0;
      for (let x = 0; x < 28; x++) { const i = (y * 28 + x) * 3; r += col[i]; g += col[i + 1]; b += col[i + 2]; }
      rows.push([r / 28, g / 28, b / 28]);
    }
    const stops: string[] = [];
    for (let k = 0; k < 6; k++) {
      const c = Math.round((k / 5) * (BH - 1));
      const lo = Math.max(0, c - 40), hi = Math.min(BH - 1, c + 40);
      let r = 0, g = 0, b = 0;
      for (let y = lo; y <= hi; y++) { r += rows[y][0]; g += rows[y][1]; b += rows[y][2]; }
      const cnt = hi - lo + 1;
      stops.push(hex(r / cnt, g / cnt, b / cnt));
    }
    // phone: the top edge of the visible band
    const [, py] = pos(a.objectPosition.mobile);
    const MW = 376, MH = 301;
    const H2 = Math.round((mo.height / mo.width) * MW);
    const offY = Math.round((H2 - MH) * py);
    const top = await sharp(join(OUT, mo.file)).resize(MW, H2).extract({ left: Math.round(MW * 0.08), top: offY + 2, width: Math.round(MW * 0.84), height: 12 }).removeAlpha().raw().toBuffer();
    // the median, not the mean: a hand or a prop that touches the top edge must not tint the panel
    const px2 = top.length / 3;
    const med = (ch: number) => { const v: number[] = []; for (let i = 0; i < px2; i++) v.push(top[i * 3 + ch]); v.sort((p, q) => p - q); return v[Math.floor(v.length / 2)]; };
    const mobile = hex(med(0), med(1), med(2));
    const lum = stops.map((h) => { const v = parseInt(h.slice(1), 16); return (((v >> 16) & 255) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000; });
    const meanLum = lum.reduce((p, c) => p + c, 0) / lum.length;
    a.panel = { desktop: stops, mobile, tone: meanLum > 140 ? "light" : "dark" };
    n++;
    console.log(a.id.padEnd(34), stops.join(" "), mobile, a.panel && (a.panel as { tone: string }).tone, `lum ${meanLum.toFixed(0)}`);
  }
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
  console.log(`${n} hero panel(s) written to public/images/assets-manifest.json`);
}

function table() {
  const m = readManifest();
  console.log("id | section | component | files | ratio | status | route");
  for (const a of m.assets) {
    console.log([a.id, a.section, a.component, a.variants.map((v) => v.file).join(" + "), a.variants.map((v) => v.aspect).join(" / "), a.status, a.route].join(" | "));
  }
}

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "check") process.exit(await check());
  else if (cmd === "placeholders") await placeholders(rest.includes("--force"));
  else if (cmd === "table") table();
  else if (cmd === "panels") await panels();
  else {
    console.log("usage: pnpm home:images check | placeholders [--force] | panels | table");
    process.exit(cmd ? 1 : 0);
  }
})();

// dirname is imported for older tsx versions that need an explicit CJS marker
void dirname;
