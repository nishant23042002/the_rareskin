import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageIntro } from "./page-intro";
import { ReadingProgress } from "./reading-progress";
import { SectionNav } from "./section-nav";

const slug = (h: string) =>
  h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Shell for the policy pages. Content is real and specific to THE RARESKIN;
 * a final legal review is still recommended before launch (standard practice
 * for any store), but these are working policies, not scaffolds.
 *
 * From 1024px a table of contents sits beside the text and follows the section in view; a fine
 * line under the header fills as the page is read, each section is drawn in by a hairline and rises
 * into view (all light: `app/pages.css`, the motion layer's reveals, one IntersectionObserver).
 */
export function LegalDoc({
  title,
  path,
  updated,
  intro,
  sections,
}: {
  title: string;
  path: string;
  updated: string;
  intro?: ReactNode;
  sections: { h: string; body: ReactNode }[];
}) {
  return (
    <main id="main" data-reveal>
      <ReadingProgress />
      <PageIntro
        eyebrow="Policy"
        title={title}
        crumb={{ name: title, path }}
      />

      <Container className="max-w-[900px] pb-[clamp(56px,10vw,110px)]">
        <div className="lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-x-[clamp(36px,5vw,64px)]">
          <SectionNav
            variant="toc"
            label="On this page"
            items={sections.map((s) => ({ id: slug(s.h), label: s.h }))}
          />

          <div className="max-w-[760px]">
            <p
              data-rv
              className="mb-8 text-[11px] tracking-[0.06em] text-ink-3 uppercase"
            >
              Last updated: {updated}
            </p>

            {intro ? (
              <div
                data-rv
                className="mb-10 space-y-3 text-[14.5px] leading-[1.8] text-ink-2"
              >
                {intro}
              </div>
            ) : null}

            <div className="space-y-10">
              {sections.map((s) => (
                <section
                  key={s.h}
                  data-rv
                  // lets the footer deep-link a section, e.g. /privacy#cookies
                  id={slug(s.h)}
                  className="pg-sec scroll-mt-[calc(var(--announce-h)+var(--header-h)+24px)]"
                >
                  <h2 className="mb-3 text-[13px] font-normal tracking-[0.08em] text-ink uppercase">
                    {s.h}
                  </h2>
                  <div className="space-y-3 text-[14px] leading-[1.8] text-ink-2 [&_a:hover]:text-ink [&_a]:underline [&_a]:decoration-line-2 [&_a]:underline-offset-2 [&_li]:pl-1 [&_ul]:list-[square] [&_ul]:space-y-1.5 [&_ul]:pl-5">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>

            <p
              data-rv
              className="mt-12 border-t border-line pt-7 text-[13px] leading-[1.7] text-ink-2"
            >
              Questions about this policy?{" "}
              <Link
                href="/contact"
                className="underline decoration-line-2 underline-offset-2 hover:text-ink"
              >
                Write to us
              </Link>
              .
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
