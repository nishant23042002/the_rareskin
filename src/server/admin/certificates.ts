import "server-only";

import { dbConnect } from "@/server/db";
import { Certificate, type CertificateDoc } from "@/server/models";
import { dateLabel, periodLabel } from "@/lib/certificates";

/** Certificate reads for the admin. Not cached — staff always see the live record. */

export interface AdminCertificateRow {
  certNo: string;
  type: CertificateDoc["type"];
  holderName: string;
  role: string;
  engagement: CertificateDoc["engagement"];
  startMonth: string;
  endMonth: string;
  period: string;
  summary: string;
  signedBy: string;
  status: CertificateDoc["status"];
  /** `YYYY-MM-DD`, or null while draft */
  issuedOn: string | null;
  issuedOnLabel: string;
  revokedReason: string | null;
  revokedOnLabel: string | null;
  createdAt: string;
}

function toRow(c: CertificateDoc): AdminCertificateRow {
  return {
    certNo: c.certNo,
    type: c.type,
    holderName: c.holderName,
    role: c.role,
    engagement: c.engagement,
    startMonth: c.startMonth,
    endMonth: c.endMonth,
    period: periodLabel(c.startMonth, c.endMonth),
    summary: c.summary,
    signedBy: c.signedBy,
    status: c.status,
    issuedOn: c.issuedOn ? c.issuedOn.toISOString().slice(0, 10) : null,
    issuedOnLabel: dateLabel(c.issuedOn),
    revokedReason: c.revokedReason,
    revokedOnLabel: c.revokedAt ? dateLabel(c.revokedAt) : null,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function listCertificates(): Promise<AdminCertificateRow[]> {
  await dbConnect();
  const docs = await Certificate.find()
    .sort({ createdAt: -1 })
    .lean<CertificateDoc[]>();
  return docs.map(toRow);
}

export async function getCertificateForAdmin(
  certNo: string,
): Promise<AdminCertificateRow | null> {
  await dbConnect();
  const doc = await Certificate.findOne({ certNo }).lean<CertificateDoc | null>();
  return doc ? toRow(doc) : null;
}
