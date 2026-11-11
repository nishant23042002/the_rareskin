import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The brand's own artwork, read off disk for the surfaces that cannot use the
 * site's CSS-mask `<Logo>`: the invoice PDF, the favicon / app icons and the
 * social-share image. One artwork feeds all of them (`public/brand/`):
 *
 *   rareskin-wordmark.png   the wordmark — black on transparent, 1487 × 331
 *   mark-r-cream.png        its "R" glyph, cream on transparent (favicons)
 *   email-logo.png          the wordmark in ink on white, 648 × 144 (order emails)
 *
 * Callers that run per request (the invoice) must have these files bundled — see
 * `outputFileTracingIncludes` in next.config.ts. The icon / OG routes run at build.
 */
export function brandFile(name: string): Buffer | null {
  try {
    return readFileSync(path.join(process.cwd(), "public", "brand", name));
  } catch {
    return null;
  }
}

/** `data:` URL of a brand PNG, for `<img>` inside `ImageResponse` (satori). */
export function brandDataUrl(name: string): string {
  const file = brandFile(name);
  if (!file) throw new Error(`missing brand file: public/brand/${name}`);
  return `data:image/png;base64,${file.toString("base64")}`;
}

/** `data:` URL of any PNG / JPEG under `public/` (e.g. `/images/pdp/aurevan/item-thumb.jpg`). */
export function publicDataUrl(rel: string): string {
  const file = readFileSync(path.join(process.cwd(), "public", rel));
  const mime = /\.jpe?g$/i.test(rel) ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${file.toString("base64")}`;
}
