"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Click-and-drag (mouse) and swipe (touch) along the X axis — an enhancement
 * only: every control it sits on (tabs, arrows, keys, native scrolling) still
 * does the same job without it.
 *
 *  - a 7px threshold before it takes over; a mostly-vertical move bails out so
 *    the page can still scroll
 *  - pointer capture while dragging, and the click that follows a drag is
 *    swallowed so it cannot open the link under the pointer
 *  - `mouseOnly` leaves touch to the browser's native scrolling / swiping
 *
 * Options may change every render (they are read through a ref).
 */
export interface DragXOptions {
  mouseOnly?: boolean;
  /** return false to ignore a gesture (e.g. layout does not scroll sideways) */
  enabled?: () => boolean;
  /** return true to ignore a gesture that began on this target */
  skip?: (e: PointerEvent) => boolean;
  start?: () => void;
  move?: (dx: number) => void;
  /** `dx` px dragged, `velocity` in px/ms (signed) */
  end?: (dx: number, velocity: number) => void;
  cancel?: () => void;
}

export function useDragX<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: DragXOptions,
): void {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // a dragged <a>/<img> would start the browser's own ghost-image drag
    el.querySelectorAll("a, img").forEach((n) =>
      n.setAttribute("draggable", "false"),
    );

    let sx = 0;
    let sy = 0;
    let t0 = 0;
    let id: number | null = null;
    let live = false;
    let moved = false;
    let lastDx = 0;

    const down = (e: PointerEvent) => {
      const o = opts.current;
      if (e.button !== 0 || live) return;
      if (o.mouseOnly && e.pointerType !== "mouse") return;
      if (o.enabled && !o.enabled()) return;
      if (o.skip && o.skip(e)) return;
      sx = e.clientX;
      sy = e.clientY;
      t0 = Date.now();
      live = true;
      moved = false;
      id = e.pointerId;
      lastDx = 0;
    };

    const move = (e: PointerEvent) => {
      if (!live || e.pointerId !== id) return;
      const o = opts.current;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          live = false;
          return;
        }
        moved = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* capture is best-effort */
        }
        el.classList.add("is-dragging");
        window.getSelection?.()?.removeAllRanges();
        o.start?.();
      }
      lastDx = dx;
      o.move?.(dx);
    };

    const up = (e: PointerEvent) => {
      if (!live || e.pointerId !== id) return;
      live = false;
      if (!moved) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      el.classList.remove("is-dragging");
      const dx = lastDx;
      const v = dx / Math.max(1, Date.now() - t0);
      // the click that follows a drag must not open the link under the pointer
      const stop = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      el.addEventListener("click", stop, true);
      window.setTimeout(() => el.removeEventListener("click", stop, true), 0);
      opts.current.end?.(dx, v);
    };

    const cancel = (e: PointerEvent) => {
      if (!live || e.pointerId !== id) return;
      live = false;
      if (moved) {
        el.classList.remove("is-dragging");
        opts.current.cancel?.();
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.classList.remove("is-dragging");
    };
  }, [ref]);
}
