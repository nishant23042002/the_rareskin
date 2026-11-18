import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { normaliseCertNo } from "@/lib/certificates";
import { requireAdminRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { recordAudit } from "@/server/models";
import {
  loadCertificatePdfData,
  renderCertificatePdf,
} from "@/server/certificates/render";

/**
 * `GET /api/admin/certificates/<certNo>/pdf` — the certificate as a downloadable A4 PDF,
 * drawn from the record (so the number, QR, wording and date always match what /verify
 * shows). `admin`+. Drafts download too (that is the copy the founder signs; the date line
 * is blank); a valid certificate's copy also prints the issue date. A revoked certificate
 * has no PDF. Every download is audit-logged.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctxArg: { params: Promise<{ certNo: string }> },
) {
  const ctx = await requireAdminRole("admin");
  const certNo = normaliseCertNo(decodeURIComponent((await ctxArg.params).certNo));
  if (!certNo) return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });

  const loaded = await loadCertificatePdfData(certNo);
  if (!loaded.ok) {
    return NextResponse.json(loaded, { status: loaded.error === "not-found" ? 404 : 422 });
  }

  let pdf: ArrayBuffer;
  try {
    pdf = await renderCertificatePdf(loaded.data);
  } catch (err) {
    console.error("[certificate] pdf render failed", { certNo, err });
    return NextResponse.json({ ok: false, error: "render-failed" }, { status: 500 });
  }

  const req = await requestContext();
  await recordAudit({
    actorId: new Types.ObjectId(ctx.user.id),
    actorRole: ctx.user.role,
    action: "certificate.download",
    targetType: "Certificate",
    targetId: certNo,
    ip: req.ip,
    userAgent: req.userAgent,
  });

  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${certNo}.pdf"`,
      "content-length": String(pdf.byteLength),
      "cache-control": "private, no-store",
    },
  });
}
