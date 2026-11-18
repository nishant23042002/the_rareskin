"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  FormSection,
  Row,
} from "@/components/admin/field";
import { Icon } from "@/components/ui/icon";
import { CERT_TYPE_LABEL, ENGAGEMENT_LABEL } from "@/lib/certificates";
import {
  CERTIFICATE_ENGAGEMENTS,
  CERTIFICATE_TYPES,
  type CertificateEngagement,
  type CertificateType,
} from "@/lib/validation/certificate";
import type { AdminCertificateRow } from "@/server/admin";

interface FormState {
  type: CertificateType;
  holderName: string;
  role: string;
  engagement: CertificateEngagement;
  startMonth: string;
  endMonth: string;
  summary: string;
  signedBy: string;
}

const EMPTY: FormState = {
  type: "INT",
  holderName: "",
  role: "",
  engagement: "internship",
  startMonth: "",
  endMonth: "",
  summary: "",
  signedBy: "Vijay Raju More",
};

const ERRORS: Record<string, string> = {
  "not-draft": "Only a draft can be edited — this certificate has already been issued or revoked.",
  "not-found": "That certificate no longer exists.",
};

/** Create a draft (reserves the next number) or edit an existing draft. */
export function CertificateForm({
  mode,
  certificate,
}: {
  mode: "create" | "edit";
  certificate?: AdminCertificateRow;
}) {
  const router = useRouter();
  const [s, setS] = useState<FormState>(() =>
    certificate
      ? {
          type: certificate.type,
          holderName: certificate.holderName,
          role: certificate.role,
          engagement: certificate.engagement,
          startMonth: certificate.startMonth,
          endMonth: certificate.endMonth,
          summary: certificate.summary,
          signedBy: certificate.signedBy,
        }
      : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setSaved(false);
    setS((p) => ({ ...p, [k]: v }));
  };

  async function save() {
    setError(null);
    setSaved(false);
    if (s.holderName.trim().length < 2) return setError("Enter the holder's full name.");
    if (s.role.trim().length < 2) return setError("Enter the role title.");
    if (!s.startMonth || !s.endMonth) return setError("Choose the start and end month.");
    if (s.endMonth < s.startMonth) return setError("The end month can't be before the start month.");

    setBusy(true);
    try {
      const { type, ...rest } = s;
      const res = await fetch(
        mode === "create"
          ? "/api/admin/certificates"
          : `/api/admin/certificates/${encodeURIComponent(certificate!.certNo)}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(mode === "create" ? { type, ...rest } : rest),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        setError(
          ERRORS[json.error as string] ??
            "Couldn't save. Check the fields and try again.",
        );
        return;
      }
      if (mode === "create") {
        router.push(`/admin/certificates/${json.certNo}`);
      } else {
        setSaved(true);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      {mode === "create" && (
        <FormSection
          title="Document"
          description="Saving reserves the next number for this type. It is a draft until the founder has signed it — the QR code won't confirm anything before then."
        >
          <Field
            label="Type"
            info="INT = internship, EXP = experience, HR = letters. TEST = a throw-away record for checking the verification flow (its own number series, labelled as a test publicly). The number is TRS-{type}-{year}-{NNN}, assigned for you; numbers are never reused or skipped."
          >
            <Select
              value={s.type}
              onChange={(e) => set("type", e.target.value as CertificateType)}
            >
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} — {CERT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>
      )}

      <FormSection title="Holder & role" description="Exactly as it will be printed on the certificate.">
        <Row>
          <Field label="Full name">
            <TextInput
              value={s.holderName}
              onChange={(e) => set("holderName", e.target.value)}
              placeholder="Full name, as printed"
              maxLength={80}
            />
          </Field>
          <Field label="Role title">
            <TextInput
              value={s.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="Full Stack Developer Intern"
              maxLength={80}
            />
          </Field>
        </Row>
        <Field label="Engagement">
          <Select
            value={s.engagement}
            onChange={(e) => set("engagement", e.target.value as CertificateEngagement)}
          >
            {CERTIFICATE_ENGAGEMENTS.map((x) => (
              <option key={x} value={x}>
                {ENGAGEMENT_LABEL[x]}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Period">
        <Row>
          <Field label="Start month">
            <TextInput
              type="month"
              value={s.startMonth}
              onChange={(e) => set("startMonth", e.target.value)}
            />
          </Field>
          <Field label="End month">
            <TextInput
              type="month"
              value={s.endMonth}
              onChange={(e) => set("endMonth", e.target.value)}
            />
          </Field>
        </Row>
      </FormSection>

      <FormSection
        title="Work & issuer"
        description="Shown to anyone who verifies the certificate. Keep it factual: every line must be true and explainable in an interview."
      >
        <Field label="Work summary" hint={`${s.summary.length}/320`}>
          <TextArea
            value={s.summary}
            onChange={(e) => set("summary", e.target.value.slice(0, 320))}
            rows={3}
            placeholder="One line on what the person built or owned."
          />
        </Field>
        <Field
          label="Signed by"
          info="The issuer signs, never the holder. Don't change this without a document from the founder."
        >
          <TextInput value={s.signedBy} onChange={(e) => set("signedBy", e.target.value)} maxLength={80} />
        </Field>
      </FormSection>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-error">
          <Icon name="alert" className="size-3.5" />
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ok">
          <Icon name="check" className="size-3.5" />
          Saved.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-[3px] bg-cta px-4 py-2 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
        >
          {busy ? "Saving…" : mode === "create" ? "Reserve number & save draft" : "Save changes"}
        </button>
      </div>
    </Card>
  );
}
