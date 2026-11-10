import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Jost, Newsreader } from "next/font/google";
import { ScrollbarVar } from "@/components/providers/scrollbar-var";
import { SvgDefs } from "@/components/ui/svg-defs";
import { THEME_BOOT_SCRIPT } from "@/config/themes";
import { DEV_CLIENT_BEACON } from "@/lib/dev-client-beacon";
import { SITE } from "@/lib/site";
import { organizationJsonLd } from "@/lib/seo";
import "./globals.css";

/**
 * Root layout — `<html>` / `<body>`, fonts, and the handful of globals every
 * section shares. The storefront chrome (providers, header, footer, cart, the
 * sign-in machinery) lives in `(store)/layout.tsx`; the admin has its own shell
 * in `(admin)/layout.tsx`. Route groups keep the URLs unchanged.
 */

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

// The label voice: eyebrows, buttons, navigation, micro-caps, product names and counters are set in
// this (see `--font-label` in globals.css). A variable font, so one file covers every weight.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f2f1ed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the boot script below sets `data-theme` on <html> before React hydrates
    <html
      lang="en-IN"
      className={`${jost.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* applies a previewed colour theme before the first paint (src/config/themes.ts, app/themes.css) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {process.env.NODE_ENV !== "production" && (
          // dev only: reports what a phone's browser does with this page (src/lib/dev-client-beacon.ts)
          <script dangerouslySetInnerHTML={{ __html: DEV_CLIENT_BEACON }} />
        )}
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <a
          href="#main"
          className="sr-only rounded-[2px] bg-cta px-4 py-2.5 text-w0 focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[999]"
        >
          Skip to content
        </a>
        <SvgDefs />
        <ScrollbarVar />
        {children}
      </body>
    </html>
  );
}
