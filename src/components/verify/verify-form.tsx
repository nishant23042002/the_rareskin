/**
 * The "enter a certificate number" form. A plain GET form to `/verify`, so it
 * works without JavaScript and the result page has a shareable address —
 * exactly what the QR code on the certificate opens.
 */
export function VerifyForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/verify" method="get" role="search" className="cv-form cv-noprint">
      <label htmlFor="certificate-id" className="cv-label">
        Certificate number
      </label>
      <div className="cv-field">
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
          className="cv-input"
        />
        <button type="submit" className="cv-btn">
          Verify
        </button>
      </div>
      <p className="cv-hint">
        Printed on the certificate, beside the QR code. It looks like{" "}
        <span className="whitespace-nowrap text-ink-2">TRS-INT-2026-001</span>.
      </p>
    </form>
  );
}
