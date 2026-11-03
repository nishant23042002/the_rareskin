/**
 * The "what's actually in the bottle" band — RARESKIN's answer to the
 * certification row every Indian fragrance brand runs, written as plain claims
 * rather than badges. Sits after "Why extrait" so it reads as the substance
 * behind the argument.
 *
 * NOTE (pre-launch): confirm every line here with the perfumer / QA before the
 * store goes live — "no added phthalates" and IFRA compliance in particular.
 * The animal-testing position is deliberately left off until it's decided
 * (see the pre-launch checklist in README.md).
 */

const CLAIMS: { label: string; sub: string }[] = [
  {
    label: "Extrait concentration",
    sub: "More perfume oil, less alcohol. Two sprays hold the day.",
  },
  {
    label: "IFRA-compliant",
    sub: "Every composition made to the fragrance industry’s safety standard.",
  },
  {
    label: "No added phthalates",
    sub: "Or synthetic colourants. The juice is the colour you see.",
  },
  {
    label: "Bottled in India",
    sub: "Composed, filled and finished in Roha, Maharashtra.",
  },
];

export function MadeDeliberately() {
  return (
    <section className="rh-trust" aria-labelledby="trust-h">
      <div className="rh-wrap">
        <div className="rh-trust__head">
          <p className="rh-eyebrow">Made deliberately</p>
          <h2 className="rh-serif" id="trust-h">
            Nothing in the bottle that doesn&rsquo;t need to be there.
          </h2>
        </div>
        <div className="rh-trust__grid">
          {CLAIMS.map((c) => (
            <div key={c.label}>
              <h3>{c.label}</h3>
              <p>{c.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
