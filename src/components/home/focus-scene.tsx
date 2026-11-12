"use client";

import { useEffect, useRef } from "react";

import { focusSceneSrc, type FocusScene as Scene } from "@/config/focus-scenes";

/**
 * The picture of a fragrance in the In Focus section, made to answer the pointer.
 *
 *  - It is laid on the dark section with `mix-blend-mode: screen` (the black of the picture is the section's onyx; the glass lets the
 *    section's glow through), so the layers below must not form a stacking context of their own: the root has no transform or filter.
 *  - POINTER (a mouse, anywhere over the section): the picture leans toward it and drifts a few pixels against it, a pool of light on the
 *    glass follows; it breathes very slowly when idle. Nothing moves under reduced motion or on a touch screen.
 *  - NOTES: a dot on each ingredient (the notes, pinned to what they are made of); hover, focus or tap shows its name. Keyboard reachable.
 *  - A glint crosses the glass now and then, and once when the fragrance comes into focus.
 * Styles: `.rh-fscene*` in `app/home.css`.
 */
export function FocusScene({ scene, name, active }: { scene: Scene; name: string; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const host = el.closest<HTMLElement>(".rh-focus");
    if (!host) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", x.toFixed(3));
        el.style.setProperty("--py", y.toFixed(3));
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
  }, [active]);

  return (
    <div ref={ref} className={`rh-fscene${active ? " is-active" : ""}`}>
      <div className="rh-fscene__layer rh-fscene__pic">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={focusSceneSrc(scene, 1500)}
          srcSet={`${focusSceneSrc(scene, 750)} 750w, ${focusSceneSrc(scene, 1500)} 1500w`}
          sizes="(min-width: 900px) 420px, 84vw"
          alt={scene.alt}
          width={scene.width}
          height={scene.height}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <i className="rh-fscene__glint" aria-hidden="true" />
      </div>
      <div className="rh-fscene__layer rh-fscene__hots">
        {scene.hotspots.map((h) => (
          <button
            key={h.label}
            type="button"
            className="rh-fscene__hot"
            data-side={h.side}
            data-half={h.x < 50 ? "l" : "r"}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            tabIndex={active ? 0 : -1}
            aria-label={`${name}: note, ${h.label}`}
          >
            <i aria-hidden="true" />
            <span>{h.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
