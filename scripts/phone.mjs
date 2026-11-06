/**
 * `pnpm phone` — a production build of the storefront, served to the local
 * network, for testing on a real phone.
 *
 * Why not `pnpm dev` on the phone: the dev server ships ~5 MB of unminified
 * JavaScript plus React's dev build and HMR. A mid-range phone needed about 33 s
 * to load and start the homepage (the same page takes 0.3 s on the PC), so every
 * button looked dead until then. A production build is a fraction of that.
 *
 * What it does:
 *   1. `next build` with NEXT_PUBLIC_LAN_TEST=1 and NEXT_PUBLIC_CARD_SWITCHER=1
 *      - LAN_TEST relaxes the Secure / __Host- cookie flags (src/lib/auth.ts),
 *        because a phone at http://192.168.x.x is not a secure origin and would
 *        drop the session and cart cookies; the flag is ignored on Vercel.
 *      - CARD_SWITCHER keeps the card-direction preview bar on the homepage.
 *   2. `next start` on 0.0.0.0:3001 (PORT=... to change), and prints the phone URL(s).
 *
 * It never touches `pnpm dev` on :3000. Rebuild (run it again) to see code changes:
 * there is no hot reload in a production build. Never deploy a build made here.
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";

if (process.env.VERCEL || process.env.CI) {
  console.error("pnpm phone is a local tool; refusing to run on CI / Vercel.");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const port = process.env.PORT || "3001";
const env = {
  ...process.env,
  NEXT_PUBLIC_LAN_TEST: "1",
  NEXT_PUBLIC_CARD_SWITCHER: "1",
};

console.log("[phone] building (about a minute)...");
const built = spawnSync(process.execPath, [nextBin, "build"], { env, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const urls = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => `http://${i.address}:${port}`);
console.log(`\n[phone] open on the phone (same Wi-Fi):\n  ${urls.join("\n  ") || `http://<this PC's IPv4>:${port}`}\n`);

const server = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", port], {
  env,
  stdio: "inherit",
});
server.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.kill(sig));
