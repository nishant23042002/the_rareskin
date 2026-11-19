import { Card } from "@/components/admin/ui";
import type { AdminCertificateRow } from "@/server/admin";

/**
 * The certificate itself, shown on its Studio page: the very PDF the Download button hands
 * over (`/api/admin/certificates/<no>/pdf?inline=1`), in a frame, so what is checked here is
 * exactly what gets printed. A draft shows its blank date line; a valid one shows the issue
 * date. A revoked certificate has no copy, and an HR letter is not a certificate.
 */

/** A short token that changes whenever anything printed on the certificate changes, so the
 *  frame reloads after "Save draft" / "Mark as valid" instead of showing the old copy. */
function versionOf(c: AdminCertificateRow): string {
  const s = [
    c.status,
    c.issuedOn ?? "",
    c.holderName,
    c.role,
    c.engagement,
    c.startMonth,
    c.endMonth,
    c.summary,
    c.signedBy,
  ].join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function CertificatePreview({ cert }: { cert: AdminCertificateRow }) {
  if (cert.type === "HR") return null;

  if (cert.status === "revoked") {
    return (
      <Card title="Certificate preview">
        <p className="text-[12.5px] leading-relaxed text-ink-3">
          This certificate has been revoked, so no copy is produced. To issue a corrected one, create a new
          certificate.
        </p>
      </Card>
    );
  }

  const base = `/api/admin/certificates/${encodeURIComponent(cert.certNo)}/pdf?inline=1`;
  const v = versionOf(cert);

  return (
    <Card
      title="Certificate preview"
      action={
        <a
          href={base}
          target="_blank"
          rel="noreferrer"
          className="text-[10.5px] tracking-[0.1em] text-ink-3 uppercase underline underline-offset-2 hover:text-ink hover:no-underline"
        >
          Open full size
        </a>
      }
    >
      <div className="relative aspect-[297/210] w-full overflow-hidden border border-line bg-[#F2F1ED]">
        <iframe
          key={v}
          src={`${base}&v=${v}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
          title={`Preview of certificate ${cert.certNo}`}
          className="absolute inset-0 size-full border-0"
        />
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        {cert.status === "draft"
          ? "The copy to print. The date line is blank on purpose: the founder writes the date, signs and stamps it, and only then do you mark it valid."
          : "The final copy, with the issue date printed. This is what the QR code confirms."}{" "}
        If the frame stays blank, use “Open full size”.
      </p>
    </Card>
  );
}
