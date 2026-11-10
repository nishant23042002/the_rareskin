import "./_bootstrap";

import { dbConnect, dbDisconnect } from "@/server/db";
import { Order } from "@/server/models";

/**
 * READ-ONLY audit: find "phantom" online orders — orders marked `payment.status`
 * paid / refunded whose Razorpay payment was never actually captured.
 *
 *   pnpm exec tsx scripts/audit-paid-orders.ts            # newest 200 online orders
 *   pnpm exec tsx scripts/audit-paid-orders.ts --limit 1000
 *
 * It only ever READS: one `find` on `orders` and `GET /v1/payments/:id` on
 * Razorpay. No DB writes, no refunds, nothing deleted. It uses whichever Razorpay
 * key is in `.env.local`, so a payment made in the *other* mode (test vs live)
 * shows up as "not found in this key's mode" — run it once per mode if you've
 * used both.
 *
 * Verdicts (anything other than OK is a suspect and sets exit code 1):
 *   OK                 Razorpay says captured, same order id, same amount
 *   DEV-SIMULATED      synthetic pay_dev_ / dev_order_ id — created by the local
 *                      simulator, never charged
 *   NO-PAYMENT-ID      marked paid with no Razorpay payment id at all
 *   NOT-FOUND          Razorpay has no such payment under this key's mode
 *   NOT-CAPTURED       Razorpay status is failed / authorized / created …
 *   ORDER-MISMATCH     payment belongs to a different Razorpay order
 *   AMOUNT-MISMATCH    captured amount ≠ the order total
 */

interface Row {
  orderNumber: string;
  createdAt: Date;
  pricing: { grandTotalPaise: number };
  payment: {
    status: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
  };
}

interface RzpPayment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  captured: boolean;
  error_description?: string | null;
}

const keyId = process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

async function lookup(
  paymentId: string,
): Promise<RzpPayment | "not-found" | { error: string }> {
  const res = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
    },
  );
  if (res.status === 400 || res.status === 404) return "not-found";
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return (await res.json()) as RzpPayment;
}

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const n = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main() {
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.");
  }
  const mode = keyId.startsWith("rzp_live_") ? "LIVE" : "TEST";
  const limit = arg("limit", 200);

  await dbConnect();
  const rows = await Order.find({
    "payment.method": "razorpay",
    "payment.status": { $in: ["paid", "partially_refunded", "refunded"] },
  })
    .select(
      "orderNumber createdAt pricing.grandTotalPaise payment.status payment.providerOrderId payment.providerPaymentId",
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<Row[]>();

  console.log(`Razorpay key mode: ${mode}   online paid orders checked: ${rows.length}\n`);

  const tally: Record<string, number> = {};
  const suspects: string[] = [];

  for (const o of rows) {
    const pid = o.payment.providerPaymentId;
    let verdict: string;
    let detail = "";

    if (!pid) {
      verdict = "NO-PAYMENT-ID";
    } else if (
      pid.startsWith("pay_dev_") ||
      (o.payment.providerOrderId ?? "").startsWith("dev_order_")
    ) {
      verdict = "DEV-SIMULATED";
    } else {
      const p = await lookup(pid);
      if (p === "not-found") {
        verdict = "NOT-FOUND";
        detail = `not under this ${mode}-mode key`;
      } else if ("error" in p) {
        verdict = "LOOKUP-ERROR";
        detail = p.error;
      } else if (p.status !== "captured" && p.status !== "refunded") {
        verdict = "NOT-CAPTURED";
        detail = `status=${p.status}${p.error_description ? ` (${p.error_description})` : ""}`;
      } else if (!p.captured) {
        verdict = "NOT-CAPTURED";
        detail = `status=${p.status}, captured=false`;
      } else if (o.payment.providerOrderId && p.order_id !== o.payment.providerOrderId) {
        verdict = "ORDER-MISMATCH";
        detail = `razorpay order ${p.order_id}`;
      } else if (p.amount !== o.pricing.grandTotalPaise) {
        verdict = "AMOUNT-MISMATCH";
        detail = `razorpay ${p.amount} vs order ${o.pricing.grandTotalPaise} paise`;
      } else {
        verdict = "OK";
      }
      await new Promise((r) => setTimeout(r, 120)); // be gentle with the API
    }

    tally[verdict] = (tally[verdict] ?? 0) + 1;
    if (verdict !== "OK") {
      suspects.push(
        `${o.orderNumber}  ${o.createdAt.toISOString().slice(0, 16)}  ${verdict.padEnd(16)} ${pid ?? "—"}  ${detail}`,
      );
    }
  }

  console.log("Summary:", tally);
  if (suspects.length) {
    console.log("\nSuspect orders (investigate in the Razorpay dashboard — nothing was changed):");
    for (const s of suspects) console.log("  " + s);
    process.exitCode = 1;
  } else {
    console.log("\nNo phantom orders found.");
  }

  await dbDisconnect();
}

main().catch((err) => {
  console.error("✗ audit failed\n", err);
  process.exitCode = 1;
});
