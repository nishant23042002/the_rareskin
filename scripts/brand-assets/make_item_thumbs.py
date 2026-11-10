"""Run from the repo: `python scripts/brand-assets/make_item_thumbs.py` (needs Pillow).

Cut the square ordered-item thumbnail of each extrait from the official packshot.

Source : public/images/pdp/<slug>/01-packshot-1000.webp  (1000 x 1150, plain studio ground)
Output : public/images/pdp/<slug>/item-thumb.jpg          (480 x 480 JPEG, q86)

JPEG on purpose: the same file is used on the web, inside the invoice PDF
(react-pdf cannot draw WebP) and in email (Outlook cannot show WebP).
The crop is centred on the flacon itself (found from the pixels that differ from the
ground) with ~28% air around its larger side, so every thumbnail frames the bottle the
same way.
"""
import pathlib
import sys
from PIL import Image, ImageChops

ROOT = sys.argv[1] if len(sys.argv) > 1 else str(pathlib.Path(__file__).resolve().parents[2])
OUT = 480
for slug in ("aurevan", "orvelis", "vayren"):
    src = Image.open(f"{ROOT}/public/images/pdp/{slug}/01-packshot-1000.webp").convert("RGB")
    w, h = src.size
    ground = Image.new("RGB", src.size, src.getpixel((8, 8)))
    diff = ImageChops.difference(src, ground).convert("L").point(lambda v: 255 if v > 22 else 0)
    box = diff.getbbox()
    bx0, by0, bx1, by1 = box
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    side = int(max(bx1 - bx0, by1 - by0) * 1.28)
    side = min(side, w, h)
    x0 = int(round(min(max(cx - side / 2, 0), w - side)))
    y0 = int(round(min(max(cy - side / 2, 0), h - side)))
    thumb = src.crop((x0, y0, x0 + side, y0 + side)).resize((OUT, OUT), Image.LANCZOS)
    dest = f"{ROOT}/public/images/pdp/{slug}/item-thumb.jpg"
    thumb.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
    print(slug, "bottle bbox", box, "crop", (x0, y0, side), "->", dest)
