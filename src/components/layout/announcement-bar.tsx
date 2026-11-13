"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { RhIcon } from "@/components/ui/rh-icon";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrolled } from "@/hooks/use-scrolled";
import { formatINR } from "@/lib/catalog";

/**
 * Announcement bar — one message at a time, calmly rotating: a bold lead, a
 * hairline, then the detail. Each message can link somewhere. Prev / next
 * arrows (≥600px), a pause / play control (WCAG 2.2.2), pause on hover and
 * focus, and a thin brass line that fills the message's time on screen.
 * Collapses to nothing once the visitor scrolls (a first-impression element, not
 * a fixture) and does not return until they are back at the top.
 *
 * Messages come from Site Settings → `announcements`; write them as
 * `Lead | detail` to get the two-part treatment (no `|` = a single bold line).
 * With none configured the built-in `fallback` set is used.
 */

interface AnnouncementItem {
  text: string;
  href?: string;
}

interface Slot {
  lead: ReactNode;
  detail?: ReactNode;
  href?: string;
}

const NAV_MS_MIN = 3000;
const NAV_MS_MAX = 12000;

function fallback(
  launch: { price: number; mrp: number } | null,
  setPrice: number | null,
): Slot[] {
  const slots: Slot[] = [];
  if (launch) {
    slots.push({
      lead: "Launch offer",
      detail: (
        <>
          <em>{formatINR(launch.price)}</em>
          {launch.mrp > launch.price && <s>{formatINR(launch.mrp)}</s>}
        </>
      ),
      href: "/#offer",
    });
  }
  slots.push(
    { lead: "Free shipping", detail: "Across India", href: "/#promises" },
    { lead: "Cash on delivery", detail: "Available", href: "/#promises" },
    {
      lead: "Discovery Set",
      detail: setPrice ? `All three for ${formatINR(setPrice)}` : "All three, to try",
      href: "/discovery-set",
    },
    { lead: "Extrait de Parfum", detail: "Nothing lighter", href: "/#why" },
  );
  return slots;
}

function fromSettings(messages: AnnouncementItem[]): Slot[] {
  return messages
    .filter((m) => m.text.trim())
    .map((m) => {
      // "Lead | detail" is the documented form; an em dash with spaces around it
      // ("Launch offer — ₹799") reads the same, so messages written for the old
      // marquee keep their two-part look without being re-entered.
      const [lead, ...rest] = m.text.split(/\s*\|\s*|\s+[—–]\s+/);
      const detail = rest.join(" · ").trim();
      return {
        lead: lead.trim(),
        detail: detail || undefined,
        href: m.href || undefined,
      };
    });
}

function Message({
  slot,
  className,
  active,
}: {
  slot: Slot;
  className: string;
  active: boolean;
}) {
  const inner = (
    <>
      <b>{slot.lead}</b>
      {slot.detail ? (
        <>
          <i aria-hidden="true" />
          <span className="rh-ann__d">{slot.detail}</span>
        </>
      ) : null}
    </>
  );
  const common = {
    className,
    "aria-hidden": !active,
    tabIndex: active ? 0 : -1,
    "data-ga-promo": `Announcement · ${slot.lead}`,
    "data-ga-slot": "announcement-bar",
  } as const;

  if (!slot.href) return <p {...common}>{inner}</p>;
  if (/^https?:\/\//.test(slot.href)) {
    return (
      <a {...common} href={slot.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return (
    <Link {...common} href={slot.href}>
      {inner}
    </Link>
  );
}

export function AnnouncementBar({
  messages,
  rotateSeconds,
  launch = null,
  setPrice = null,
}: {
  messages?: AnnouncementItem[];
  /** Site Settings dial: seconds each message stays up (3–12 honoured) */
  rotateSeconds?: number;
  /** launch price + MRP for the built-in first message */
  launch?: { price: number; mrp: number } | null;
  /** Discovery Set price for the built-in fourth message */
  setPrice?: number | null;
} = {}) {
  const slots = useMemo<Slot[]>(() => {
    const fromAdmin = fromSettings(messages ?? []);
    return fromAdmin.length > 0 ? fromAdmin : fallback(launch, setPrice);
  }, [messages, launch, setPrice]);

  const dur = Math.min(
    NAV_MS_MAX,
    Math.max(NAV_MS_MIN, (rotateSeconds && rotateSeconds >= 3 ? rotateSeconds : 5) * 1000),
  );

  const barRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const scrolled = useScrolled();

  const [{ i, prev }, setPos] = useState({ i: 0, prev: -1 });
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const n = slots.length;
  const cur = n ? ((i % n) + n) % n : 0;
  const running = !reduced && !hover && !userPaused && n > 1 && !scrolled;

  const go = (to: number) =>
    setPos((p) => ({ i: n ? ((to % n) + n) % n : 0, prev: p.i }));

  // calm rotation — re-armed whenever the message or a hold state changes
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => go(cur + 1), dur);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, cur, dur]);

  // collapse once scrolled
  useGSAP(
    () => {
      const bar = barRef.current;
      if (!bar) return;
      const open =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--announce-h")
          .trim() || "38px";
      gsap.to(bar, {
        height: scrolled ? 0 : open,
        opacity: scrolled ? 0 : 1,
        duration: reduced ? 0 : 0.7,
        ease: "power4.out",
        overwrite: "auto",
      });
    },
    { dependencies: [scrolled, reduced] },
  );

  if (n === 0) return null;

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Announcement"
      aria-roledescription="carousel"
      className={`rh-announce${running ? " is-run" : ""}${hover || userPaused ? " is-paused" : ""}`}
      style={{ "--dur": `${dur}ms` } as CSSProperties}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="rh-announce__row">
        <button
          type="button"
          className="rh-announce__nav"
          aria-label="Previous announcement"
          onClick={() => go(cur - 1)}
        >
          <RhIcon name="chevL" />
        </button>
        <div className="rh-announce__stage" aria-live={running ? "off" : "polite"}>
          {slots.map((s, idx) => (
            <Message
              key={idx}
              slot={s}
              active={idx === cur}
              className={`rh-ann${idx === cur ? " is-on" : idx === prev ? " is-out" : ""}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="rh-announce__nav"
          aria-label="Next announcement"
          onClick={() => go(cur + 1)}
        >
          <RhIcon name="chevR" />
        </button>
      </div>
      {!reduced && n > 1 && (
        <button
          type="button"
          className="rh-announce__pause"
          aria-label={userPaused ? "Play announcements" : "Pause announcements"}
          aria-pressed={userPaused}
          onClick={() => setUserPaused((v) => !v)}
        >
          <RhIcon name={userPaused ? "play" : "pause"} />
        </button>
      )}
      {/* remounts per message so the line restarts from empty */}
      <span key={`${cur}-${running}`} className="rh-announce__prog" aria-hidden="true" />
    </div>
  );
}
