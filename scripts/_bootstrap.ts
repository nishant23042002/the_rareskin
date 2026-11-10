/**
 * Side-effect module: load `.env*` the way Next.js does, before any module that
 * reads `process.env` is imported. Every script imports this **first**.
 *
 * Scripts talk to the database through `@/server/db` (models + connection) and
 * plain Mongoose — never the `server-only` DAL / commerce modules, which are
 * for the request runtime.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

/**
 * Scripts that WRITE test data or WIPE data call this first. `NODE_ENV` says
 * nothing about WHICH database a script is connected to — on this machine
 * `.env.local` can point straight at the live Atlas database, and "not production"
 * would let `reset:commerce` wipe real orders. So they refuse unless explicitly
 * allowed, and the allow-flag belongs on a throw-away database only:
 *
 *   ALLOW_DESTRUCTIVE_SCRIPTS=1 pnpm reset:commerce      (PowerShell: $env:ALLOW_DESTRUCTIVE_SCRIPTS=1)
 */
export function requireDestructiveConsent(script: string): void {
  if (process.env.ALLOW_DESTRUCTIVE_SCRIPTS === "1") return;
  console.error(
    `\n✗ ${script} writes test data or deletes data, so it refuses to run by default.\n` +
      `  MONGODB_DB is "${process.env.MONGODB_DB ?? "(unset)"}" — if that is the live database, STOP.\n` +
      `  Point .env.local at a throw-away database (e.g. MONGODB_DB=rareskin-dev), then set\n` +
      `  ALLOW_DESTRUCTIVE_SCRIPTS=1 for this one command.\n`,
  );
  process.exit(1);
}
