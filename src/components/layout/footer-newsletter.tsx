"use client";

import { useId, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Status = "idle" | "invalid" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Join The Private Circle" — one underlined field + a Join button, posting to
 * the existing `/api/newsletter` route (`{ email }` in, `{ ok }` / `{ error }`
 * out). Validates on blur and submit, clears the error as soon as the address
 * is fixed, and announces everything through one polite live region. The field
 * row keeps its height in every state, so nothing around it moves.
 */
export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const inputId = useId();
  const noteId = useId();

  const value = email.trim();
  const valid = EMAIL_RE.test(value);
  const invalid = status === "invalid" || status === "error";

  function onChange(next: string) {
    setEmail(next);
    if (invalid && EMAIL_RE.test(next.trim())) {
      setStatus("idle");
      setMessage("");
    }
  }

  function onBlur() {
    if (value && !valid && status === "idle") {
      setStatus("invalid");
      setMessage("That doesn’t look like an email address yet.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    if (!valid) {
      setStatus("invalid");
      setMessage(
        value ? "Please enter a valid email address." : "Enter your email to join.",
      );
      return;
    }

    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form aria-label="Newsletter Subscription" noValidate onSubmit={onSubmit}>
      <label
        htmlFor={inputId}
        className="text-[10px] tracking-[0.22em] text-brass uppercase"
      >
        Join The Private Circle
      </label>

      {status === "success" ? (
        <p className="serif-italic flex h-14 items-center text-[1.2rem] text-champagne">
          Welcome — your place is reserved.
        </p>
      ) : (
        <div
          className={cn(
            "flex h-14 items-center border-b transition-colors duration-300",
            invalid
              ? "border-[#e58573]"
              : "border-champagne/30 focus-within:border-brass",
          )}
        >
          <input
            id={inputId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="Email address"
            value={email}
            disabled={status === "submitting"}
            aria-invalid={invalid}
            aria-describedby={noteId}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-champagne outline-none placeholder:text-champagne/55 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="group inline-flex h-11 shrink-0 items-center gap-2 pl-4 text-[11px] tracking-[0.2em] text-champagne uppercase transition-colors duration-300 hover:text-brass disabled:opacity-60"
          >
            {status === "submitting" ? "Joining" : "Join"}
            <Icon
              name="arrowRight"
              className="size-4 transition-transform duration-300 ease-[var(--ease-out-strong)] group-hover:translate-x-1"
            />
          </button>
        </div>
      )}

      <p
        id={noteId}
        aria-live="polite"
        className={cn(
          "mt-3 min-h-[2.9em] text-[12px] leading-[1.5]",
          invalid ? "text-[#e58573]" : "text-champagne/60",
          // phones: the sign-up stays one calm line — the VIP blurb only shows
          // on larger screens; errors and the thank-you always show
          !message && status !== "success" && "max-md:hidden",
        )}
      >
        {message ||
          (status === "success"
            ? `We’ll write to ${value} when the next batch is previewed.`
            : "VIP preview access to batch releases, bespoke allocations and olfactory editorial notes.")}
      </p>
    </form>
  );
}
