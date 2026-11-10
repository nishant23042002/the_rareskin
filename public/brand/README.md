# Brand assets

## `rareskin-wordmark.png` — THE logo (the one source of truth)

Current file: **1487 × 331**, black artwork on transparent, RGBA. Derived from
the client-supplied logo (a grayscale raster that arrived wrapped in an SVG);
extracted, inverted to black-on-transparent, and tight-cropped so the site can
tint it with `currentColor` (see `src/components/ui/logo.tsx`).

Everything below is **derived from this one file** — never redrawn or retyped:

| file | made by | used for |
| --- | --- | --- |
| `rareskin-wordmark.png` | the original | header, menu, footer, sign-in, holding page (`<Logo>`), the invoice masthead, the share cards, JSON-LD |
| `rareskin-wordmark-cream.png` | recoloured cream | the product share cards on a dark ground |
| `email-logo.png` | 648 × 144, ink on white | the masthead of every order email (shown 216 × 48) |
| `mark-a-cream.png` | the "A" of the wordmark, cut out, cream | favicon (`src/app/icon.tsx`) and Apple touch icon |

Re-make the derived files after replacing the wordmark:

```bash
python scripts/brand-assets/make_brand_assets.py     # needs Pillow
```

Order emails sent before 2026-11-11 pointed at `/email/logo` (a generated
look-alike, since removed); `next.config.ts` rewrites that address to
`email-logo.png`, so a mail client that re-fetches it shows the real logo.

### Replacing the wordmark

Ideal: a real **vector** wordmark. Provide an SVG with actual `<path>` outlines
(text converted to curves), single colour, transparent background, tight
`viewBox`. Then:

1. save it as `rareskin-wordmark.svg`
2. in `src/components/ui/logo.tsx` set `SRC` back to the `.svg` and update
   `ASPECT` to the viewBox ratio
3. keep a black-on-transparent PNG of it here too — the invoice PDF, the email
   logo and the share cards read the PNG (react-pdf and satori draw rasters)

A higher-res transparent PNG (black artwork) also works — just replace this file,
update `ASPECT` if the proportions change, and re-run the script above.

### Later

- `public/bimi/logo.svg` is still a placeholder (the ∧ on black). BIMI needs a
  real SVG Tiny-PS of the logo plus a VMC certificate and an enforced DMARC
  policy — do it when you move DMARC off `p=none`.
