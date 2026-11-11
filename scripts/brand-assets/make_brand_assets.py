"""Run from the repo: `python scripts/brand-assets/make_brand_assets.py` (needs Pillow).

Derive the raster brand assets from the ONE real artwork, public/brand/rareskin-wordmark.png
(1487 x 331, black on transparent).

  public/brand/email-logo.png   the wordmark in ink (#1b1712) on the email card's white, 648 x 144
                                (3x of the 216 x 48 it is shown at; baked on white so it stays legible
                                 in mail clients that recolour backgrounds)
  public/brand/mark-r-cream.png the wordmark's first letter, "R", in cream on transparent, tight-cropped:
                                the favicon / app-icon glyph
"""
import pathlib
import sys
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else str(pathlib.Path(__file__).resolve().parents[2])
src = Image.open(f"{ROOT}/public/brand/rareskin-wordmark.png").convert("RGBA")
W, H = src.size
alpha = src.getchannel("A")

# ── email logo ─────────────────────────────────────────────────────────
INK = (0x1B, 0x17, 0x12)
OUT_W = 648
OUT_H = round(OUT_W * H / W)
mask = alpha.resize((OUT_W, OUT_H), Image.LANCZOS)
logo = Image.new("RGB", (OUT_W, OUT_H), (255, 255, 255))
logo.paste(Image.new("RGB", (OUT_W, OUT_H), INK), (0, 0), mask)
logo.save(f"{ROOT}/public/brand/email-logo.png", optimize=True)
print("email-logo.png", logo.size, "show at 216 x", round(216 * H / W))

# ── the "R": first glyph of RARESKIN, found as the 1st run of non-empty columns ──
band = alpha.crop((0, int(H * 0.40), W, H))          # the big letters only (skip "THE")
cols = [band.crop((x, 0, x + 1, band.height)).getbbox() is not None for x in range(W)]
runs, start = [], None
for x, on in enumerate(cols):
    if on and start is None:
        start = x
    if not on and start is not None:
        runs.append((start, x)); start = None
if start is not None:
    runs.append((start, W))
print("glyph column runs:", runs)
x0, x1 = runs[0]                                      # R, A, R, E, S, K, I, N
glyph_alpha = alpha.crop((x0, 0, x1, H))
bbox = glyph_alpha.crop((0, int(H * 0.40), glyph_alpha.width, H)).getbbox()
top = int(H * 0.40) + bbox[1]
glyph_alpha = glyph_alpha.crop((bbox[0], top, bbox[2], H))
CREAM = (0xFA, 0xFA, 0xF7)
a = Image.new("RGBA", glyph_alpha.size, CREAM + (0,))
a.putalpha(glyph_alpha)
a.save(f"{ROOT}/public/brand/mark-r-cream.png", optimize=True)
print("mark-r-cream.png", a.size)

# ── the cream wordmark, for share cards on dark grounds ───────────────────
cream = Image.new("RGBA", src.size, CREAM + (0,))
cream.putalpha(alpha)
cream.save(f"{ROOT}/public/brand/rareskin-wordmark-cream.png", optimize=True)
print("rareskin-wordmark-cream.png", cream.size)

# ── the web mask: what <Logo> paints (a CSS mask), at the size the screen needs ─────
# The wordmark is shown 96-224 px wide (2x = 448 px at most), so the 1487 px original (42 KB) is ~3x
# larger than any screen can use, and it sits in the critical path of every first load. A 640 px lossless
# WebP keeps the edges clean at 2x and is a fraction of the size. Only the alpha matters to a mask.
WEB_W = 640
WEB_H = round(WEB_W * H / W)
web_alpha = alpha.resize((WEB_W, WEB_H), Image.LANCZOS)
web = Image.new("RGBA", (WEB_W, WEB_H), (0, 0, 0, 0))
web.putalpha(web_alpha)
web.save(f"{ROOT}/public/brand/rareskin-wordmark-web.webp", lossless=True, quality=100, method=6)
print("rareskin-wordmark-web.webp", web.size)
