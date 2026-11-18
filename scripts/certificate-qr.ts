/**
 * Print the QR code for a certificate number — the same one the admin page shows.
 *
 *   pnpm certificate:qr TRS-INT-2026-001            → the URL + the SVG path data (what the
 *                                                     printable templates embed)
 *   pnpm certificate:qr TRS-INT-2026-001 --out qr.svg → a standalone SVG file
 *
 * Needs no database or env: it only encodes `https://www.therareskin.com/verify?id=<number>`.
 */
import { writeFileSync } from "node:fs";

import { certVerifyUrl, normaliseCertNo } from "@/lib/certificates";
import { qrPath, qrSvg } from "@/server/certificates/qr";

const args = process.argv.slice(2);
const certNo = normaliseCertNo(args.find((a) => !a.startsWith("--")));
if (!certNo) {
  console.error("Usage: pnpm certificate:qr TRS-INT-2026-001 [--out file.svg]");
  process.exit(1);
}

const url = certVerifyUrl(certNo);
const outIdx = args.indexOf("--out");
if (outIdx !== -1 && args[outIdx + 1]) {
  writeFileSync(args[outIdx + 1]!, qrSvg(url), "utf8");
  console.log(`${url}\nwrote ${args[outIdx + 1]}`);
} else {
  const { size, d } = qrPath(url);
  console.log(JSON.stringify({ certNo, url, size, d }));
}
