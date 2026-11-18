import { Schema, model, models, type Model, type Types } from "mongoose";

import {
  CERTIFICATE_ENGAGEMENTS,
  CERTIFICATE_STATUSES,
  CERTIFICATE_TYPES,
} from "@/lib/validation/certificate";

/**
 * An official document issued by THE RARESKIN — an internship / experience
 * certificate or an HR letter — and the public record behind its QR code.
 *
 * The QR on the printed certificate points to `/verify?id=<certNo>`; that page
 * reads this collection. The record is deliberately thin: **no phone, e-mail or
 * address of the holder**, nothing that is not already printed on the paper.
 *
 * Lifecycle: `draft` (number reserved, invisible to the public) → `valid` (the
 * founder has signed; the verify page confirms it) → `revoked` (withdrawn,
 * terminal). A number is never reused or skipped. Every change is audit-logged.
 */
export interface CertificateDoc {
  _id: Types.ObjectId;
  /** `TRS-INT-2026-001` — unique */
  certNo: string;
  type: (typeof CERTIFICATE_TYPES)[number];
  year: number;
  seq: number;
  holderName: string;
  role: string;
  engagement: (typeof CERTIFICATE_ENGAGEMENTS)[number];
  /** `YYYY-MM` */
  startMonth: string;
  endMonth: string;
  /** one factual line on the work; shown on the verify page */
  summary: string;
  /** the date the founder wrote on the signed certificate (UTC midnight); null while draft */
  issuedOn: Date | null;
  signedBy: string;
  status: (typeof CERTIFICATE_STATUSES)[number];
  revokedReason: string | null;
  revokedAt: Date | null;
  createdBy: Types.ObjectId | null;
  /** the staff account that flipped it to `valid` */
  issuedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<CertificateDoc>(
  {
    certNo: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: CERTIFICATE_TYPES, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true },
    holderName: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, required: true, trim: true, maxlength: 80 },
    engagement: { type: String, enum: CERTIFICATE_ENGAGEMENTS, required: true },
    startMonth: { type: String, required: true },
    endMonth: { type: String, required: true },
    summary: { type: String, default: "", trim: true, maxlength: 320 },
    issuedOn: { type: Date, default: null },
    signedBy: { type: String, required: true, trim: true, maxlength: 80 },
    status: {
      type: String,
      enum: CERTIFICATE_STATUSES,
      default: "draft",
      required: true,
    },
    revokedReason: { type: String, default: null },
    revokedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Index names match migrations/20261119120000-certificates-collection.js.
certificateSchema.index({ certNo: 1 }, { name: "certNo_unique", unique: true });
certificateSchema.index({ status: 1, createdAt: -1 }, { name: "status_created" });

export const Certificate: Model<CertificateDoc> =
  (models.Certificate as Model<CertificateDoc>) ??
  model<CertificateDoc>("Certificate", certificateSchema);
