import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { listCertificates } from "@/server/admin";
import { PageHeader, Card, EmptyState } from "@/components/admin/ui";
import { CertificatesTable } from "@/components/admin/certificates/certificates-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificates · Studio" };

export default async function CertificatesPage() {
  await requireAdminRole("admin");
  const rows = await listCertificates();

  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="Certificates"
        actions={
          <Link
            href="/admin/certificates/new"
            className="rounded-[3px] bg-cta px-3 py-1.5 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover"
          >
            New certificate
          </Link>
        }
      >
        {rows.length} on record · verified publicly at{" "}
        <Link href="/verify" className="underline underline-offset-2 hover:no-underline">
          /verify
        </Link>
      </PageHeader>

      <Card className="!p-0">
        {rows.length === 0 ? (
          <EmptyState icon="check">
            No certificates yet. Create a draft to reserve a number and get its QR code.
          </EmptyState>
        ) : (
          <CertificatesTable rows={rows} />
        )}
      </Card>
    </>
  );
}
