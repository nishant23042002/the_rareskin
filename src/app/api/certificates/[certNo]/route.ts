import { NextResponse } from "next/server";

import { normaliseCertNo } from "@/lib/certificates";
import { checkRateOpen, requestContext } from "@/server/auth";
import { verifyCertificate } from "@/server/data/certificates";

/**
 * `GET /api/certificates/<certNo>` — public certificate verification (JSON).
 *
 * The same lookup the `/verify` page does, for anyone who wants to check a
 * certificate programmatically (an HR system, a background-check vendor).
 * Returns only what is printed on the certificate. Rate limited per IP and
 * never cached, so a revocation shows up on the next call.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  ctxArg: { params: Promise<{ certNo: string }> },
) {
  const { certNo: raw } = await ctxArg.params;
  const certNo = normaliseCertNo(decodeURIComponent(raw));
  if (!certNo) {
    return NextResponse.json(
      { ok: false, state: "invalid", message: "That is not a certificate number." },
      { status: 400, headers: NO_STORE },
    );
  }

  const { ip } = await requestContext();
  const rate = await checkRateOpen("certificate:verify:ip", ip ?? "unknown");
  if (!rate.success) {
    return NextResponse.json(
      { ok: false, state: "rate-limited" },
      {
        status: 429,
        headers: {
          ...NO_STORE,
          "Retry-After": String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000))),
        },
      },
    );
  }

  const result = await verifyCertificate(certNo);
  if (result.state === "not-found") {
    return NextResponse.json(
      { ok: false, state: "not-found", certNo },
      { status: 404, headers: NO_STORE },
    );
  }
  return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
}
