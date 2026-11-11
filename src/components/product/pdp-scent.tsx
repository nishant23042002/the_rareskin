"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

/**
 * The product page's "what is it like" section, in two parts that share one stone ground:
 *
 *  - the scent in three acts. A segmented control (Arrive / Linger / Stay) over one panel that
 *    shows the notes of the act you chose, large, with a rail that fills as you go deeper.
 *    One act at a time keeps a lot of information calm; the arrow keys move between them
 *    (a proper tablist). All the notes are also in the page's Product JSON-LD.
 *  - the facts of how it wears: concentration, sillage, best worn, longevity. Longevity and
 *    sillage are marked indicative: the brand states them that way everywhere (FAQ, README)
 *    until wear tests are complete.
 *
 * Styles: `.pdp-*` in `app/pdp.css`. `--frag` (set by the page) is the fragrance's colour.
 */

type Act = { key: string; label: string; hint: string; notes: string[] };

const split = (s: string): string[] =>
  s
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

export function PdpScent({
  name,
  impression,
  mood,
  notesByPhase,
  longevity,
  sillage,
  wearOccasion,
  volumeMl,
}: {
  name: string;
  impression: string;
  mood: string[];
  notesByPhase: { arrive: string; linger: string; stay: string };
  /** 0 to 4, indicative */
  longevity: number;
  sillage: string;
  wearOccasion: string;
  volumeMl: number;
}) {
  const acts: Act[] = [
    { key: "arrive", label: "Arrive", hint: "What you meet first", notes: split(notesByPhase.arrive) },
    { key: "linger", label: "Linger", hint: "The heart, as it settles on skin", notes: split(notesByPhase.linger) },
    { key: "stay", label: "Stay", hint: "What is left as the hours go on", notes: split(notesByPhase.stay) },
  ];
  const [i, setI] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function onKey(e: KeyboardEvent) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + acts.length) % acts.length;
    setI(n);
    tabs.current[n]?.focus();
  }

  const sillageLabel = sillage.replace(/\s*\[indicative\]/i, "").trim();
  const act = acts[i];

  return (
    <section className="pdp-scent" aria-labelledby={`${id}-h`}>
      <Container className="max-w-[1280px]">
        <div className="pdp-scent__grid">
          <div className="pdp-scent__lead">
            <p className="eyebrow">The scent</p>
            <h2 className="pdp-scent__h" id={`${id}-h`}>
              {impression}
            </h2>
            {mood.length > 0 && (
              <ul className="pdp-scent__mood" aria-label={`${name} in three words`}>
                {mood.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
            <p className="pdp-scent__lede">
              Three acts, one after the other, as it moves from the first spray to what stays on
              the skin. Choose one.
            </p>
          </div>

          <div className="pdp-acts">
            <div className="pdp-acts__tabs" role="tablist" aria-label="The three acts of the scent" onKeyDown={onKey}>
              {acts.map((a, n) => (
                <button
                  key={a.key}
                  ref={(el) => {
                    tabs.current[n] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-t${n}`}
                  aria-selected={i === n}
                  aria-controls={`${id}-p`}
                  tabIndex={i === n ? 0 : -1}
                  className="pdp-act"
                  onClick={() => setI(n)}
                >
                  <span className="pdp-act__n">{String(n + 1).padStart(2, "0")}</span>
                  <span className="pdp-act__l">{a.label}</span>
                </button>
              ))}
            </div>

            <div className="pdp-panel" role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-t${i}`}>
              {/* keyed by the act, so the notes rise in again each time you switch */}
              <div key={act.key}>
                <p className="pdp-panel__hint">{act.hint}</p>
                <ul className="pdp-panel__notes">
                  {act.notes.map((n, k) => (
                    <li key={n} className="pdp-panel__note" style={{ "--i": k } as CSSProperties}>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pdp-rail" aria-hidden="true" style={{ "--p": (i + 1) / acts.length } as CSSProperties}>
              <i />
            </div>
          </div>

          <dl className="pdp-facts pdp-scent__facts">
            <div className="pdp-fact">
              <dt>Concentration</dt>
              <dd>Extrait de Parfum</dd>
              <small>More perfume oil, less alcohol. {volumeMl} ml.</small>
            </div>
            <div className="pdp-fact">
              <dt>Sillage</dt>
              <dd>{sillageLabel}</dd>
              <small>How far it carries. Indicative.</small>
            </div>
            <div className="pdp-fact">
              <dt>Best worn</dt>
              <dd>{wearOccasion}</dd>
              <small>Two or three sprays to pulse points.</small>
            </div>
            <div className="pdp-fact">
              <dt>Longevity</dt>
              <dd>
                <span className="pdp-bars" role="img" aria-label={`${longevity} out of 4, indicative`}>
                  {[0, 1, 2, 3].map((b) => (
                    <i key={b} className={cn(b < longevity && "on")} />
                  ))}
                </span>
              </dd>
              <small>Indicative, until wear tests are complete.</small>
            </div>
          </dl>
        </div>
      </Container>
    </section>
  );
}
