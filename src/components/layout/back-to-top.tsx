"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

import { useCart } from "@/components/providers/cart-provider";
import { RhIcon } from "@/components/ui/rh-icon";

/**
 * Floating return-to-top. Wide screens: appears once you are 700px down. Phones:
 * appears only while you scroll UP past 700px and tucks away after ~2.6s, so it
 * never sits over the page while reading. Hidden while the footer (which carries
 * its own button) is on screen. Rides Lenis when it is running, else native
 * smooth scroll — instant under reduced motion.
 */
export function BackToTop() {
  const lenis = useLenis();
  const { count, isOpen } = useCart();
  const [on, setOn] = useState(false);
  const [gone, setGone] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 759px)");
    let lastY = window.scrollY;
    let tucked = 0;
    let raf = 0;

    const hide = () => {
      window.clearTimeout(tucked);
      setOn(false);
    };

    const read = () => {
      raf = 0;
      const y = window.scrollY;
      if (narrow.matches) {
        if (y < 700) hide();
        else if (y < lastY - 6) {
          setOn(true);
          window.clearTimeout(tucked);
          tucked = window.setTimeout(() => {
            if (!btn.current?.matches(":hover, :focus-visible")) setOn(false);
          }, 2600);
        } else if (y > lastY + 6) hide();
      } else {
        setOn(y > 700);
      }
      lastY = y;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(tucked);
    };
  }, []);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => setGone(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  function toTop() {
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.4 });
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      ref={btn}
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className={`rh-totop${on ? " is-on" : ""}${gone ? " is-gone" : ""}${
        // the bag bar takes the bottom strip once there is something in the bag
        count > 0 && !isOpen ? " rh-totop--up" : ""
      }`}
    >
      <RhIcon name="up" />
    </button>
  );
}
