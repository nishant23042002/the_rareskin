import "server-only";

import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

import { registerInvoiceFonts } from "@/server/invoice/fonts";

/**
 * Faces for the certificate PDF: Cormorant Garamond (display — the same serif the
 * printable templates use) + Jost (body, registered with the invoice's faces).
 * The `.woff` files live in `public/fonts/` (from `@fontsource/cormorant-garamond`,
 * OFL licence) and are bundled into the route by `outputFileTracingIncludes` in
 * `next.config.ts`.
 *
 * Unlike the invoice, a missing face THROWS: a certificate silently set in
 * Helvetica is a wrong certificate, so the route answers 500 instead.
 */

let done = false;

const file = (name: string) => path.join(process.cwd(), "public", "fonts", name);

const FILES = [
  "cormorant-500.woff",
  "cormorant-600.woff",
  "cormorant-400-italic.woff",
  "cormorant-500-italic.woff",
];

export function registerCertificateFonts(): void {
  registerInvoiceFonts(); // Jost + "never hyphenate"
  if (done) return;

  for (const f of FILES) {
    if (!fs.existsSync(file(f))) throw new Error(`missing font file: public/fonts/${f}`);
  }
  Font.register({
    family: "Cormorant",
    fonts: [
      { src: file("cormorant-500.woff"), fontWeight: 500 },
      { src: file("cormorant-600.woff"), fontWeight: 600 },
      { src: file("cormorant-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: file("cormorant-500-italic.woff"), fontWeight: 500, fontStyle: "italic" },
    ],
  });
  done = true;
}
