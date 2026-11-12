"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useLenis } from "lenis/react";

import { Icon } from "@/components/ui/icon";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/cn";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

/**
 * The product picture viewer: what a click on a PDP photograph opens, the way a good clothing shop does it.
 *
 *  - OPEN: the photograph you clicked lifts out of the page and settles in the middle of the screen (a FLIP:
 *    it starts exactly where it was, framed exactly as the page framed it, and travels to its viewing size)
 *    while the page behind it washes out and the controls arrive one after another.
 *  - BROWSE: swipe / drag, the arrows or the arrow keys, or the thumbnails; one counter, one progress line.
 *  - ZOOM: click (or tap) the picture to zoom in; on a mouse the picture follows the pointer, on a touch screen
 *    you drag it. Click again to come back.
 *  - CLOSE: the cross, Esc, or a click beside the picture. The photograph flies back into its place in the page
 *    (the one you are on, if you moved on), and the page comes back.
 *
 * A native <dialog> hosts it (focus trap, Esc and an inert page for free). Pictures load around the one on show,
 * each as the 640 px file first (already in the browser from the page) and the large file fading in over it.
 * Under reduced motion nothing flies: it fades. Styles: `.pv*` in `app/pdp.css`.
 */

export interface ViewerSlide {
  key: string;
  /** the large file */
  full: string;
  /** the small file, shown at once under the large one */
  thumb: string;
  /** the strip's file */
  tiny: string;
  alt: string;
  /** width / height of the picture */
  ar: number;
}

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const IN_MS = 820;
const OUT_MS = 640;

export function PdpViewer({
  open,
  index,
  slides,
  name,
  originFor,
  onIndexChange,
  onClose,
  onClosed,
}: {
  open: boolean;
  index: number;
  slides: ViewerSlide[];
  name: string;
  /** where the photograph sits in the page right now: the rect it flies from and back to (null: no flight) */
  originFor: () => DOMRect | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** the dialog has finished closing: the page's own picture may show again */
  onClosed: () => void;
}) {
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const dlgRef = useRef<HTMLDialogElement>(null);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [shown, setShown] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const drag = useRef<{ x: number; y: number; from: number } | null>(null);
  const suppressClick = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // the latest callbacks and values, read by the open / close effect without making it re-run
  const live = useRef({ originFor, onClosed, index, slides, reduced });
  useEffect(() => {
    live.current = { originFor, onClosed, index, slides, reduced };
  });

  const count = slides.length;

  /** the keyframes that carry a picture between its place in the page and its viewing place */
  function flight(wrap: HTMLElement, from: DOMRect, ar: number): Keyframe {
    const t = wrap.getBoundingClientRect();
    const fw = from.width;
    const fh = from.height;
    // the page shows the picture the way `object-fit: cover` does: this is the box it fills, centred in the frame
    const coverW = Math.max(fw, fh * ar);
    const coverH = Math.max(fh, fw / ar);
    const s = coverW / t.width;
    const dx = from.left + fw / 2 - (t.left + t.width / 2);
    const dy = from.top + fh / 2 - (t.top + t.height / 2);
    const cx = ((coverW - fw) / 2 / coverW) * 100;
    const cy = ((coverH - fh) / 2 / coverH) * 100;
    return {
      transform: `translate(${dx}px, ${dy}px) scale(${s})`,
      clipPath: `inset(${cy}% ${cx}% ${cy}% ${cx}%)`,
    };
  }

  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    let r1 = 0;
    let r2 = 0;
    let t1 = 0;
    let t2 = 0;
    let anim: Animation | null = null;
    const { reduced: rm } = live.current;

    if (open) {
      if (!dlg.open) dlg.showModal();
      lockScroll("pdp-viewer");
      lenis?.stop();
      const cur = live.current;
      const wrap = wrapRefs.current[cur.index];
      const from = cur.originFor();
      if (wrap && from && !rm) {
        const away = flight(wrap, from, cur.slides[cur.index]?.ar ?? 1);
        anim = wrap.animate([away, { transform: "none", clipPath: "inset(0% 0% 0% 0%)" }], {
          duration: IN_MS,
          easing: EASE,
          fill: "backwards",
        });
      }
      r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      t1 = window.setTimeout(() => setShown(true), 400);
    } else if (dlg.open) {
      r1 = requestAnimationFrame(() => {
        setShown(false);
        setZoom(false);
      });
      t1 = window.setTimeout(() => setShown(false), 120);
      const cur = live.current;
      const wrap = wrapRefs.current[cur.index];
      const to = cur.originFor();
      let ms = 0;
      if (wrap && to && !rm) {
        const away = flight(wrap, to, cur.slides[cur.index]?.ar ?? 1);
        anim = wrap.animate([{ transform: "none", clipPath: "inset(0% 0% 0% 0%)" }, away], {
          duration: OUT_MS,
          easing: EASE,
          fill: "forwards",
        });
        ms = OUT_MS;
      } else if (!rm) {
        ms = 360;
      }
      t2 = window.setTimeout(() => {
        dlg.close();
        unlockScroll("pdp-viewer");
        lenis?.start();
        anim?.cancel();
        live.current.onClosed();
      }, ms);
    }

    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, lenis]);

  // never leave the page locked if the viewer unmounts while open
  useEffect(
    () => () => {
      unlockScroll("pdp-viewer");
    },
    [],
  );

  // Esc closes with the flight back, instead of snapping shut
  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener("cancel", onCancel);
    return () => dlg.removeEventListener("cancel", onCancel);
  }, [onClose]);

  function go(i: number) {
    const n = Math.max(0, Math.min(count - 1, i));
    if (n === index) return;
    setZoom(false);
    onIndexChange(n);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  }

  // ---- swipe between pictures ----
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || zoom || count < 2) return;
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { x: e.clientX, y: e.clientY, from: index };
  }
  function onPointerMove(e: PointerEvent) {
    const s = drag.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!dragging) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.4) {
        drag.current = null;
        return;
      }
      setDragging(true);
      stageRef.current?.setPointerCapture?.(e.pointerId);
    }
    const w = stageRef.current?.clientWidth ?? 1;
    setOffset(Math.max(-w, Math.min(w, dx)));
  }
  function endDrag(e: PointerEvent) {
    const s = drag.current;
    drag.current = null;
    if (!s) return;
    stageRef.current?.releasePointerCapture?.(e.pointerId);
    if (dragging) suppressClick.current = true;
    const w = stageRef.current?.clientWidth ?? 1;
    const dx = e.clientX - s.x;
    const step = dx <= -w * 0.16 ? 1 : dx >= w * 0.16 ? -1 : 0;
    setDragging(false);
    setOffset(0);
    go(s.from + step);
  }

  // ---- zoom: the picture follows the pointer (a finger, on a touch screen) ----
  function setOrigin(wrap: HTMLElement, clientX: number, clientY: number) {
    const r = wrap.getBoundingClientRect();
    wrap.style.setProperty("--zx", `${Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)).toFixed(1)}%`);
    wrap.style.setProperty("--zy", `${Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)).toFixed(1)}%`);
  }
  function onFigClick(e: MouseEvent, i: number) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (i !== index) return;
    // a click beside the picture (on the empty ground round it) closes; on the picture it zooms
    if (e.target === e.currentTarget && !zoom) {
      onClose();
      return;
    }
    const wrap = wrapRefs.current[i];
    if (!zoom && wrap) setOrigin(wrap, e.clientX, e.clientY);
    setZoom((z) => !z);
  }
  function onFigMove(e: PointerEvent, i: number) {
    if (!zoom || i !== index) return;
    const wrap = wrapRefs.current[i];
    if (wrap) setOrigin(wrap, e.clientX, e.clientY);
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <dialog
      ref={dlgRef}
      className={cn("pv", shown && "is-in", zoom && "is-zoom")}
      aria-label={`${name}, pictures`}
      onKeyDown={onKeyDown}
    >
      <div className="pv__bg" onClick={onClose} aria-hidden="true" />

      <div className="pv__bar">
        <p className="pv__count rh-tnum" aria-live="polite">
          <b>{pad(index + 1)}</b>
          <span aria-hidden="true"> / {pad(count)}</span>
          <span className="sr-only"> of {count}</span>
        </p>
        <p className="pv__title">{name}</p>
        <div className="pv__tools">
          <button
            type="button"
            className="pv__btn"
            onClick={() => {
              const wrap = wrapRefs.current[index];
              if (wrap && !zoom) {
                const r = wrap.getBoundingClientRect();
                setOrigin(wrap, r.left + r.width / 2, r.top + r.height / 2);
              }
              setZoom((z) => !z);
            }}
            aria-label={zoom ? "Zoom out" : "Zoom in"}
            aria-pressed={zoom}
          >
            <Icon name={zoom ? "minus" : "plus"} className="size-[17px]" />
          </button>
          <button type="button" className="pv__btn pv__btn--x" onClick={onClose} aria-label="Close" autoFocus>
            <Icon name="close" className="size-[18px]" />
          </button>
        </div>
        <i className="pv__prog" style={{ "--p": (index + 1) / Math.max(1, count) } as CSSProperties} aria-hidden="true" />
      </div>

      <div
        ref={stageRef}
        className="pv__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className={cn("pv__track", dragging && "is-dragging")}
          style={{ transform: `translateX(calc(${-index * 100}% + ${offset}px))` }}
        >
          {slides.map((s, i) => {
            const near = Math.abs(i - index) <= 1;
            return (
              <div
                key={s.key}
                className={cn("pv__slide", i === index && "is-cur")}
                aria-hidden={i !== index}
                inert={i !== index}
              >
                <figure
                  className="pv__fig"
                  onClick={(e) => onFigClick(e, i)}
                  onPointerMove={(e) => onFigMove(e, i)}
                >
                  <div
                    ref={(el) => {
                      wrapRefs.current[i] = el;
                    }}
                    className="pv__wrap"
                    data-zoom={zoom && i === index ? "" : undefined}
                    style={{ "--ar": s.ar } as CSSProperties}
                  >
                    {near && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="pv__img" src={s.thumb} alt={s.alt} decoding="async" draggable={false} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className={cn("pv__img pv__img--full", loaded[s.key] && "is-loaded")}
                          src={s.full}
                          alt=""
                          decoding="async"
                          draggable={false}
                          onLoad={() => setLoaded((l) => (l[s.key] ? l : { ...l, [s.key]: true }))}
                        />
                      </>
                    )}
                  </div>
                </figure>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              className="pv__nav pv__nav--prev"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Previous picture"
            >
              <Icon name="chevron" className="size-[20px]" />
            </button>
            <button
              type="button"
              className="pv__nav pv__nav--next"
              onClick={() => go(index + 1)}
              disabled={index === count - 1}
              aria-label="Next picture"
            >
              <Icon name="chevron" className="size-[20px]" />
            </button>
          </>
        )}
        <p className="pv__hint" aria-hidden="true">
          {zoom ? "Move to explore · click to return" : "Click to zoom"}
        </p>
      </div>

      {count > 1 && (
        <ol className="pv__thumbs" aria-label="Pictures">
          {slides.map((s, i) => (
            <li key={s.key} style={{ "--i": i } as CSSProperties}>
              <button
                type="button"
                className="pv__thumb"
                onClick={() => go(i)}
                aria-label={`Picture ${i + 1}`}
                aria-current={i === index}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.tiny} alt="" decoding="async" draggable={false} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </dialog>
  );
}
