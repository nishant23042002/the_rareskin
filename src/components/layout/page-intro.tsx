import type { CSSProperties, ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { breadcrumbJsonLd } from "@/lib/seo";

/**
 * Shared top for the standalone content pages — clears the fixed header and
 * sets a consistent eyebrow / headline / lede rhythm. Pass `crumb` to emit a
 * BreadcrumbList (Home › this page) for answer engines.
 *
 * It arrives rather than appears: the eyebrow fades up, the headline rises out of a mask word by
 * word, the lede follows and a short brass line is drawn (CSS keyframes in `app/pages.css`: opacity
 * and transform on five elements, no script, none under reduced motion).
 */
export function PageIntro({
  eyebrow,
  title,
  lede,
  crumb,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  crumb?: { name: string; path: string };
  children?: ReactNode;
}) {
  return (
    <>
      {crumb ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd([crumb])),
          }}
        />
      ) : null}
      <Container className="max-w-[900px] pt-[calc(var(--announce-h)+var(--header-h)+clamp(2rem,6vw,4.5rem))] pb-[clamp(28px,5vw,44px)]">
        {eyebrow ? <p className="eyebrow pg-eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="text-[clamp(1.9rem,4.6vw,3rem)] leading-[1.08] text-balance">
          {title.split(" ").map((w, i) => (
            <span key={i}>
              {i > 0 ? " " : null}
              <span className="pg-w">
                <span style={{ "--i": i } as CSSProperties}>{w}</span>
              </span>
            </span>
          ))}
        </h1>
        {lede ? (
          <p className="pg-lede serif-italic mt-4 max-w-[54ch] text-[clamp(1.05rem,2vw,1.35rem)] leading-[1.5] text-ink-2">
            {lede}
          </p>
        ) : null}
        <span className="pg-rule" aria-hidden="true" />
        {children}
      </Container>
    </>
  );
}
