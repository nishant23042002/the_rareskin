import { create } from "qrcode";

/**
 * QR codes for official documents.
 *
 * Deliberately NOT `server-only`: `scripts/certificate-qr.ts` bakes the code
 * for a given number into the printable certificate templates (kept locally, not in git).
 * The output is a single `<path>` of unit squares (crisp at any print size, no
 * anti-aliasing seams), the same shape the kit's templates embed.
 */
export interface QrPath {
  /** modules per side (a 55-character URL at level M is version 4 = 33) */
  size: number;
  /** SVG path data in module units — draw it inside `viewBox="0 0 size size"` */
  d: string;
}

export function qrPath(
  text: string,
  level: "L" | "M" | "Q" | "H" = "M",
): QrPath {
  const { size, data } = create(text, { errorCorrectionLevel: level }).modules;
  let d = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < size && data[y * size + x + run]) run++;
      d += `M${x},${y}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return { size, d };
}

/** A standalone SVG string (for download / print). `margin` is the quiet zone in modules. */
export function qrSvg(
  text: string,
  opts: { color?: string; background?: string | null; margin?: number } = {},
): string {
  const { color = "#000000", background = "#ffffff", margin = 4 } = opts;
  const { size, d } = qrPath(text);
  const box = size + margin * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" shape-rendering="crispEdges">` +
    (background ? `<rect width="${box}" height="${box}" fill="${background}"/>` : "") +
    `<path transform="translate(${margin} ${margin})" fill="${color}" d="${d}"/></svg>`
  );
}
