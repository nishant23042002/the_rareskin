"use client";

import { useEffect, useRef, useState } from "react";

import { RhIcon, type RhIconName } from "@/components/ui/rh-icon";

/**
 * The base of the sidebar — only the reassurances a shopper needs before they
 * buy, kept to three quiet rows: one line of promises, the payment marks (hover
 * or tap one to read how it works), and where it is made with a live Roha clock.
 * Topped by the counter's signature tri-juice rule that draws in as the menu
 * opens.
 */

const TRUST: { icon: RhIconName; label: string }[] = [
  { icon: "truck", label: "Free shipping" },
  { icon: "cash", label: "Cash on delivery" },
  { icon: "returns", label: "7-day returns" },
];

const NOTE_DEFAULT = "Secured by Razorpay";
const NOTE_CARD = "Card details never reach us";

const PAY: { src: string; label: string; note: string }[] = [
  { src: "/pay/visa.svg", label: "Visa", note: NOTE_CARD },
  { src: "/pay/mastercard.svg", label: "Mastercard", note: NOTE_CARD },
  { src: "/pay/rupay.svg", label: "RuPay", note: NOTE_CARD },
  { src: "/pay/bhim.svg", label: "UPI", note: "GPay · PhonePe · Paytm · BHIM" },
];

const IST = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function RohaClock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(IST.format(new Date()).toLowerCase());
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="rh-roha" title="Where it is made">
      <i className="rh-pulse" aria-hidden="true" />
      <span>Roha{now ? ` · ${now}` : ""}</span>
    </span>
  );
}

export function MenuFooter() {
  const [pressed, setPressed] = useState<string | null>(null);
  const [text, setText] = useState(NOTE_DEFAULT);
  const [swap, setSwap] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // fade the line out, change it, fade it back in
  function say(next: string) {
    window.clearTimeout(timer.current);
    setSwap(true);
    timer.current = window.setTimeout(() => {
      setText(next);
      setSwap(false);
    }, 150);
  }

  const noteFor = (label: string | null) =>
    PAY.find((p) => p.label === label)?.note ?? NOTE_DEFAULT;

  return (
    <div className="rh-sb__foot">
      <div className="rh-sb__rule" aria-hidden="true" />

      <ul className="rh-sb__trust">
        {TRUST.map((t) => (
          <li key={t.label}>
            <RhIcon name={t.icon} />
            <b>{t.label}</b>
          </li>
        ))}
      </ul>

      <div className="rh-sb__pay">
        <div
          className="rh-pm-row"
          role="group"
          aria-label="Payment methods"
          onPointerLeave={() => say(noteFor(pressed))}
        >
          {PAY.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rh-pm"
              aria-label={p.label}
              aria-pressed={pressed === p.label}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") say(p.note);
              }}
              onFocus={() => say(p.note)}
              onBlur={() => say(noteFor(pressed))}
              onClick={() => {
                const next = pressed === p.label ? null : p.label;
                setPressed(next);
                say(noteFor(next));
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" width={28} height={28} />
            </button>
          ))}
        </div>
        <p
          className={`rh-pm-note${swap ? " is-swap" : ""}`}
          aria-live="polite"
        >
          <RhIcon name="lock" />
          <span>{text}</span>
        </p>
      </div>

      <div className="rh-sb__base">
        <span className="rh-sb__made">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pay/india.svg" alt="" width={19} height={13} />
          Made in India
        </span>
        <RohaClock />
      </div>
    </div>
  );
}
