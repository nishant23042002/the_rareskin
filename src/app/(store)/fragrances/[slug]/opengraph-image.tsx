import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { itemThumbPath } from "@/lib/item-thumb";
import { brandDataUrl, publicDataUrl } from "@/server/brand";
import { getFragranceBySlug, getFragranceSlugs } from "@/server/data/catalog";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "THE RARESKIN Extrait de Parfum";
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getFragranceSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * The share card of a product page (WhatsApp, Instagram, iMessage, search): the
 * real wordmark and the real product photograph on the fragrance's own ground.
 *
 * This route is re-rendered daily on the server, so the picture files must ship
 * with it: `outputFileTracingIncludes` in next.config.ts bundles
 * `public/brand/rareskin-wordmark*.png` and the item thumbnails. The photo is the
 * square item thumbnail (`@/lib/item-thumb`), shown at its natural size so it stays
 * sharp.
 */

/** true when `#rrggbb` is a light colour (so the ground is dark → use the cream wordmark) */
function isLight(hex: string): boolean {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = await getFragranceBySlug(slug);
  if (!f) notFound();

  const wordmark = brandDataUrl(
    isLight(f.onGround) ? "rareskin-wordmark-cream.png" : "rareskin-wordmark.png",
  );
  const thumb = itemThumbPath(f.slug);
  const photo = thumb ? publicDataUrl(thumb) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 84px",
          background: f.ground,
          color: f.onGround,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: 462,
            maxWidth: photo ? 560 : 900,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmark} width={260} height={58} alt="THE RARESKIN" />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 88, letterSpacing: 5, lineHeight: 1 }}>
              {f.name}
            </div>
            <div style={{ display: "flex", fontSize: 30, marginTop: 20, opacity: 0.82 }}>
              {f.title}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 22, opacity: 0.72 }}>
            Extrait de Parfum &nbsp;·&nbsp; {f.mood.join("  ·  ")}
          </div>
        </div>

        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            width={462}
            height={462}
            alt={f.name}
            style={{ borderRadius: 6, boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }}
          />
        ) : null}
      </div>
    ),
    size,
  );
}
