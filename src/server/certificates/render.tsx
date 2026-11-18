import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { certVerifyUrl } from "@/lib/certificates";
import { brandFile } from "@/server/brand";
import { getSiteSettings } from "@/server/data/settings";
import { dbConnect } from "@/server/db";
import { Certificate, type CertificateDoc } from "@/server/models";
import { CertificateDocument, type CertificatePdfData } from "./document";
import { registerCertificateFonts } from "./fonts";

/** Render one certificate to a standalone PDF `ArrayBuffer`. */
export async function renderCertificatePdf(
  data: CertificatePdfData,
): Promise<ArrayBuffer> {
  registerCertificateFonts();
  const buf = await renderToBuffer(<CertificateDocument data={data} />);
  const out = new ArrayBuffer(buf.byteLength);
  new Uint8Array(out).set(buf);
  return out;
}

export type CertificatePdfLoad =
  | { ok: true; data: CertificatePdfData }
  | { ok: false; error: "not-found" | "revoked" | "unsupported" };

/**
 * The record → what the PDF prints. A revoked certificate is never rendered (a copy of
 * a withdrawn certificate must not be produced); an `HR` letter is a letter on the
 * letterhead, not a certificate.
 */
export async function loadCertificatePdfData(
  certNo: string,
): Promise<CertificatePdfLoad> {
  await dbConnect();
  const doc = await Certificate.findOne({ certNo }).lean<CertificateDoc | null>();
  if (!doc) return { ok: false, error: "not-found" };
  if (doc.status === "revoked") return { ok: false, error: "revoked" };
  if (doc.type === "HR") return { ok: false, error: "unsupported" };

  const settings = await getSiteSettings();
  return {
    ok: true,
    data: {
      certNo: doc.certNo,
      type: doc.type,
      holderName: doc.holderName,
      role: doc.role,
      engagement: doc.engagement,
      startMonth: doc.startMonth,
      endMonth: doc.endMonth,
      summary: doc.summary,
      signedBy: doc.signedBy,
      issuedOn: doc.issuedOn,
      gstin: settings.gst?.gstin?.trim() || null,
      verifyUrl: certVerifyUrl(doc.certNo),
      logo: brandFile("rareskin-wordmark-cream.png"),
    },
  };
}
