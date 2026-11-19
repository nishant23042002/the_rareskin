import type { CSSProperties } from "react";

import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import {
  CERT_CONTACT_EMAIL,
  CERT_REGISTERED_ADDRESS,
  CERT_VERIFY_ORIGIN,
  CERT_VERIFY_PATH,
  certVerifyUrl,
} from "@/lib/certificates";
import { qrPath } from "@/server/certificates/qr";
import type { PublicCertificate } from "@/server/data/certificates";
import { PrintButton } from "./print-button";

/**
 * What `/verify` shows. A valid record is drawn AS the certificate — the layout, palette and
 * wording of the downloadable PDF — so what someone sees after scanning the QR is the document
 * they are holding, with a verdict on top. Presentational only; the styles live in
 * `app/(verify)/verify.css`.
 */

const VERIFY_HOME = `${CERT_VERIFY_ORIGIN}${CERT_VERIFY_PATH}`;
const VERIFY_HOME_LABEL = "www.therareskin.com/verify";

/** Long names / roles step down so they never outgrow the sheet (the PDF does the same). */
function nameFont(n: string): string {
  return n.length <= 20
    ? "clamp(38px, 6cqw, 62px)"
    : n.length <= 26
      ? "clamp(32px, 5cqw, 52px)"
      : n.length <= 34
        ? "clamp(28px, 4.2cqw, 44px)"
        : "clamp(24px, 3.6cqw, 36px)";
}
function roleFont(n: string): string {
  return n.length <= 28
    ? "clamp(24px, 3.2cqw, 34px)"
    : n.length <= 40
      ? "clamp(22px, 2.7cqw, 28px)"
      : "clamp(20px, 2.1cqw, 22px)";
}

/** line + diamond: `lead` puts the diamond first, `both` puts a line either side (centred headings) */
export function Ornament({
  line = 64,
  lead = false,
  both = false,
  onDark = false,
  className = "",
}: {
  line?: number;
  lead?: boolean;
  both?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`cv-orn${onDark ? " cv-orn--on-dark" : ""} ${className}`.trim()}
      style={{ "--cv-orn-line": `${line}px` } as CSSProperties}
      aria-hidden="true"
    >
      {lead && <i />}
      {(both || !lead) && <b />}
      {!lead && <i />}
      {both && <b />}
      {lead && !both && <b />}
    </span>
  );
}

function Verdict({
  isTest,
  checkedOn,
}: {
  isTest: boolean;
  checkedOn: string;
}) {
  return (
    <div className="cv-verdict" data-tone={isTest ? "test" : "ok"}>
      <span className="cv-verdict__mark" aria-hidden="true">
        {isTest ? (
          <Icon name="alert" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
      <div className="cv-verdict__text">
        <p className="cv-verdict__kicker">{isTest ? "Test record" : "Verified record"}</p>
        <h2 id="verdict">
          {isTest ? "The verification flow works — this is a test" : "This certificate is genuine"}
        </h2>
        <p>
          {isTest
            ? "This is a test certificate used to check THE RARESKIN’s verification system. It certifies nothing and is not a real document."
            : "It is on record with THE RARESKIN and has not been revoked."}
        </p>
      </div>
      <p className="cv-verdict__when">
        Record checked
        <strong>{checkedOn}</strong>
      </p>
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
  const url = certVerifyUrl(c.certNo);
  const { size, d } = qrPath(url);
  const w = c.wording;
  const titles = c.issuerTitle.split(" · ");

  return (
    <article aria-labelledby="verdict" className="mt-10">
      <Verdict isTest={c.isTest} checkedOn={checkedOn} />

      <p className="cv-print-only mt-3 text-[12px] text-ink-3">
        Verified online at {VERIFY_HOME_LABEL}?id={c.certNo} on {checkedOn}.
      </p>

      <div className="cv-sheet">
        <section className="cv-paper" aria-label={`${w.title}, ${c.certNo}`}>
          {/* ── dark panel: brand, QR, number ─────────────────────────────── */}
          <aside className="cv-side">
            <div>
              <Logo className="text-[#f2f1ed]" style={{ width: 176 }} />
              <p className="cv-side__sub">Operated by Velocity Ventures (Proprietorship)</p>
            </div>

            <div className="cv-side__how">
              <Ornament lead onDark />
              <p className="mt-4">
                This certificate can be verified online. Scan the code, or enter the certificate number at{" "}
                <a href={VERIFY_HOME}>{VERIFY_HOME_LABEL}</a> to see the details on record.
              </p>
            </div>

            <div className="cv-ref">
              <div className="cv-qr">
                <svg
                  viewBox={`0 0 ${size} ${size}`}
                  shapeRendering="crispEdges"
                  role="img"
                  aria-label={`QR code for ${c.certNo}`}
                >
                  <path d={d} fill="#1a1714" />
                </svg>
              </div>
              <div>
                <p className="cv-ref__cap">Certificate No.</p>
                <p className="cv-ref__no">{c.certNo}</p>
                <a className="cv-ref__url" href={VERIFY_HOME}>
                  {VERIFY_HOME_LABEL}
                </a>
              </div>
            </div>
          </aside>

          {/* ── ivory panel: the wording ──────────────────────────────────── */}
          <div className="cv-main">
            <div className="cv-frame" aria-hidden="true">
              <i className="cv-dia cv-dia--tl" />
              <i className="cv-dia cv-dia--tr" />
              <i className="cv-dia cv-dia--bl" />
              <i className="cv-dia cv-dia--br" />
            </div>
            {c.isTest && (
              <div className="cv-watermark" aria-hidden="true">
                <span>TEST ONLY</span>
              </div>
            )}

            <div className="cv-body">
              <div>
                <div className="cv-top">
                  <Ornament lead />
                  {c.isTest && <span className="cv-pill">Test document — not valid</span>}
                </div>
                <p className="cv-title">{w.title}</p>
                <p className="cv-intro">{w.intro}</p>
                <p className="cv-name" style={{ "--cv-name": nameFont(c.holderName) } as CSSProperties}>
                  {c.holderName}
                </p>
                <Ornament className="cv-orn--name" />
                <p className="cv-lead">{w.lead}</p>
                <p className="cv-role" style={{ "--cv-role": roleFont(c.role) } as CSSProperties}>
                  {c.role}
                </p>
                <p className="cv-text">{w.body}</p>
              </div>

              <div className="cv-end">
                <div className="cv-sign">
                  <div className="cv-date">
                    <p className="cv-date__v">{c.issuedOn}</p>
                    <div className="cv-rule" />
                    <p className="cv-cap">Date of issue</p>
                  </div>

                  {/* the company stamp is applied in ink on the paper copy, in the clear space between
                      the date and the signature — nothing is drawn here */}
                  <div className="cv-signer">
                    <div className="cv-sig-space" />
                    <div className="cv-rule" />
                    <p className="cv-signer__name">{c.issuedBy}</p>
                    {titles.map((t) => (
                      <p key={t} className="cv-signer__title">
                        {t}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="cv-fine">
                  <p>
                    Velocity Ventures (Proprietorship) ·{" "}
                    <a href={`mailto:${CERT_CONTACT_EMAIL}`}>{CERT_CONTACT_EMAIL}</a> ·{" "}
                    <a href={CERT_VERIFY_ORIGIN}>www.therareskin.com</a>
                  </p>
                  <p>Registered address: {CERT_REGISTERED_ADDRESS}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="cv-notes cv-noprint">
        <section>
          <h3 className="cv-eyebrow">{c.isTest ? "About this record" : "Check it against your copy"}</h3>
          {c.isTest ? (
            <p>
              This is a test entry created to check that verification works. It is not a real
              certificate and certifies nothing.
            </p>
          ) : (
            <>
              <p>Hold the paper (or the PDF) beside this page. These four things must match exactly:</p>
              <ul className="cv-checks">
                <li>The name</li>
                <li>The role</li>
                <li>The period</li>
                <li>The certificate number</li>
              </ul>
              <p>
                If anything differs, the document is not genuine — write to{" "}
                <a href={`mailto:${CERT_CONTACT_EMAIL}`}>{CERT_CONTACT_EMAIL}</a>.
              </p>
            </>
          )}
        </section>

        <section>
          <h3 className="cv-eyebrow">Register entry</h3>
          <dl className="cv-entry">
            <div>
              <dt>Status</dt>
              <dd>
                <span className="cv-dot" aria-hidden="true" />
                {c.isTest ? "Test record" : "Valid · not revoked"}
              </dd>
            </div>
            <div>
              <dt>Certificate No.</dt>
              <dd className="tracking-[0.04em]">{c.certNo}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>{c.period}</dd>
            </div>
            <div>
              <dt>Date of issue</dt>
              <dd>{c.issuedOn}</dd>
            </div>
            <div>
              <dt>Issued by</dt>
              <dd>
                {c.issuedBy}
                <span className="block text-[13px] text-ink-2">{c.issuerTitle}</span>
              </dd>
            </div>
          </dl>
          <div className="cv-actions">
            <PrintButton />
          </div>
        </section>
      </div>
    </article>
  );
}

function Notice({
  tone,
  icon,
  title,
  stamp,
  children,
}: {
  tone: "error" | "warn";
  icon: "alert" | "clock";
  title: string;
  stamp?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className="cv-notice" data-tone={tone}>
      <span className="cv-notice__mark" aria-hidden="true">
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0">
        <h2>{title}</h2>
        <div className="cv-notice__body">{children}</div>
        {stamp && (
          <span className="cv-stamp" aria-hidden="true">
            {stamp}
          </span>
        )}
      </div>
    </div>
  );
}

const mail = (
  <a href={`mailto:${CERT_CONTACT_EMAIL}`}>{CERT_CONTACT_EMAIL}</a>
);

export function NotFoundCard({ certNo }: { certNo: string }) {
  return (
    <Notice tone="error" icon="alert" title="No certificate found" stamp="No record">
      <p>
        We have no certificate on record under{" "}
        <span className="whitespace-nowrap font-medium text-ink">{certNo}</span>. Check the number
        against the paper (the characters are easy to misread) and try again.
      </p>
      <p className="mt-2">
        A certificate that cannot be verified here should not be treated as genuine. To confirm one,
        write to {mail}.
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
    <Notice tone="error" icon="alert" title="This certificate has been revoked" stamp="Revoked">
      <p>
        <span className="whitespace-nowrap font-medium text-ink">{certNo}</span> was withdrawn by the
        issuer{revokedOn ? ` on ${revokedOn}` : ""}. It is no longer valid and should not be relied
        on.
      </p>
      <p className="mt-2">For details, write to {mail}.</p>
    </Notice>
  );
}

export function InvalidFormatCard({ typed }: { typed: string }) {
  return (
    <Notice tone="warn" icon="alert" title="That doesn’t look like a certificate number">
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
        We couldn&rsquo;t reach the records just now. This does{" "}
        <strong className="font-medium text-ink">not</strong> mean the certificate is invalid — please
        try again in a few minutes.
      </p>
    </Notice>
  );
}
