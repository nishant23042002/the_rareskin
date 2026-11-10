import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /account + /admin are behind sign-in (the proxy bounces anonymous
      // visitors home) — no reason for a crawler to try them.
      disallow: ["/api/", "/admin", "/account"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url.replace(/\/$/, ""),
  };
}
