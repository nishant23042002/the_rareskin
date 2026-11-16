import { NextResponse } from "next/server";

import { checkRateOpen, requestContext } from "@/server/auth";
import { notifyNewsletterSubscribed } from "@/server/notifications";

/**
 * Newsletter sign-up — validates the address, raises a low-priority admin
 * notification, and returns success. Forwarding to a real list provider
 * (Buttondown / Resend / Mailchimp) still goes here when the list exists; the
 * client contract (`{ email }` in, `{ ok }` / `{ error }` out) is unchanged.
 */
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = (await request.json()) as { email?: unknown });
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const ctx = await requestContext();
  const rl = await checkRateOpen("newsletter:ip", ctx.ip ?? "unknown");
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a little while." },
      { status: 429 },
    );
  }

  await notifyNewsletterSubscribed(email.trim());

  // TODO: forward to the email provider once the list is live.
  return NextResponse.json({ ok: true });
}
