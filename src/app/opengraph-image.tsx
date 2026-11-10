import { ImageResponse } from "next/og";

import { SITE } from "@/lib/site";
import { brandDataUrl } from "@/server/brand";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The social-share card: the real wordmark (`public/brand/rareskin-wordmark.png`,
 *  1487 × 331) over the tagline, on the site's warm paper. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 84,
          background:
            "linear-gradient(150deg, #f4f1ea 0%, #ece9e1 55%, #e2ded3 100%)",
          color: "#232120",
        }}
      >
        <div style={{ display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brandDataUrl("rareskin-wordmark.png")} width={400} height={89} alt={SITE.name} />
        </div>

        <div style={{ display: "flex", fontSize: 82, lineHeight: 1.05, maxWidth: 900 }}>
          {SITE.tagline}
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#6b6963" }}>
          Three Extrait de Parfum &nbsp;·&nbsp; Different by design
        </div>
      </div>
    ),
    size,
  );
}
