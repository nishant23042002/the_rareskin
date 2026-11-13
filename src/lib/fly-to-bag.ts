/**
 * "It went in the bag": a small drop of the scent's colour lifts off the button that
 * was pressed, arcs up to the bag icon in the header, and lands with a short catch
 * (the icon swells). It is the one animation that tells you WHERE the thing went.
 *
 * Plain Web Animations on one throwaway element, so it costs nothing until it runs,
 * paints on the compositor (transform + opacity only) and removes itself. It is
 * skipped when:
 *  - the shopper asked for reduced motion,
 *  - the bag icon is not on screen (a header tucked away, a drawer covering it),
 *  - the browser has no Web Animations.
 * In all of those the toast and the count already say it was added.
 */

const TARGET = "[data-bag-target]";
const DURATION = 640;

interface FlyOptions {
  /** the drop's colour; defaults to the brand gilt */
  color?: string;
}

/** a point on a quadratic Bezier, t in 0..1 */
function bezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function visibleTarget(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(TARGET)) {
    const r = el.getBoundingClientRect();
    const inView = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    if (inView && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

export function flyToBag(from: Element | null, opts: FlyOptions = {}): void {
  try {
    if (typeof window === "undefined" || !from) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof Element.prototype.animate !== "function") return;

    const target = visibleTarget();
    if (!target) return;

    const a = from.getBoundingClientRect();
    const icon = target.querySelector("svg") ?? target;
    const b = icon.getBoundingClientRect();
    if (a.width === 0 || b.width === 0) return;

    const size = 16;
    const x0 = a.left + a.width / 2 - size / 2;
    const y0 = a.top + a.height / 2 - size / 2;
    const x2 = b.left + b.width / 2 - size / 2;
    const y2 = b.top + b.height / 2 - size / 2;
    // the arc bows upward, more the further it has to travel
    const x1 = (x0 + x2) / 2;
    const y1 = Math.min(y0, y2) - Math.min(140, 40 + Math.abs(x2 - x0) * 0.18);

    const color = opts.color ?? "#d89a4d";
    const drop = document.createElement("span");
    drop.setAttribute("aria-hidden", "true");
    Object.assign(drop.style, {
      position: "fixed",
      left: "0",
      top: "0",
      zIndex: "2147483000",
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      pointerEvents: "none",
      background: `radial-gradient(circle at 32% 30%, #fff8 0, transparent 46%), ${color}`,
      boxShadow: `0 0 0 1px #0001, 0 6px 14px -4px ${color}`,
      willChange: "transform, opacity",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(drop);

    const STEPS = 22;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const x = bezier(x0, x1, x2, t);
      const y = bezier(y0, y1, y2, t);
      // swells a little at the start, then shrinks into the icon
      const s = t < 0.18 ? 1 + t * 2.2 : 1.4 - (t - 0.18) * (1.4 - 0.32) / 0.82;
      frames.push({
        transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`,
        opacity: t > 0.9 ? 1 - (t - 0.9) * 6 : 1,
      });
    }

    const run = drop.animate(frames, { duration: DURATION, easing: "cubic-bezier(0.4, 0, 0.5, 1)", fill: "forwards" });
    const land = () => {
      drop.remove();
      target.classList.remove("rh-catch");
      // restart the catch if one is already playing
      void target.offsetWidth;
      target.classList.add("rh-catch");
      window.setTimeout(() => target.classList.remove("rh-catch"), 700);
    };
    run.onfinish = land;
    run.oncancel = () => drop.remove();
  } catch {
    /* decorative: never let it break the add */
  }
}
