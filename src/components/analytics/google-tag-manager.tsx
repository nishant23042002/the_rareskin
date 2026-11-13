import Script from "next/script";

/**
 * Google Tag Manager for the storefront (mounted from `(store)/layout.tsx`, so
 * `/admin` is never tracked). Off until `NEXT_PUBLIC_GTM_ID` is set — set it in
 * the Vercel Production environment only, so local runs, previews and the
 * rehearsal on the `*.vercel.app` URL don't pollute the live container. It is
 * inlined at build time: change it → redeploy.
 *
 * Safety net: even with the id present (`.env.local` often has it), the loader
 * does nothing on localhost, a LAN address (phone testing), `*.local` or
 * `*.vercel.app` — so developing against the live property can't add fake
 * visitors to the live reports. To test the container on one of those hosts, run
 * `localStorage.setItem("rs:gtm","on")` in the console and reload (use GTM Preview).
 *
 * The id is checked against GTM's own shape before it goes anywhere near an
 * inline script.
 */
const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim();
const VALID = /^GTM-[A-Z0-9]{4,12}$/.test(GTM_ID);

// String.raw keeps the regex backslashes intact in the emitted script.
const SNIPPET = String.raw`(function(){var h=location.hostname,on=false;try{on=localStorage.getItem('rs:gtm')==='on'}catch(e){}if(!on&&(h==='localhost'||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)||/\.(local|localhost|vercel\.app)$/.test(h)))return;(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');})();`;

export function GoogleTagManager() {
  if (!VALID) return null;
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {SNIPPET}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
