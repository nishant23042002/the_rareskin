import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getEnv, isUpstashConfigured } from "@/server/env";

/**
 * Sliding-window rate limiting.
 *
 * Uses Upstash Redis when configured (works across serverless instances). Falls
 * back to an in-process map for local development — single-instance only, so
 * NEVER rely on the fallback in production; the OTP routes log a warning once
 * if Upstash is missing.
 */
if (typeof window !== "undefined") {
  throw new Error("@/server/auth must never be imported into client code");
}

type Duration = `${number} ${"s" | "m" | "h" | "d"}`;

// Tuned so a legitimate user (including on a shared office / campus NAT) never
// hits a wall, while abuse is still shut down. Twilio Verify separately caps
// attempts-per-code at 5 and expires codes in ~10 min.
const RULES = {
  "otp:start:phone": { limit: 5, window: "15 m" as Duration },
  "otp:start:ip": { limit: 30, window: "15 m" as Duration },
  "otp:verify:phone": { limit: 12, window: "15 m" as Duration },
  "otp:verify:ip": { limit: 50, window: "15 m" as Duration },
  // Staff sudo re-auth — scoped per user. Deliberately tight.
  "admin:sudo:user": { limit: 8, window: "15 m" as Duration },
  // Google OAuth start — scoped per IP (no user yet on the sign-in path).
  "auth:google:ip": { limit: 20, window: "15 m" as Duration },
  // Checkout: a quote is cheap (recompute on every field change); placing an
  // order is not. Scoped per user/IP.
  "checkout:quote:ip": { limit: 120, window: "5 m" as Duration },
  "checkout:place:user": { limit: 12, window: "10 m" as Duration },
  "checkout:place:ip": { limit: 20, window: "10 m" as Duration },
  // Writing / editing a product review — scoped per user.
  "account:review:user": { limit: 20, window: "1 h" as Duration },
  // Customer image uploads (avatar + review photos) — scoped per user.
  "account:upload:user": { limit: 40, window: "1 h" as Duration },
  // Public forms: each one writes a row / raises a staff notification, so a bot could flood
  // the inbox. Generous for a real person (several enquiries, a shared network), tight for a script.
  "contact:ip": { limit: 6, window: "15 m" as Duration },
  "newsletter:ip": { limit: 10, window: "15 m" as Duration },
  // Public certificate verification (/verify and /api/certificates/<no>) — one lookup per call, so this
  // only has to stop someone walking the number space (TRS-INT-2026-001, -002, …) with a script.
  "certificate:verify:ip": { limit: 40, window: "10 m" as Duration },
} as const;

export type RateRule = keyof typeof RULES;

export interface RateResult {
  success: boolean;
  remaining: number;
  /** epoch ms when the window resets */
  reset: number;
}

let redis: Redis | null = null;
const upstashLimiters = new Map<RateRule, Ratelimit>();
let warnedNoUpstash = false;

function durationMs(d: Duration): number {
  const [n, unit] = d.split(" ") as [string, "s" | "m" | "h" | "d"];
  const mult = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[unit];
  return Number(n) * mult;
}

// ── in-process fallback ─────────────────────────────────────────────────
const memoryHits = new Map<string, number[]>();

function memoryLimit(rule: RateRule, key: string): RateResult {
  const { limit, window } = RULES[rule];
  const span = durationMs(window);
  const now = Date.now();
  const bucketKey = `${rule}:${key}`;
  const hits = (memoryHits.get(bucketKey) ?? []).filter((t) => now - t < span);
  const success = hits.length < limit;
  if (success) hits.push(now);
  memoryHits.set(bucketKey, hits);
  return {
    success,
    remaining: Math.max(0, limit - hits.length),
    reset: (hits[0] ?? now) + span,
  };
}

// occasional sweep so the map doesn't grow forever in a long-lived dev server
setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of memoryHits) {
      const fresh = v.filter((t) => now - t < 864e5);
      if (fresh.length) memoryHits.set(k, fresh);
      else memoryHits.delete(k);
    }
  },
  60 * 60 * 1000,
).unref?.();

// ── upstash ─────────────────────────────────────────────────────────────
function getUpstashLimiter(rule: RateRule): Ratelimit {
  let limiter = upstashLimiters.get(rule);
  if (limiter) return limiter;
  if (!redis) {
    const env = getEnv();
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  const { limit, window } = RULES[rule];
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `rl:${rule}`,
    analytics: false,
  });
  upstashLimiters.set(rule, limiter);
  return limiter;
}

/** Consume one token for `rule` scoped to `key`. */
export async function checkRate(
  rule: RateRule,
  key: string,
): Promise<RateResult> {
  if (isUpstashConfigured()) {
    const res = await getUpstashLimiter(rule).limit(key);
    return {
      success: res.success,
      remaining: res.remaining,
      reset: res.reset,
    };
  }
  if (!warnedNoUpstash) {
    warnedNoUpstash = true;
    console.warn(
      "[rate-limit] Upstash not configured — using in-process fallback (dev only).",
    );
  }
  return memoryLimit(rule, key);
}

/**
 * `checkRate` for a public form that must keep working when the limiter's backend does
 * not: if Redis is unreachable the request is let through (the cost of a missed limit is a
 * little spam; the cost of failing closed is a contact form that is down).
 */
export async function checkRateOpen(
  rule: RateRule,
  key: string,
): Promise<RateResult> {
  try {
    return await checkRate(rule, key);
  } catch (err) {
    console.error(`[rate-limit] ${rule} unavailable, allowing`, err);
    return { success: true, remaining: 0, reset: Date.now() };
  }
}
