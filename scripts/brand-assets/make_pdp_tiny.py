"""Run from the repo: `python scripts/brand-assets/make_pdp_tiny.py` (needs Pillow).

Make the gallery's strip thumbnails: public/images/pdp/<slug>/<stem>-160.webp from the 640 px file next to it.

The strip under the PDP gallery shows each photograph in a ~50 px square, but it used the 640 px file (14-50 KB each,
about 190 KB for the six), all of it fetched in the first screen next to the main picture. 160 px is 3x the box at 1x and
still sharp at 3x density, at 3-6 KB a file. Safe to re-run: it only writes the -160 files.
"""
import pathlib
import sys
from PIL import Image

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parents[2])
W = 160
total = 0
for src in sorted((ROOT / "public" / "images" / "pdp").glob("*/*-640.webp")):
    out = src.with_name(src.name.replace("-640.webp", f"-{W}.webp"))
    im = Image.open(src).convert("RGB")
    h = round(W * im.height / im.width)
    im.resize((W, h), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
    total += out.stat().st_size
    print(out.relative_to(ROOT), (W, h), out.stat().st_size, "bytes")
print("total", total, "bytes")
