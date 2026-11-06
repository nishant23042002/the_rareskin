import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { isProduction } from "@/server/env";

/**
 * Dev-only sink for `src/lib/dev-client-beacon.ts`: a phone (or any browser)
 * posts what it sees, one JSON line per event, into
 * `.next/dev/logs/phone-client.log`. 404 in production. `GET ?lines=60` returns
 * the tail so the log can be read from a browser too.
 */
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), ".next", "dev", "logs", "phone-client.log");

export async function POST(request: Request) {
  if (isProduction()) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const body = (await request.text()).slice(0, 4000);
    const from = request.headers.get("x-forwarded-for") ?? request.headers.get("host") ?? "";
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.appendFile(FILE, `${JSON.stringify({ host: from, ...JSON.parse(body) })}\n`, "utf8");
  } catch {
    /* a diagnostic must never break the page */
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  if (isProduction()) return NextResponse.json({ ok: false }, { status: 404 });
  const n = Math.min(200, Number(new URL(request.url).searchParams.get("lines")) || 60);
  try {
    const text = await fs.readFile(FILE, "utf8");
    return new NextResponse(text.trim().split("\n").slice(-n).join("\n"), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new NextResponse("(no reports yet)", { headers: { "content-type": "text/plain" } });
  }
}
