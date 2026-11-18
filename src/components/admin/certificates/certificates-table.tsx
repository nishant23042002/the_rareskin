import Link from "next/link";

import { ENGAGEMENT_LABEL } from "@/lib/certificates";
import type { AdminCertificateRow } from "@/server/admin";
import { CertificateStatusBadge } from "./certificate-status";

export function CertificatesTable({ rows }: { rows: AdminCertificateRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-[10px] tracking-[0.12em] text-ink-3 uppercase">
            <th className="px-4 py-2.5 font-medium">Number</th>
            <th className="px-4 py-2.5 font-medium">Holder</th>
            <th className="px-4 py-2.5 font-medium">Role</th>
            <th className="px-4 py-2.5 font-medium">Period</th>
            <th className="px-4 py-2.5 font-medium">Issued</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.certNo} className="border-b border-line last:border-b-0 hover:bg-surface-2/60">
              <td className="px-4 py-3 whitespace-nowrap">
                <Link
                  href={`/admin/certificates/${c.certNo}`}
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  {c.certNo}
                </Link>
              </td>
              <td className="px-4 py-3 text-ink">{c.holderName}</td>
              <td className="px-4 py-3 text-ink-2">
                {c.role}
                <span className="block text-[11px] text-ink-3">{ENGAGEMENT_LABEL[c.engagement]}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-2">{c.period}</td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-2">{c.issuedOnLabel}</td>
              <td className="px-4 py-3">
                <CertificateStatusBadge status={c.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
