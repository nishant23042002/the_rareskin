"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * The small amount of script behind the "alive" feel (the styling is all in
 * `app/motion.css`; read its rules first). Three jobs, each gated:
 *
 *  - scroll reveals    eyebrows, headlines, ledes, buttons and cards below the first
 *                      screen rise in once, staggered, as they enter the viewport.
 *                      One IntersectionObserver, no scroll listener. Anything already
 *                      on screen is never hidden, so there is no flash and no layout
 *                      shift (opacity + transform only).
 *  - pointer effects   a mouse only (fine pointer, 900px+): cards tilt a few degrees
 *                      toward the pointer under a soft light, buttons lean toward it.
 *                      One delegated `pointermove`, one write per frame, `will-change`
 *                      only while a card is hovered.
 *  - chip pulse        a soft pulse on the tab / swatch / option that was just chosen.
 *
 * Nothing runs under `prefers-reduced-motion: reduce`; the page is then exactly the
 * static one the server rendered. Phones and tablets get the reveals and the pulse
 * (opacity / transform only) and none of the pointer work.
 */

/** the cards that tilt: keep in step with the `:is(...)` list in motion.css */
const TILT = ".rh-tile__media, .rh-offer__tile, .rh-ig__tile, [data-tilt]";
/** the buttons that lean toward the pointer */
const MAGNET = ".rh-btn:not(.rh-btn--block)";
/** the selectable chips that pulse when chosen */
const CHIP = '.rh-q-opt, .rh-ticket__chips a, [role="tab"], [role="radio"]';
/** where reveals happen: the homepage sections under the hero, or anything marked */
const REVEAL_ROOT = ".rh-main > *:not(.rh-hero), [data-reveal]";
/** what rises in inside them */
const REVEAL_ITEM =
  ".rh-eyebrow, .rh-display, .rh-h2, .rh-sub, .rh-lede, .rh-btn, .rh-link-u, .rh-tile, [data-rv]";
/** never touched: the ticket runs its own sequence, drawers and dialogs are not page content */
const REVEAL_SKIP = ".rh-ticket, dialog, [data-no-motion]";

const MAX_TILT = 4; // degrees
const MAX_PULL = 3; // px

function setupReveal(): () => void {
  if (!("IntersectionObserver" in window)) return () => {};

  const timers = new Set<number>();

  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries
        .filter((e) => e.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        );
      hit.forEach((entry, i) => {
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        const delay = Math.min(i, 7) * 80;
        el.style.setProperty("--rv-d", `${delay}ms`);
        requestAnimationFrame(() => el.classList.add("is-in"));
        // once it has landed, hand the element back to its own transitions (hover lift, etc.)
        timers.add(
          window.setTimeout(() => {
            el.classList.remove("rv", "is-in");
            el.style.removeProperty("--rv-d");
          }, delay + 1300),
        );
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
  );

  const scan = () => {
    const vh = window.innerHeight;
    document.querySelectorAll<HTMLElement>(REVEAL_ROOT).forEach((root) => {
      root.querySelectorAll<HTMLElement>(REVEAL_ITEM).forEach((el) => {
        if (el.dataset.rvSeen) return;
        el.dataset.rvSeen = "1";
        if (el.closest(REVEAL_SKIP)) return;
        // on screen already (or scrolled past): leave it exactly as rendered
        if (el.getBoundingClientRect().top < vh * 0.92) return;
        el.classList.add("rv");
        io.observe(el);
      });
    });
  };

  scan();
  // a client navigation mounts the new page a beat after the route changes
  timers.add(window.setTimeout(scan, 600));
  timers.add(window.setTimeout(scan, 1600));

  return () => {
    io.disconnect();
    timers.forEach((t) => window.clearTimeout(t));
    document.querySelectorAll<HTMLElement>(".rv").forEach((el) => {
      el.classList.remove("rv", "is-in");
      el.style.removeProperty("--rv-d");
    });
    document.querySelectorAll<HTMLElement>("[data-rv-seen]").forEach((el) => {
      delete el.dataset.rvSeen;
    });
  };
}

function setupChips(): () => void {
  const onClick = (e: MouseEvent) => {
    const t = e.target as Element | null;
    const chip = t && t.closest ? t.closest<HTMLElement>(CHIP) : null;
    if (!chip) return;
    chip.classList.remove("is-pop");
    void chip.offsetWidth; // restart the animation if it is already running
    chip.classList.add("is-pop");
    chip.addEventListener("animationend", () => chip.classList.remove("is-pop"), { once: true });
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

function glowOf(card: HTMLElement): void {
  if (card.querySelector(":scope > .rh-glow")) return;
  const g = document.createElement("i");
  g.className = "rh-glow";
  g.setAttribute("aria-hidden", "true");
  card.appendChild(g);
}

function setupPointerFx(): () => void {
  let card: HTMLElement | null = null;
  let magnet: HTMLElement | null = null;
  let raf = 0;
  let px = 0;
  let py = 0;

  const leaveCard = () => {
    if (!card) return;
    card.classList.remove("is-tilt");
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
    card = null;
  };
  const leaveMagnet = () => {
    if (!magnet) return;
    magnet.style.removeProperty("--bx");
    magnet.style.removeProperty("--by");
    magnet = null;
  };

  const frame = () => {
    raf = 0;
    if (card) {
      const r = card.getBoundingClientRect();
      if (r.width && r.height) {
        const nx = Math.min(Math.max((px - r.left) / r.width, 0), 1);
        const ny = Math.min(Math.max((py - r.top) / r.height, 0), 1);
        card.style.setProperty("--ry", `${((nx - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${(-(ny - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
        // the light is positioned in px from the card's own corner
        card.style.setProperty("--gx", `${(px - r.left).toFixed(1)}px`);
        card.style.setProperty("--gy", `${(py - r.top).toFixed(1)}px`);
      }
    }
    if (magnet) {
      const r = magnet.getBoundingClientRect();
      if (r.width && r.height) {
        const dx = (px - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (py - (r.top + r.height / 2)) / (r.height / 2);
        const clamp = (v: number) => Math.min(Math.max(v, -1), 1) * MAX_PULL;
        magnet.style.setProperty("--bx", `${clamp(dx).toFixed(2)}px`);
        magnet.style.setProperty("--by", `${clamp(dy).toFixed(2)}px`);
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const t = e.target as Element | null;
    if (!t || !t.closest) return;

    const nextCard = t.closest<HTMLElement>(TILT);
    // a card that is being dragged (the tile carousels) does not tilt
    const tiltable = nextCard && !nextCard.classList.contains("is-dragging") ? nextCard : null;
    if (tiltable !== card) {
      leaveCard();
      if (tiltable) {
        card = tiltable;
        glowOf(tiltable);
        tiltable.classList.add("is-tilt");
      }
    }

    const nextMagnet = t.closest<HTMLElement>(MAGNET);
    if (nextMagnet !== magnet) {
      leaveMagnet();
      magnet = nextMagnet;
    }

    px = e.clientX;
    py = e.clientY;
    if ((card || magnet) && !raf) raf = requestAnimationFrame(frame);
  };
  const reset = () => {
    leaveCard();
    leaveMagnet();
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  // the pointer leaving the window, or the tab losing focus, must not strand a tilted card
  document.documentElement.addEventListener("pointerleave", reset);
  window.addEventListener("blur", reset);

  return () => {
    document.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", reset);
    window.removeEventListener("blur", reset);
    cancelAnimationFrame(raf);
    reset();
    document.querySelectorAll(".rh-glow").forEach((g) => g.remove());
  };
}

export function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
    let undo: Array<() => void> = [];

    const run = () => {
      undo.forEach((f) => f());
      undo = [];
      if (!motionOk.matches) return;
      undo.push(setupReveal(), setupChips());
      if (mouse.matches) undo.push(setupPointerFx());
    };

    run();
    motionOk.addEventListener("change", run);
    mouse.addEventListener("change", run);
    return () => {
      motionOk.removeEventListener("change", run);
      mouse.removeEventListener("change", run);
      undo.forEach((f) => f());
    };
    // re-run on a client navigation: the new page's sections need observing
  }, [pathname]);

  return null;
}
