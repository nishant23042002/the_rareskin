"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { SudoGate } from "@/components/admin/sudo-gate";
import { Icon } from "@/components/ui/icon";
import type { CertificateStatus } from "@/lib/validation/certificate";

const ERRORS: Record<string, string> = {
  "not-draft": "This certificate is no longer a draft.",
  "already-revoked": "This certificate is already revoked.",
  "future-date": "The issue date can't be in the future.",
  "bad-date": "Enter a valid date.",
  "not-found": "That certificate no longer exists.",
};

type Body =
  | { action: "issue"; issuedOn: string; confirmSigned: true }
  | { action: "revoke"; reason: string };

/**
 * The two actions that change what the public sees: issue (draft → valid) and
 * revoke. Both are sudo-gated — a 409 `sudo-required` opens the phone-OTP dialog
 * and the same request is retried once it is confirmed.
 */
export function CertificateActions({
  certNo,
  status,
}: {
  certNo: string;
  status: CertificateStatus;
}) {
  const router = useRouter();
  const [issuedOn, setIssuedOn] = useState("");
  const [signed, setSigned] = useState(false);
  const [reason, setReason] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sudoOpen, setSudoOpen] = useState(false);
  const pending = useRef<Body | null>(null);

  async function run(body: Body) {
    pending.current = body;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/certificates/${encodeURIComponent(certNo)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "sudo-required") {
        setSudoOpen(true);
        return;
      }
      if (!json.ok) {
        setError(ERRORS[json.error as string] ?? "That didn't work. Check the fields and try again.");
        return;
      }
      pending.current = null;
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "revoked") return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      {status === "draft" && (
        <Card title="Issue — make it public">
          <p className="text-[12px] leading-relaxed text-ink-2">
            Do this <strong className="font-medium text-ink">only after the founder has signed and stamped the printed
            certificate.</strong> From then on, anyone who scans the QR code is told this certificate is genuine.
          </p>
          <label className="mt-3 block">
            <span className="block text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
              Date written on the certificate
            </span>
            <input
              type="date"
              value={issuedOn}
              max={today}
              onChange={(e) => setIssuedOn(e.target.value)}
              className="mt-1 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink"
            />
          </label>
          <label className="mt-3 flex items-start gap-2 text-[12px] leading-snug text-ink-2">
            <input
              type="checkbox"
              checked={signed}
              onChange={(e) => setSigned(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-cta)]"
            />
            <span>
              The founder has signed this certificate in ink and the date above is the date he wrote on it.
            </span>
          </label>
          {error && !revoking && (
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-error">
              <Icon name="alert" className="size-3.5" />
              {error}
            </p>
          )}
          <button
            onClick={() => run({ action: "issue", issuedOn, confirmSigned: true })}
            disabled={busy || !issuedOn || !signed}
            className="mt-3 w-full rounded-[3px] bg-cta px-3 py-2 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
          >
            {busy && !revoking ? "…" : "Mark as valid"}
          </button>
        </Card>
      )}

      <Card title="Revoke">
        {!revoking ? (
          <button
            onClick={() => {
              setError(null);
              setRevoking(true);
            }}
            className="w-full rounded-[3px] border border-line-2 px-3 py-2 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-error hover:text-error"
          >
            Revoke this certificate
          </button>
        ) : (
          <>
            <p className="text-[12px] leading-relaxed text-ink-2">
              Permanent. The verify page will say it was revoked, and the number stays reserved for ever.
            </p>
            <label className="mt-3 block">
              <span className="block text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
                Reason (kept internally, not shown publicly)
              </span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. issued in error"
                maxLength={240}
                className="mt-1 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink placeholder:text-ink-3"
              />
            </label>
            {error && (
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-error">
                <Icon name="alert" className="size-3.5" />
                {error}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setRevoking(false)}
                className="flex-1 rounded-[3px] border border-line-2 px-3 py-2 text-[11px] tracking-[0.08em] text-ink-2 uppercase hover:border-ink hover:text-ink"
              >
                Keep
              </button>
              <button
                onClick={() => run({ action: "revoke", reason })}
                disabled={busy || reason.trim().length < 3}
                className="flex-1 rounded-[3px] border border-error/50 px-3 py-2 text-[11px] tracking-[0.08em] text-error uppercase hover:bg-error hover:text-w0 disabled:opacity-40"
              >
                {busy ? "…" : "Revoke"}
              </button>
            </div>
          </>
        )}
      </Card>

      <SudoGate
        open={sudoOpen}
        title="Confirm it's you"
        detail="Issuing or revoking a certificate changes what the public sees. Enter the code we just sent to your phone."
        onCancel={() => setSudoOpen(false)}
        onConfirmed={() => {
          setSudoOpen(false);
          if (pending.current) void run(pending.current);
        }}
      />
    </>
  );
}
