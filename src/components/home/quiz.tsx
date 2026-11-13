"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flacon } from "@/components/ui/flacon";
import { pdpCover } from "@/lib/pdp-images";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { QUIZ, tallyWinner } from "@/lib/quiz";
import { formatINR, type Fragrance, type FragranceSlug } from "@/lib/catalog";
import { track } from "@/lib/analytics";

const STEPS = QUIZ.length; // 3 questions; step === STEPS -> result

export function Quiz({ fragrances }: { fragrances: Fragrance[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FragranceSlug[]>([]);
  const [stageH, setStageH] = useState<number>();
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // keep the stage exactly as tall as the visible panel — no jump on advance
  useEffect(() => {
    const el = panelRefs.current[step];
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      setStageH(el.offsetHeight);
    };
    raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [step]);

  function pick(key: FragranceSlug) {
    const next = [...answers.slice(0, step), key];
    setAnswers(next);
    setStep((s) => Math.min(s + 1, STEPS));
    // GA4: the last answer produces the result — which fragrance the quiz points to
    if (next.length >= STEPS) {
      const result = tallyWinner(next);
      if (result) track("quiz_complete", { quiz_result: result });
    }
  }

  function retake() {
    setAnswers([]);
    setStep(0);
  }

  const winner = step === STEPS ? tallyWinner(answers) : null;
  const match = winner
    ? (fragrances.find((f) => f.slug === winner) ?? null)
    : null;
  const filled = step >= STEPS ? STEPS : step + 1;

  return (
    <section id="quiz" className="rh-quiz" aria-labelledby="quiz-h">
      <div className="rh-wrap rh-quiz__grid">
        <div className="rh-quiz__intro">
          <p className="rh-eyebrow">Not sure which</p>
          <h2 className="rh-h2 rh-h2--sentence" id="quiz-h">
            Three questions. One that is yours.
          </h2>
          <p className="rh-lede">
            A short way in. Answer honestly and we&rsquo;ll point you to the one
            most people like you keep wearing.
          </p>
          <div className="rh-quiz__bar" aria-hidden="true">
            {Array.from({ length: STEPS }).map((_, i) => (
              <i key={i} className={i < filled ? "rh-on" : undefined} />
            ))}
          </div>
        </div>

        <div
          className="quiz-stage min-h-[320px] rounded-[3px] border border-line-2 bg-surface"
          style={stageH ? { height: stageH } : undefined}
        >
          {QUIZ.map((q, i) => (
            <div
              key={q.prompt}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              data-active={step === i}
              className="quiz-panel p-[clamp(26px,4vw,46px)]"
              inert={step !== i}
            >
              <p className="serif-italic max-w-[22ch] text-[clamp(1.5rem,3vw,2.05rem)] leading-[1.3]">
                {q.prompt}
              </p>
              <div className="mt-[clamp(20px,3vw,32px)] grid gap-2.5">
                {q.options.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => pick(opt.key)}
                    disabled={step !== i}
                    className="quiz-opt flex w-full items-center gap-3.5 rounded-[2px] border border-line-2 px-[17px] py-[15px] text-left text-[14px] text-ink transition-[border-color,background-color,transform] duration-150 hover:border-ink hover:bg-surface-2 active:scale-[0.99]"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div
            ref={(el) => {
              panelRefs.current[STEPS] = el;
            }}
            data-active={step === STEPS}
            data-result
            className="quiz-panel p-[clamp(26px,4vw,46px)]"
            inert={step !== STEPS}
          >
            {match && (
              <>
                <p className="text-[10px] tracking-[0.22em] text-ink-3 uppercase">
                  Your match
                </p>
                <div className="mt-4 grid items-center gap-6 sm:grid-cols-[clamp(150px,17vw,200px)_1fr] sm:gap-8">
                  {(() => {
                    // the product page's FIRST picture (the packshot), in a tile that crops in on the bottle: the same on a phone and on a wide screen
                    const cover = pdpCover(match.slug, match.images, match.name);
                    return cover ? (
                      <span className="rh-quiz__pic mx-auto block w-full max-w-[220px] sm:mx-0 sm:max-w-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cover.thumb}
                          srcSet={cover.srcSet}
                          sizes="(min-width: 640px) 200px, 220px"
                          alt={`${match.name}, extrait de parfum`}
                          width={640}
                          height={736}
                          decoding="async"
                        />
                      </span>
                    ) : (
                      <span
                        className="mx-auto block w-full max-w-[120px] sm:mx-0"
                        style={{ filter: `drop-shadow(0 22px 28px ${match.juice}44)` }}
                      >
                        <Flacon fragrance={match.slug} />
                      </span>
                    );
                  })()}
                  <div>
                    <h3 className="text-[clamp(1.9rem,5vw,2.7rem)] tracking-[0.1em]">
                      {match.name}
                    </h3>
                    <p className="mt-2.5 text-[9.5px] tracking-[0.14em] text-ink-3 uppercase">
                      {match.title}
                    </p>
                    <p className="serif-italic mt-3 max-w-[40ch] text-[1.1rem] leading-[1.5] text-ink-2">
                      {match.poem}
                    </p>
                    <p className="mt-3.5 text-[9px] tracking-[0.1em] text-ink-3 uppercase">
                      {match.notes.join(" · ")}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-2.5">
                      <AddToBagButton
                        sku={match.sku}
                        name={match.name}
                        price={match.price}
                        mrp={match.mrp}
                        fragrance={match.slug}
                        href={`/fragrances/${match.slug}`}
                        meta={`Extrait · ${match.volumeMl} ml`}
                        label={`Add to bag · ${formatINR(match.price)}`}
                        list="Quiz result"
                        variant="solid"
                        size="sm"
                      />
                      <Button
                        href={`/fragrances/${match.slug}`}
                        variant="onDark"
                        size="sm"
                      >
                        Read {match.name}
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={retake}
                      className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[0.12em] text-ink-3 uppercase transition-colors hover:text-ink"
                    >
                      <span aria-hidden>&larr;</span> Retake the quiz
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
