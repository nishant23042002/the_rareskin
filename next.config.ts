import { hostname } from "node:os";
import type { NextConfig } from "next";

import homepageImages from "./public/images/assets-manifest.json";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // DEV ONLY (ignored by `next build` / `next start`). Next 16's dev server answers
  // 403 to cross-origin requests for its own /_next/* resources, and that includes
  // the app's client chunks as soon as the page is opened by the PC's network
  // address instead of `localhost` (a phone on the same Wi-Fi: http://192.168.x.x:3000).
  // Then nothing hydrates and the page is dead: cards do not flip, the announcement
  // bar does not rotate, menus and the bag do not open, while the HTML still looks
  // right. Allow the private LAN ranges, `.local` names and this machine's own name.
  // A tunnel (ngrok, Cloudflare) needs its host added here on purpose.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local", hostname()],
  // Homepage pictures live in /public/images/homepage (see
  // public/images/assets-manifest.json). Next 16 only serves the qualities that
  // are listed here: 75 is the default, 85 is what the homepage <Image>s ask for.
  // The homepage pictures are requested as `<file>?v=<assetVersion>` (the optimizer
  // cache cannot be invalidated, so a replaced file needs a new URL): allow exactly
  // that query string, from the manifest's own version.
  images: {
    qualities: [75, 85],
    localPatterns: [
      {
        pathname: "/images/homepage/**",
        search: `?v=${homepageImages.assetVersion}`,
      },
    ],
  },
  // `forbidden()` / `unauthorized()` from `next/navigation` — the admin guards
  // render a real 403 for a signed-in account that lacks access (see
  // `src/server/auth/admin.ts`, `src/app/forbidden.tsx`).
  experimental: {
    authInterrupts: true,
  },
  // Native Node.js require for the DB / media SDKs — they use Node built-ins and
  // must not be bundled into the Server Components graph.
  serverExternalPackages: [
    "mongoose",
    "cloudinary",
    "twilio",
    // pulls in fontkit + a PDF writer that use Node built-ins (zlib/stream/fs)
    "@react-pdf/renderer",
  ],
  // the invoice PDF reads the brand fonts straight off disk — bundle them
  outputFileTracingIncludes: {
    "/api/account/orders/[orderNumber]/invoice": ["./public/fonts/**"],
  },
  // The previous therareskin.com (a separate project) used other paths. Anything
  // Google has indexed, a customer bookmarked, or a Razorpay "business website"
  // entry still points at them, so each old URL 308s to its closest equivalent
  // here. Keep these for at least a year after the cutover.
  async redirects() {
    const to = (source: string, destination: string) => ({
      source,
      destination,
      permanent: true,
    });
    return [
      // products — the old slugs had the accents stripped with a hyphen left behind
      to("/product/aurevan", "/fragrances/aurevan"),
      to("/product/vayr-n", "/fragrances/vayren"),
      to("/product/orv-lis", "/fragrances/orvelis"),
      to("/product/discovery-set", "/discovery-set"),
      // collections / listings — the range now lives on the homepage
      to("/perfumes/gift-sets", "/discovery-set"),
      to("/perfumes", "/"),
      to("/collections/bestsellers", "/"),
      // pages that were renamed or split
      to("/about", "/the-idea"),
      to("/shipping-returns", "/shipping"),
      to("/privacy-terms", "/privacy"),
      // old app routes that no longer exist as pages
      to("/login", "/?signin=1"),
      to("/checkout", "/"),
      to("/search", "/"),
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
