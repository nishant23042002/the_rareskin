import { ImageResponse } from "next/og";

import { brandDataUrl } from "@/server/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — the same "R", a little more inset for the rounded mask. */
export default function AppleIcon() {
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
        <img src={brandDataUrl("mark-r-cream.png")} width={71} height={90} alt="" />
      </div>
    ),
    size,
  );
}
