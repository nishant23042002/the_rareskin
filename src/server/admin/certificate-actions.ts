import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { Certificate, nextSequence, recordAudit } from "@/server/models";
import { assertSudo } from "@/server/auth/admin";
import type { AuthContext } from "@/server/auth/session";
import { formatCertNo } from "@/lib/certificates";
import type {
  CertificateEditInput,
  CertificateInput,
} from "@/lib/validation/certificate";

/**
 * Certificate mutations. Every write records an audit row. There is no delete:
 * a number is never reused or skipped, so a certificate that should not exist
 * is *revoked* (the record and the reason stay).
 *
 * The two actions that change what the public sees — `issueCertificate`
 * (draft → valid) and `revokeCertificate` — need a live `sudo` window (a phone
 * OTP re-auth), like refunds do.
 */

export type CertificateActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

interface Req {
  ip: string | null;
  userAgent: string | null;
}

export async function createCertificate(
  input: CertificateInput,
  ctx: AuthContext,
  req: Req,
): Promise<CertificateActionResult<{ certNo: string }>> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);
  const year = new Date().getUTCFullYear();

  // Atomic — two staff creating at once can never get the same number.
  const seq = await nextSequence(`certificate-${input.type}-${year}`);
  const certNo = formatCertNo(input.type, year, seq);

  const doc = await Certificate.create({
    certNo,
    type: input.type,
    year,
    seq,
    holderName: input.holderName,
    role: input.role,
    engagement: input.engagement,
    startMonth: input.startMonth,
    endMonth: input.endMonth,
    summary: input.summary,
    signedBy: input.signedBy,
    status: "draft",
    createdBy: actor,
  });

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "certificate.create",
    targetType: "Certificate",
    targetId: doc.certNo,
    after: {
      certNo: doc.certNo,
      holderName: doc.holderName,
      role: doc.role,
      engagement: doc.engagement,
      period: `${doc.startMonth}..${doc.endMonth}`,
      status: doc.status,
    },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, certNo: doc.certNo };
}

/** Edit a draft. Once a certificate is valid or revoked its details are frozen. */
export async function updateCertificateDraft(
  certNo: string,
  input: CertificateEditInput,
  ctx: AuthContext,
  req: Req,
): Promise<CertificateActionResult<{ certNo: string }>> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  const before = await Certificate.findOneAndUpdate(
    { certNo, status: "draft" },
    {
      $set: {
        holderName: input.holderName,
        role: input.role,
        engagement: input.engagement,
        startMonth: input.startMonth,
        endMonth: input.endMonth,
        summary: input.summary,
        signedBy: input.signedBy,
      },
    },
    { returnDocument: "before" },
  ).lean();

  if (!before) {
    const exists = await Certificate.exists({ certNo });
    return { ok: false, error: exists ? "not-draft" : "not-found" };
  }

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "certificate.update",
    targetType: "Certificate",
    targetId: certNo,
    before: {
      holderName: before.holderName,
      role: before.role,
      engagement: before.engagement,
      startMonth: before.startMonth,
      endMonth: before.endMonth,
      summary: before.summary,
      signedBy: before.signedBy,
    },
    after: { ...input },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, certNo };
}

/**
 * Draft → valid. Do this ONLY after the founder has signed the printed
 * certificate; `issuedOn` is the date he wrote on it. From this moment the QR
 * code on the paper confirms the certificate to anyone who scans it.
 */
export async function issueCertificate(
  certNo: string,
  issuedOn: string,
  ctx: AuthContext,
  req: Req,
): Promise<CertificateActionResult<{ certNo: string }>> {
  assertSudo(ctx);
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  // `YYYY-MM-DD` → UTC midnight, so the printed date never drifts by timezone.
  const date = new Date(`${issuedOn}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return { ok: false, error: "bad-date" };
  // the founder can't have signed it tomorrow
  if (date.getTime() > Date.now() + 36 * 3600 * 1000) {
    return { ok: false, error: "future-date" };
  }

  const res = await Certificate.findOneAndUpdate(
    { certNo, status: "draft" },
    { $set: { status: "valid", issuedOn: date, issuedBy: actor } },
    { returnDocument: "after" },
  ).lean();

  if (!res) {
    const exists = await Certificate.exists({ certNo });
    return { ok: false, error: exists ? "not-draft" : "not-found" };
  }

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "certificate.issue",
    targetType: "Certificate",
    targetId: certNo,
    before: { status: "draft" },
    after: { status: "valid", issuedOn },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, certNo };
}

/** Draft or valid → revoked. Terminal; the number stays reserved for ever. */
export async function revokeCertificate(
  certNo: string,
  reason: string,
  ctx: AuthContext,
  req: Req,
): Promise<CertificateActionResult<{ certNo: string }>> {
  assertSudo(ctx);
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  const before = await Certificate.findOneAndUpdate(
    { certNo, status: { $in: ["draft", "valid"] } },
    {
      $set: {
        status: "revoked",
        revokedReason: reason,
        revokedAt: new Date(),
      },
    },
    { returnDocument: "before" },
  )
    .select("status")
    .lean<{ status: string } | null>();

  if (!before) {
    const exists = await Certificate.exists({ certNo });
    return { ok: false, error: exists ? "already-revoked" : "not-found" };
  }

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "certificate.revoke",
    targetType: "Certificate",
    targetId: certNo,
    before: { status: before.status },
    after: { status: "revoked", reason },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, certNo };
}
