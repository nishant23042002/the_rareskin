import "./_bootstrap";

import { v2 as cloudinary } from "cloudinary";
import { statSync } from "node:fs";
import { resolve } from "node:path";

import {
  dbConnect,
  dbDisconnect,
  MediaAsset,
  SiteSettings,
  recordAudit,
} from "@/server/db";
import { getCloudinaryEnv, getEnv } from "@/server/env";

/**
 * Set the founder portrait from a local image — the scripted twin of
 * Admin → Settings → Founder → upload. Uploads to Cloudinary
 * (`rareskin/content/founder-portrait`), records the `MediaAsset`, points
 * `SiteSettings.founderPortrait` at it and bumps the storefront cache. Safe to
 * re-run: the same public id is overwritten and the MediaAsset row is reused.
 *
 *   pnpm founder:portrait <path-to-image> [--alt="…"] [--target=<url>]
 *
 * Cache bump target: --target or REVALIDATE_TARGET (default
 * http://localhost:3000). Needs REVALIDATE_SECRET; without it the storefront
 * picks the change up when the settings cache expires (24h).
 */

const PUBLIC_ID = "founder-portrait";
const FOLDER = "rareskin/content";
const DEFAULT_ALT = "Vijay More, founder of THE RARESKIN";

function parseArgs(argv: string[]) {
  const out: { file?: string; alt?: string; target?: string } = {};
  for (const a of argv) {
    if (a.startsWith("--alt=")) out.alt = a.slice("--alt=".length);
    else if (a.startsWith("--target=")) out.target = a.slice("--target=".length);
    else if (!a.startsWith("--")) out.file = a;
  }
  return out;
}

async function revalidate(target: string) {
  const { REVALIDATE_SECRET } = getEnv();
  if (!REVALIDATE_SECRET) {
    console.warn("  (REVALIDATE_SECRET not set — skipping cache bump)");
    return;
  }
  const url = `${target.replace(/\/+$/, "")}/api/revalidate`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${REVALIDATE_SECRET}`,
      },
      body: JSON.stringify({ tags: ["settings"], paths: ["/", "/the-idea"] }),
    });
    console.log(`  revalidate ${url} → ${res.status} ${await res.text()}`);
  } catch (err) {
    console.warn(`  revalidate failed (${url}):`, (err as Error).message);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    throw new Error("usage: pnpm founder:portrait <path-to-image> [--alt=…]");
  }
  const file = resolve(args.file);
  statSync(file); // throws a clear ENOENT if the path is wrong
  const alt = args.alt ?? DEFAULT_ALT;

  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  console.log(`  uploading ${file} → ${FOLDER}/${PUBLIC_ID}`);
  const up = await cloudinary.uploader.upload(file, {
    folder: FOLDER,
    public_id: PUBLIC_ID,
    overwrite: true,
    invalidate: true,
    resource_type: "image",
    tags: ["founder"],
  });
  console.log(`  ✓ ${up.secure_url} (${up.format} ${up.width}×${up.height})`);

  await dbConnect();

  const asset = await MediaAsset.findOneAndUpdate(
    { cloudinaryPublicId: up.public_id },
    {
      $set: {
        secureUrl: up.secure_url,
        format: up.format,
        width: up.width,
        height: up.height,
        bytes: up.bytes,
        folder: "content",
        alt,
        tags: ["founder"],
      },
      $addToSet: { usedIn: "settings:founderPortrait" },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const before = await SiteSettings.findOne({ key: "singleton" })
    .select("founderPortrait")
    .lean();
  if (!before) {
    throw new Error("no SiteSettings document — run `pnpm db:seed` first");
  }

  const ref = {
    assetId: asset._id,
    url: up.secure_url,
    alt,
    width: up.width,
    height: up.height,
  };
  await SiteSettings.updateOne(
    { key: "singleton" },
    { $set: { founderPortrait: ref } },
  );
  console.log(`  ✓ SiteSettings.founderPortrait → asset ${asset._id}`);

  await recordAudit({
    actorId: null,
    actorRole: "system",
    action: "settings.update",
    targetType: "SiteSettings",
    targetId: "singleton",
    before: { founderPortrait: before.founderPortrait ?? null },
    after: { founderPortrait: { ...ref, assetId: String(asset._id) } },
    ip: null,
    userAgent: null,
    note: "scripts/founder-portrait.ts",
  });

  await revalidate(
    args.target || process.env.REVALIDATE_TARGET || "http://localhost:3000",
  );
  await dbDisconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
