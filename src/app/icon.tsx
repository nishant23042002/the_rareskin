import { ImageResponse } from "next/og";

import { brandDataUrl } from "@/server/brand";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Favicon / app icon — the brand's own "A" (cut from the wordmark artwork,
 *  `public/brand/mark-r-cream.png`, 141 × 178) in cream on ink. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#100e0c",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandDataUrl("mark-r-cream.png")} width={214} height={270} alt="" />
      </div>
    ),
    size,
  );
}
