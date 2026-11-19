import { pageMeta } from "@/lib/seo";
import { dateLabel, normaliseCertNo } from "@/lib/certificates";
import { checkRateOpen, requestContext } from "@/server/auth";
import { verifyCertificate, type VerifyResult } from "@/server/data/certificates";
import { Icon } from "@/components/ui/icon";
import { FindTheNumber } from "@/components/verify/find-the-number";
import { VerifyForm } from "@/components/verify/verify-form";
import {
  InvalidFormatCard,
  NotFoundCard,
  Ornament,
  RateLimitedCard,
  RevokedCard,
  UnavailableCard,
  ValidCard,
} from "@/components/verify/verify-result";

/**
 * `/verify` — the page the QR code on a certificate opens, e.g.
 * `/verify?id=TRS-INT-2026-001`. Also usable by typing the number.
 *
 * Dynamic (it reads `searchParams`) and never cached, so a revocation shows on
 * the next scan. `noindex`: nobody should find a person's certificate by
 * searching, only by holding the paper.
 *
 * Two shapes: with no number it is a landing page (form, how it works); with one
 * the answer comes FIRST — the person scanning a QR on a phone wants the verdict,
 * not the introduction — and the form moves below it for the next check.
 */
export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Verify a certificate",
  description:
    "Check that a THE RARESKIN certificate or letter is genuine, using the number printed beside its QR code.",
  path: "/verify",
  noindex: true,
});

type Verdict =
  | { kind: "none" }
  | { kind: "invalid"; typed: string }
  | { kind: "limited" }
  | { kind: "unavailable" }
  | { kind: "result"; certNo: string; result: VerifyResult };

async function check(rawId: string | undefined): Promise<Verdict> {
  if (!rawId?.trim()) return { kind: "none" };

  const certNo = normaliseCertNo(rawId);
  if (!certNo) return { kind: "invalid", typed: rawId.trim() };

  const { ip } = await requestContext();
  const rate = await checkRateOpen("certificate:verify:ip", ip ?? "unknown");
  if (!rate.success) return { kind: "limited" };

  try {
    return { kind: "result", certNo, result: await verifyCertificate(certNo) };
  } catch (err) {
    // A database blip must never read as "this certificate is fake".
    console.error("[verify] lookup failed", err);
    return { kind: "unavailable" };
  }
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawId = Array.isArray(sp.id) ? sp.id[0] : sp.id;
  const verdict = await check(rawId);
  const answered = verdict.kind !== "none";

  return (
    <>
      <header className="cv-hero" data-compact={answered || undefined}>
        <p className="cv-eyebrow">THE RARESKIN · Register of certificates</p>
        <h1 className="cv-h1">{answered ? "Verification result" : "Verify a certificate"}</h1>
        <Ornament both line={72} />
        {!answered && (
          <p className="cv-lede">
            Every certificate and official letter issued by THE RARESKIN carries a number and a QR
            code. Scan the code, or type the number below, to confirm that it is genuine and see the
            details on record.
          </p>
        )}
      </header>

      {!answered && <VerifyForm />}

      <div aria-live="polite">
        {verdict.kind === "invalid" && <InvalidFormatCard typed={verdict.typed} />}
        {verdict.kind === "limited" && <RateLimitedCard />}
        {verdict.kind === "unavailable" && <UnavailableCard />}
        {verdict.kind === "result" && verdict.result.state === "valid" && (
          <ValidCard certificate={verdict.result.certificate} checkedOn={dateLabel(new Date())} />
        )}
        {verdict.kind === "result" && verdict.result.state === "revoked" && (
          <RevokedCard certNo={verdict.certNo} revokedOn={verdict.result.revokedOn} />
        )}
        {verdict.kind === "result" && verdict.result.state === "not-found" && (
          <NotFoundCard certNo={verdict.certNo} />
        )}
      </div>

      {answered && (
        <section className="cv-again cv-noprint" aria-labelledby="again">
          <h2 id="again" className="cv-eyebrow">
            Check another certificate
          </h2>
          <VerifyForm defaultValue={rawId ?? ""} />
        </section>
      )}

      {!answered && (
        <>
          <section className="cv-how" aria-labelledby="how">
            <div>
              <h2 id="how" className="cv-eyebrow">
                How verification works
              </h2>
              <ol className="cv-steps">
                <li>
                  <span className="cv-num" aria-hidden="true">1</span>
                  <div>
                    <strong>Find the number</strong>
                    Printed on the certificate beside the QR code, in the form{" "}
                    <span className="whitespace-nowrap">TRS-INT-2026-001</span>.
                  </div>
                </li>
                <li>
                  <span className="cv-num" aria-hidden="true">2</span>
                  <div>
                    <strong>Scan or type it</strong>
                    The QR code opens this page with the number filled in.
                  </div>
                </li>
                <li>
                  <span className="cv-num" aria-hidden="true">3</span>
                  <div>
                    <strong>Compare the details</strong>
                    The name, role and period shown here must match the paper exactly.
                  </div>
                </li>
              </ol>
            </div>
            <FindTheNumber />
          </section>

          <section className="cv-trust" aria-label="About this register">
            <div>
              <span className="cv-ico"><Icon name="shield" className="size-[18px]" /></span>
              <p>
                <strong>Only what is printed</strong>
                This page shows the same details as the certificate itself, and nothing more about the person.
              </p>
            </div>
            <div>
              <span className="cv-ico"><Icon name="clock" className="size-[18px]" /></span>
              <p>
                <strong>Checked live</strong>
                Each check reads the register as it is now, so a withdrawn certificate stops verifying at once.
              </p>
            </div>
            <div>
              <span className="cv-ico"><Icon name="lock" className="size-[18px]" /></span>
              <p>
                <strong>No sign-in needed</strong>
                Anyone holding a certificate can check it. Nothing is asked of you and no account is needed.
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
}
