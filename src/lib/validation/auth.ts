import { z } from "zod";

import { OTP_LENGTH } from "@/lib/auth";

/** Body of `POST /api/auth/otp/start`. */
export const otpStartInput = z.object({
  phone: z.string().min(6).max(20),
  // client sends `null` when Turnstile isn't rendered
  turnstileToken: z.string().max(4000).nullish(),
});

/** Body of `POST /api/auth/otp/verify`. */
export const otpVerifyInput = z.object({
  phone: z.string().min(6).max(20),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});

/** Body of `POST /api/admin/sudo/confirm` — the staff re-auth code. The phone
 *  is the signed-in staff member's own, so it isn't taken from the client. */
export const sudoConfirmInput = z.object({
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});

/** Query of `GET /api/auth/google/start`. `next` is sanitised again server-side
 *  via `safeNextPath`; the callback trusts only its own signed cookies. */
export const googleStartQuery = z.object({
  mode: z.enum(["link", "signin"]).default("signin"),
  next: z.string().max(512).optional(),
});
