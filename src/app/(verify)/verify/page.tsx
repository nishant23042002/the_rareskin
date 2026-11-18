import { pageMeta } from "@/lib/seo";
import { dateLabel, normaliseCertNo } from "@/lib/certificates";
import { checkRateOpen, requestContext } from "@/server/auth";
import { verifyCertificate, type VerifyResult } from "@/server/data/certificates";
import { VerifyForm } from "@/components/verify/verify-form";
import {
  InvalidFormatCard,
  NotFoundCard,
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

  return (
    <>
      <p className="eyebrow">THE RARESKIN</p>
      <h1 className="serif-italic mt-3 text-[2.2rem] leading-[1.08] text-ink sm:text-[3rem]">
        Verify a certificate
      </h1>
      <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
        Every certificate and official letter issued by THE RARESKIN carries a number and a QR code.
        Scan the code, or type the number below, to confirm that it is genuine and see the details on
        record.
      </p>

      <VerifyForm defaultValue={verdict.kind === "none" ? "" : (rawId ?? "")} />

      <div aria-live="polite">
        {verdict.kind === "invalid" && <InvalidFormatCard typed={verdict.typed} />}
        {verdict.kind === "limited" && <RateLimitedCard />}
        {verdict.kind === "unavailable" && <UnavailableCard />}
        {verdict.kind === "result" && verdict.result.state === "valid" && (
          <ValidCard
            certificate={verdict.result.certificate}
            checkedOn={dateLabel(new Date())}
          />
        )}
        {verdict.kind === "result" && verdict.result.state === "revoked" && (
          <RevokedCard certNo={verdict.certNo} revokedOn={verdict.result.revokedOn} />
        )}
        {verdict.kind === "result" && verdict.result.state === "not-found" && (
          <NotFoundCard certNo={verdict.certNo} />
        )}
      </div>

      {verdict.kind === "none" && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="eyebrow">How verification works</h2>
          <ol className="mt-4 grid gap-4 text-[14px] leading-relaxed text-ink-2 sm:grid-cols-3">
            <li>
              <span className="block text-ink">1. Find the number</span>
              Printed on the certificate beside the QR code, in the form TRS-INT-2026-001.
            </li>
            <li>
              <span className="block text-ink">2. Scan or type it</span>
              The QR code opens this page with the number filled in.
            </li>
            <li>
              <span className="block text-ink">3. Compare the details</span>
              The name, role and period shown here must match the paper exactly.
            </li>
          </ol>
        </section>
      )}
    </>
  );
}
