import "server-only";

import { dbConnect } from "@/server/db";
import { Certificate, type CertificateDoc } from "@/server/models";
import {
  CERT_ISSUER_TITLE,
  CERT_ORGANISATION,
  ENGAGEMENT_LABEL,
  CERT_TYPE_LABEL,
  dateLabel,
  periodLabel,
} from "@/lib/certificates";

/**
 * Public certificate verification — what the QR code on a printed certificate
 * resolves to.
 *
 * Only what is already printed on the paper is returned: name, role, engagement,
 * period, issue date, issuer. A `draft` is treated as **not found** (the number
 * is reserved but nothing has been signed), and a revoked certificate reveals
 * neither the holder nor the reason. Never cached: a revocation must take effect
 * on the next scan.
 */

export interface PublicCertificate {
  certNo: string;
  /** a `TRS-TEST-…` record used to check the verification flow — certifies nothing */
  isTest: boolean;
  documentType: string;
  holderName: string;
  role: string;
  engagement: string;
  period: string;
  summary: string;
  issuedOn: string;
  issuedBy: string;
  issuerTitle: string;
  organisation: string;
}

export type VerifyResult =
  | { state: "valid"; certificate: PublicCertificate }
  | { state: "revoked"; certNo: string; revokedOn: string | null }
  | { state: "not-found" };

export async function verifyCertificate(certNo: string): Promise<VerifyResult> {
  await dbConnect();
  const doc = await Certificate.findOne({ certNo }).lean<CertificateDoc | null>();
  if (!doc || doc.status === "draft") return { state: "not-found" };

  if (doc.status === "revoked") {
    return {
      state: "revoked",
      certNo: doc.certNo,
      revokedOn: doc.revokedAt ? dateLabel(doc.revokedAt) : null,
    };
  }

  return {
    state: "valid",
    certificate: {
      certNo: doc.certNo,
      isTest: doc.type === "TEST",
      documentType: CERT_TYPE_LABEL[doc.type],
      holderName: doc.holderName,
      role: doc.role,
      engagement: ENGAGEMENT_LABEL[doc.engagement],
      period: periodLabel(doc.startMonth, doc.endMonth),
      summary: doc.summary,
      issuedOn: dateLabel(doc.issuedOn),
      issuedBy: doc.signedBy,
      issuerTitle: CERT_ISSUER_TITLE,
      organisation: CERT_ORGANISATION,
    },
  };
}
