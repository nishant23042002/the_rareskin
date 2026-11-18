import type { CertificateStatus } from "@/lib/validation/certificate";
import { cn } from "@/lib/cn";

const TONE: Record<CertificateStatus, string> = {
  draft: "border-gilt/50 text-warn",
  valid: "border-ok/50 text-ok",
  revoked: "border-error/40 text-error",
};

const LABEL: Record<CertificateStatus, string> = {
  draft: "Draft — not public",
  valid: "Valid",
  revoked: "Revoked",
};

export function CertificateStatusBadge({
  status,
  className,
}: {
  status: CertificateStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-medium tracking-[0.09em] uppercase",
        TONE[status],
        className,
      )}
    >
      {LABEL[status]}
    </span>
  );
}
