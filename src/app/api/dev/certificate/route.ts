import { NextResponse } from "next/server";

import { certVerifyUrl } from "@/lib/certificates";
import { brandFile } from "@/server/brand";
import { isProduction } from "@/server/env";
import type { CertificatePdfData } from "@/server/certificates/document";
import { renderCertificatePdf } from "@/server/certificates/render";

/**
 * Local certificate-layout preview — renders SAMPLE data inline (no database, no auth) so the
 * PDF can be eyeballed in a browser after a layout change. 404 in production. The real
 * download is `/api/admin/certificates/<number>/pdf`.
 *
 *   /api/dev/certificate                 → a draft (blank date line)
 *   /api/dev/certificate?case=valid      → with the issue date typeset
 *   /api/dev/certificate?case=long       → a very long name and role
 *   /api/dev/certificate?case=test       → the TEST certificate
 */
export const dynamic = "force-dynamic";

const SAMPLE: CertificatePdfData = {
  certNo: "TRS-INT-2026-001",
  type: "INT",
  holderName: "Sample Holder",
  role: "Full Stack Developer Intern",
  engagement: "internship",
  startMonth: "2026-08",
  endMonth: "2026-11",
  summary:
    "The internship covered the end-to-end build of the brand’s official e-commerce platform, www.therareskin.com — a Next.js and React storefront, Node.js API routes, a MongoDB database, secure sign-in, Razorpay payments, an order-management admin studio, and deployment on Vercel.",
  signedBy: "Vijay Raju More",
  issuedOn: null,
  gstin: "27AAAAA0000A1Z5",
  verifyUrl: "",
  logo: null,
};

export async function GET(request: Request) {
  if (isProduction()) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const which = new URL(request.url).searchParams.get("case");
  const over: Partial<CertificatePdfData> =
    which === "valid"
      ? { issuedOn: new Date("2026-11-20T00:00:00Z") }
      : which === "long"
        ? {
            holderName: "Priyadarshini Venkataraghavan Iyer",
            role: "Senior Full Stack Developer Intern (Payments)",
            issuedOn: new Date("2026-11-20T00:00:00Z"),
          }
        : which === "test"
          ? {
              certNo: "TRS-TEST-2026-001",
              type: "TEST",
              holderName: "Test Holder",
              role: "Verification Test",
              startMonth: "2026-11",
              endMonth: "2026-11",
              summary: "",
              signedBy: "Test Signatory",
            }
          : {};

  const data = { ...SAMPLE, ...over, logo: brandFile("rareskin-wordmark-cream.png") };
  data.verifyUrl = certVerifyUrl(data.certNo);

  const pdf = await renderCertificatePdf(data);
  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${data.certNo}-preview.pdf"`,
      "cache-control": "no-store",
    },
  });
}
