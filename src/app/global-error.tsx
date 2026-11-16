"use client";

import { useEffect } from "react";

/**
 * The last resort: the root layout itself threw, so there is no `<html>`, no stylesheet and no
 * fonts. It must bring its own document and its own (inline) styling, and depend on nothing
 * that could be what failed: no router, no components, no CSS file. Home is a full page load.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const button = {
    font: "500 11px/1 system-ui, sans-serif",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    padding: "14px 20px",
    borderRadius: 2,
    border: "1px solid #17140f",
    cursor: "pointer",
  };

  return (
    <html lang="en-IN">
      <body style={{ margin: 0, background: "#f2f1ed", color: "#232120" }}>
        <main
          style={{
            minHeight: "100svh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 24,
            font: "300 16px/1.6 system-ui, sans-serif",
          }}
        >
          <p style={{ font: "500 11px/1.5 system-ui, sans-serif", letterSpacing: "0.28em", textTransform: "uppercase", color: "#6c6960", margin: 0 }}>
            Something slipped
          </p>
          <h1 style={{ font: "300 clamp(1.8rem,5vw,2.8rem)/1.1 Georgia, serif", margin: "12px 0 0" }}>
            This page lost its footing.
          </h1>
          <p style={{ maxWidth: "34ch", margin: "14px 0 0", color: "#6b6963" }}>
            That was on our side, not yours. Try again, or head back home.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" onClick={() => retry()} style={{ ...button, background: "#17140f", color: "#fafaf7" }}>
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign(new URL("/", window.location.origin))}
              style={{ ...button, background: "transparent", color: "#232120" }}
            >
              Home
            </button>
          </div>
          {error?.digest ? (
            <p style={{ font: "400 10px/1.5 system-ui, sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6c6960", marginTop: 24 }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
