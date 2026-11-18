/**
 * Official documents (certificates, letters) — validation.
 *
 * Isomorphic: the admin form and the server validate against the same schemas.
 * Numbering is `TRS-{TYPE}-{YYYY}-{NNN}`; the number is assigned by the server,
 * never typed by staff.
 */
import { z } from "zod";

/**
 * INT = internship · EXP = experience · HR = letters · TEST = a throw-away record for
 * checking the verification flow end to end. TEST has its own number series
 * (`TRS-TEST-2026-001`), so testing never uses up a real certificate's number, and the
 * verify page labels it as a test.
 */
export const CERTIFICATE_TYPES = ["INT", "EXP", "HR", "TEST"] as const;
export const CERTIFICATE_ENGAGEMENTS = [
  "internship",
  "freelance",
  "full-time",
] as const;
/**
 * draft   — a number has been reserved; NOT public (the verify page says "not found").
 * valid   — the founder has signed it; the verify page confirms it.
 * revoked — withdrawn; the verify page says so. Terminal. Numbers are never reused.
 */
export const CERTIFICATE_STATUSES = ["draft", "valid", "revoked"] as const;

export type CertificateType = (typeof CERTIFICATE_TYPES)[number];
export type CertificateEngagement = (typeof CERTIFICATE_ENGAGEMENTS)[number];
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

/** `TRS-INT-2026-001` — hyphens everywhere (print, QR code, URL). */
export const CERT_NO_RE = /^TRS-(INT|EXP|HR|TEST)-(\d{4})-(\d{3,})$/;

/** `YYYY-MM`, the same shape the register CSV uses. */
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the YYYY-MM format");

const fields = {
  holderName: z.string().trim().min(2, "Enter the full name").max(80),
  role: z.string().trim().min(2, "Enter the role title").max(80),
  engagement: z.enum(CERTIFICATE_ENGAGEMENTS),
  startMonth: month,
  endMonth: month,
  /** One line on the work, shown on the verify page. Keep it factual. */
  summary: z.string().trim().max(320).default(""),
  signedBy: z.string().trim().min(2).max(80).default("Vijay Raju More"),
};

const periodOk = (v: { startMonth: string; endMonth: string }) =>
  v.endMonth >= v.startMonth;
const periodMsg = {
  message: "The end month can't be before the start month",
  path: ["endMonth"],
};

/** Create a draft. The certificate number is assigned by the server. */
export const certificateInput = z
  .object({ type: z.enum(CERTIFICATE_TYPES), ...fields })
  .refine(periodOk, periodMsg);

/** Edit a draft. `type` is fixed once the number exists. */
export const certificateEditInput = z.object(fields).refine(periodOk, periodMsg);

/** Draft → valid. Only once the founder has signed the printed certificate. */
export const certificateIssueInput = z.object({
  action: z.literal("issue"),
  /** the date the founder wrote on the signed certificate, `YYYY-MM-DD` */
  issuedOn: z.iso.date(),
  confirmSigned: z.literal(true, {
    error: "Confirm that the founder has signed the certificate",
  }),
});

/** Draft or valid → revoked. Terminal. */
export const certificateRevokeInput = z.object({
  action: z.literal("revoke"),
  reason: z.string().trim().min(3, "Give a short reason").max(240),
});

export const certificateActionInput = z.discriminatedUnion("action", [
  certificateIssueInput,
  certificateRevokeInput,
]);

export type CertificateInput = z.infer<typeof certificateInput>;
export type CertificateEditInput = z.infer<typeof certificateEditInput>;
export type CertificateActionInput = z.infer<typeof certificateActionInput>;
