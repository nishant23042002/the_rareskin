import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminRole } from "@/server/auth/admin";
import { getCertificateForAdmin } from "@/server/admin";
import { qrPath, qrSvg } from "@/server/certificates/qr";
import { PageHeader, Card } from "@/components/admin/ui";
import { CertificateForm } from "@/components/admin/certificates/certificate-form";
import { CertificateActions } from "@/components/admin/certificates/certificate-actions";
import { CertificateStatusBadge } from "@/components/admin/certificates/certificate-status";
import { Icon } from "@/components/ui/icon";
import {
  CERT_TYPE_LABEL,
  ENGAGEMENT_LABEL,
  certVerifyUrl,
  normaliseCertNo,
} from "@/lib/certificates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate · Studio" };

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-t border-line py-2 text-[12.5px] first:border-t-0">
      <dt className="text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ certNo: string }>;
}) {
  await requireAdminRole("admin");
  const certNo = normaliseCertNo(decodeURIComponent((await params).certNo));
  if (!certNo) notFound();
  const cert = await getCertificateForAdmin(certNo);
  if (!cert) notFound();

  const url = certVerifyUrl(cert.certNo);
  const { size, d } = qrPath(url);
  const margin = 4; // quiet zone, in modules
  const box = size + margin * 2;
  const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(url))}`;

  return (
    <>
      <Link
        href="/admin/certificates"
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        Certificates
      </Link>
      <PageHeader
        eyebrow={CERT_TYPE_LABEL[cert.type]}
        title={cert.certNo}
        actions={<CertificateStatusBadge status={cert.status} />}
      >
        {cert.holderName} · {cert.role}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-4">
          <Card title="Record">
            <dl>
              <Item label="Holder">{cert.holderName}</Item>
              <Item label="Role">{cert.role}</Item>
              <Item label="Engagement">{ENGAGEMENT_LABEL[cert.engagement]}</Item>
              <Item label="Period">{cert.period}</Item>
              <Item label="Date of issue">{cert.issuedOnLabel}</Item>
              <Item label="Signed by">{cert.signedBy}</Item>
              {cert.summary && <Item label="Work">{cert.summary}</Item>}
              {cert.status === "revoked" && (
                <Item label="Revoked">
                  {cert.revokedOnLabel}
                  {cert.revokedReason && <span className="block text-ink-2">{cert.revokedReason}</span>}
                </Item>
              )}
            </dl>
          </Card>

          {cert.status === "draft" && (
            <>
              <h2 className="-mb-2 text-[10.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
                Edit draft
              </h2>
              <CertificateForm mode="edit" certificate={cert} />
            </>
          )}
        </div>

        <div className="grid content-start gap-4">
          <Card title="QR code & link">
            <div className="mx-auto w-44 border border-line bg-white p-0">
              <svg
                viewBox={`${-margin} ${-margin} ${box} ${box}`}
                role="img"
                aria-label={`QR code for ${cert.certNo}`}
                shapeRendering="crispEdges"
                className="block w-full"
              >
                <rect x={-margin} y={-margin} width={box} height={box} fill="#fff" />
                <path d={d} fill="#000" />
              </svg>
            </div>
            <p className="mt-3 text-[11.5px] break-all text-ink-2">{url}</p>
            <a
              href={download}
              download={`${cert.certNo}-qr.svg`}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-line-2 px-3 py-2 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-ink hover:text-ink"
            >
              <Icon name="download" className="size-3.5" />
              Download SVG
            </a>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
              This is the code that goes on the certificate. It only confirms the document once the status is{" "}
              <strong className="font-medium text-ink-2">Valid</strong>
              {cert.status === "valid" ? (
                <>
                  {" "}
                  —{" "}
                  <a
                    href={`/verify?id=${encodeURIComponent(cert.certNo)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    open the public page
                  </a>
                  .
                </>
              ) : (
                "."
              )}
            </p>
          </Card>

          <CertificateActions certNo={cert.certNo} status={cert.status} />
        </div>
      </div>
    </>
  );
}
