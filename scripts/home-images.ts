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
import { existsSync, mkdirSync, statSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// the few bits of sharp this script uses (its types are not resolvable from the repo root)
type Sharp = (input: Buffer | string) => {
  metadata(): Promise<{ width?: number; height?: number; format?: string }>;
  webp(o: { quality: number; effort: number }): { toFile(path: string): Promise<unknown> };
};

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
const REQUIRED_IDS = [
  "hero",
  "aurevan-product",
  "vayren-product",
  "orvelis-product",
  // the pedestal-free card directions: public/images/prompt-manifest.json has a plate prompt for each
  ...CARD_CONCEPTS.flatMap((c) => CARD_SLUGS.map((s) => `${s}-card-${c}`)),
  "extrait-atomizer-craft",
  "atelier-story",
  "unboxing-experience",
  "discovery-set-10ml",
  "scent-on-skin",
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
  errors += checkPrompts(m);
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
  else {
    console.log("usage: pnpm home:images check | placeholders [--force] | table");
    process.exit(cmd ? 1 : 0);
  }
})();

// dirname is imported for older tsx versions that need an explicit CJS marker
void dirname;
