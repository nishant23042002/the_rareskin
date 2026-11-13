/**
 * A tiny physical tap on phones that support it (Android Chrome and friends;
 * iOS Safari has no Vibration API, so there it is simply nothing). Used sparingly,
 * on the moments that matter: something went into the bag, a code was accepted,
 * a field needs fixing, the order is placed.
 *
 * It is skipped for anyone who asked for reduced motion, and it can never throw.
 */
type Beat = "tap" | "soft" | "success" | "error";

const PATTERNS: Record<Beat, number | number[]> = {
  tap: 8,
  soft: 5,
  success: [10, 40, 18],
  error: [14, 38, 14, 38, 20],
};

export function haptic(beat: Beat = "tap"): void {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(PATTERNS[beat]);
  } catch {
    /* no vibration motor, or blocked: nothing to do */
  }
}
