/**
 * The "enter a certificate number" form. A plain GET form to `/verify`, so it
 * works without JavaScript and the result page has a shareable address —
 * exactly what the QR code on the certificate opens.
 */
export function VerifyForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/verify" method="get" className="mt-8" role="search">
      <label htmlFor="certificate-id" className="block text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">
        Certificate number
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="certificate-id"
          name="id"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          maxLength={40}
          defaultValue={defaultValue}
          placeholder="TRS-INT-2026-001"
          className="min-h-12 w-full flex-1 border border-line-2 bg-surface px-4 text-[15px] tracking-[0.04em] text-ink uppercase outline-none transition-colors placeholder:text-ink-3 placeholder:normal-case focus:border-ink"
        />
        <button
          type="submit"
          className="min-h-12 shrink-0 bg-cta px-7 text-[11px] font-medium tracking-[0.16em] text-w0 uppercase transition-colors hover:bg-cta-hover"
        >
          Verify
        </button>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">
        Printed on the certificate, beside the QR code. It looks like{" "}
        <span className="whitespace-nowrap text-ink-2">TRS-INT-2026-001</span>.
      </p>
    </form>
  );
}
