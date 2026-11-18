import { Icon } from "@/components/ui/icon";
import { CERT_CONTACT_EMAIL } from "@/lib/certificates";
import type { PublicCertificate } from "@/server/data/certificates";

/** The verdict cards the `/verify` page shows. Presentational only. */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-t border-line py-3.5 first:border-t-0 sm:grid-cols-[170px_1fr] sm:gap-6">
      <dt className="text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase sm:pt-1">
        {label}
      </dt>
      <dd className="text-[15px] leading-snug text-ink">{children}</dd>
    </div>
  );
}

export function ValidCard({
  certificate: c,
  checkedOn,
}: {
  certificate: PublicCertificate;
  checkedOn: string;
}) {
  return (
    <article aria-labelledby="verdict" className="mt-8 border border-line bg-surface">
      {c.isTest ? (
        // A TRS-TEST-… record exists only to check that this page works. It must never read as a real certificate.
        <div className="flex items-start gap-3 border-b border-line bg-gilt/[0.12] px-5 py-4">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-warn text-w0">
            <Icon name="alert" className="size-4" />
          </span>
          <div>
            <h2 id="verdict" className="text-[17px] leading-tight font-medium text-warn">
              Test record — the verification flow works
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              This is a test certificate used to check THE RARESKIN&rsquo;s verification system. It
              certifies nothing and is not a real document.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 border-b border-line bg-ok/[0.07] px-5 py-4">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-ok text-w0">
            <Icon name="check" className="size-4" />
          </span>
          <div>
            <h2 id="verdict" className="text-[17px] leading-tight font-medium text-ok">
              Verified — this certificate is genuine
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              It is on record with THE RARESKIN and has not been revoked.
            </p>
          </div>
        </div>
      )}

      <div className="px-5 py-2 sm:px-7">
        <p className="eyebrow mt-4">{c.documentType}</p>
        <p className="serif-italic mt-1 text-[2rem] leading-[1.1] text-ink sm:text-[2.4rem]">
          {c.holderName}
        </p>

        <dl className="mt-4">
          <Row label="Role">{c.role}</Row>
          <Row label="Engagement">{c.engagement}</Row>
          <Row label="Period">{c.period}</Row>
          <Row label="Date of issue">{c.issuedOn}</Row>
          <Row label="Certificate No.">
            <span className="tracking-[0.04em]">{c.certNo}</span>
          </Row>
          <Row label="Issued by">
            <span className="block">{c.issuedBy}</span>
            <span className="block text-[13px] text-ink-2">{c.issuerTitle}</span>
          </Row>
          {c.summary && <Row label="Work">{c.summary}</Row>}
        </dl>
      </div>

      <div className="border-t border-line bg-surface-2 px-5 py-4 text-[13px] leading-relaxed text-ink-2 sm:px-7">
        <p>
          <strong className="font-medium text-ink">Compare this with the certificate you were given.</strong>{" "}
          The name, role, period and number must match exactly. If anything
          differs, the paper is not genuine — write to{" "}
          <a
            href={`mailto:${CERT_CONTACT_EMAIL}`}
            className="text-ink underline underline-offset-2 hover:no-underline"
          >
            {CERT_CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className="mt-2 text-ink-3">Record checked on {checkedOn}.</p>
      </div>
    </article>
  );
}

function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: "error" | "warn";
  icon: "alert" | "clock";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`mt-8 border bg-surface px-5 py-5 sm:px-7 ${tone === "error" ? "border-error/40" : "border-gilt/50"}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          name={icon}
          className={`mt-0.5 size-5 shrink-0 ${tone === "error" ? "text-error" : "text-warn"}`}
        />
        <div>
          <h2 className={`text-[17px] leading-tight font-medium ${tone === "error" ? "text-error" : "text-warn"}`}>
            {title}
          </h2>
          <div className="mt-2 text-[14px] leading-relaxed text-ink-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function NotFoundCard({ certNo }: { certNo: string }) {
  return (
    <Notice tone="error" icon="alert" title="No certificate found">
      <p>
        We have no certificate on record under{" "}
        <span className="whitespace-nowrap font-medium text-ink">{certNo}</span>.
        Check the number against the paper (the characters are easy to misread) and try again.
      </p>
      <p className="mt-2">
        A certificate that cannot be verified here should not be treated as
        genuine. To confirm one, write to{" "}
        <a
          href={`mailto:${CERT_CONTACT_EMAIL}`}
          className="text-ink underline underline-offset-2 hover:no-underline"
        >
          {CERT_CONTACT_EMAIL}
        </a>
        .
      </p>
    </Notice>
  );
}

export function RevokedCard({
  certNo,
  revokedOn,
}: {
  certNo: string;
  revokedOn: string | null;
}) {
  return (
    <Notice tone="error" icon="alert" title="This certificate has been revoked">
      <p>
        <span className="whitespace-nowrap font-medium text-ink">{certNo}</span> was
        withdrawn by the issuer{revokedOn ? ` on ${revokedOn}` : ""}. It is no longer valid and
        should not be relied on.
      </p>
      <p className="mt-2">
        For details, write to{" "}
        <a
          href={`mailto:${CERT_CONTACT_EMAIL}`}
          className="text-ink underline underline-offset-2 hover:no-underline"
        >
          {CERT_CONTACT_EMAIL}
        </a>
        .
      </p>
    </Notice>
  );
}

export function InvalidFormatCard({ typed }: { typed: string }) {
  return (
    <Notice tone="warn" icon="alert" title="That doesn't look like a certificate number">
      <p>
        <span className="font-medium text-ink">{typed.slice(0, 40)}</span> is not in the form{" "}
        <span className="whitespace-nowrap">TRS-INT-2026-001</span> (TRS, the type, the year and a
        three-digit number, joined by hyphens). Check the paper and try again.
      </p>
    </Notice>
  );
}

export function RateLimitedCard() {
  return (
    <Notice tone="warn" icon="clock" title="Too many checks just now">
      <p>Please wait a few minutes and try again.</p>
    </Notice>
  );
}

export function UnavailableCard() {
  return (
    <Notice tone="warn" icon="clock" title="Verification is temporarily unavailable">
      <p>
        We couldn&rsquo;t reach the records just now. This does <strong className="font-medium text-ink">not</strong>{" "}
        mean the certificate is invalid — please try again in a few minutes.
      </p>
    </Notice>
  );
}
