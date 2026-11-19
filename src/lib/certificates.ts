/**
 * Official documents — shared constants and formatters (isomorphic).
 *
 * The printable certificate templates (kept locally, not in git) carry the same
 * wording; keep them in step with these constants.
 */
import {
  CERT_NO_RE,
  type CertificateEngagement,
  type CertificateType,
} from "@/lib/validation/certificate";

/**
 * Where a certificate's QR code points. DELIBERATELY a constant and not
 * `SITE.url`: a printed certificate is a permanent document, and a QR code that
 * resolved to localhost or a preview URL because of an env override would be
 * dead for ever once printed.
 */
export const CERT_VERIFY_ORIGIN = "https://www.therareskin.com";
export const CERT_VERIFY_PATH = "/verify";

/** Matches the signed certificate. Never change without a document from the founder. */
export const CERT_ISSUER_TITLE =
  "Founder, THE RARESKIN · Proprietor, Velocity Ventures";
export const CERT_ORGANISATION =
  "THE RARESKIN, operated by Velocity Ventures (Proprietorship)";
export const CERT_CONTACT_EMAIL = "admin@velocityventuresgroup.in";
/**
 * The registered address, worded exactly as on the founder's letter and our letterhead (the
 * storefront's contact line in Studio → Settings words it differently, and marketing may edit
 * that one — an official document must not follow it).
 */
export const CERT_REGISTERED_ADDRESS =
  "Shop No. 4, Jija Mata Bachat Bhavan, Roha ST Road, Near ST Stand, Roha, Raigad, Maharashtra – 402109";

export const CERT_TYPE_LABEL: Record<CertificateType, string> = {
  INT: "Certificate of Internship",
  EXP: "Certificate of Experience",
  HR: "Letter",
  TEST: "Test certificate",
};

export const ENGAGEMENT_LABEL: Record<CertificateEngagement, string> = {
  internship: "Internship",
  freelance: "Freelance engagement",
  "full-time": "Full-time",
};

/** `TRS-INT-2026-001` */
export function formatCertNo(
  type: CertificateType,
  year: number,
  seq: number,
): string {
  return `TRS-${type}-${year}-${String(seq).padStart(3, "0")}`;
}

/**
 * Normalise whatever a person typed or a QR carried into a certificate number,
 * or `null` if it can't be one. Forgiving about case, spaces and the dash
 * characters word processors substitute (en dash, em dash, non-breaking hyphen).
 */
export function normaliseCertNo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, "");
  return CERT_NO_RE.test(cleaned) ? cleaned : null;
}

/** The address the QR code on the certificate carries. */
export function certVerifyUrl(certNo: string): string {
  return `${CERT_VERIFY_ORIGIN}${CERT_VERIFY_PATH}?id=${encodeURIComponent(certNo)}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `2026-08` → `August 2026` */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const name = MONTHS[Number(m) - 1];
  return name ? `${name} ${y}` : ym;
}

/** `2026-08`, `2026-11` → `August 2026 – November 2026` */
export function periodLabel(startMonth: string, endMonth: string): string {
  return startMonth === endMonth
    ? monthLabel(startMonth)
    : `${monthLabel(startMonth)} – ${monthLabel(endMonth)}`;
}

/** 1 → `1st`, 2 → `2nd`, 3 → `3rd`, 4 → `4th`, 11 → `11th`, 22 → `22nd`, 31 → `31st` */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

/**
 * A date stored at UTC midnight → `2nd November 2026` (no timezone drift). Day first, an
 * ordinal day and the month spelled out: the formal form on Indian certificates and letters,
 * and it can never be misread as month/day. The suffix is set inline, not raised.
 */
export function dateLabel(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${ordinal(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
