"use client";

/**
 * "Print or save as PDF" — the browser's own print dialog, with the page's print rules
 * (verify.css) keeping only the verdict and the certificate. Lets an HR reader keep a
 * dated copy of the check on file. Needs JavaScript; the page works without it.
 */
export function PrintButton() {
  return (
    <button type="button" className="cv-ghost" onClick={() => window.print()}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z" strokeLinejoin="round" />
      </svg>
      Print or save as PDF
    </button>
  );
}
