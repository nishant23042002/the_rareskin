# THE RARESKIN: homepage asset prompt sheet

Production prompts for the nine homepage pictures in `public/images/assets-manifest.json`. The manifest is the source of truth for file names, pixel sizes, aspect ratios, focal points and alt text; this sheet is how to produce the pixels.

**Status (2026-11-06):** the hero (16:9 + native 4:5) and the three product cards are **final** (generated plates + the approved flacon pixels composited; see "Results" under sections 1-4). The other five files are still tonal placeholders at the exact final size. To ship a picture: replace the file at the same path (same aspect ratio), set its `status` to `"final"` in the manifest, **and bump `assetVersion` in the manifest** (Next's image optimizer caches by URL and cannot be invalidated; the components request `<file>?v=<assetVersion>`). `pnpm home:images check` verifies size, ratio and weight.

## 0. Ground rules (read first)

**Spec decision (2026-11-06): the approved mockups win over the creative brief.** The homepage must match the 15 finished PDP images (`design-explorations/packaging-renders/`, local only, gitignored).

| | Used | Brief asked (not used) |
|---|---|---|
| Flacon | 50 ml heavy-base rectangular clear glass, thick solid base | optical flint crystal, same idea |
| Cap | matte black, fine leather-like grain, polished silver collar | magnetic matte black or brushed gunmetal |
| Label | white matte, straight edges: `THE RARESKIN®` / name / `ESSENTIALS \| 50ml` | `EXTRAIT DE PARFUM · 50 ML / 1.7 FL. OZ.` on cotton-rag |
| Liquid | crystal-clear, colourless | pale champagne to amber/cognac |
| Spelling | on the label as approved (`AUREVAN`); in storefront copy and alt text `AURÉVAN`, `ORVÉLIS`, `VAYRÉN` | accents everywhere |
| Concentration | never printed (the site states no numbers) | "30%+ extrait" |
| Notes | the catalogue: AURÉVAN citrus, bergamot / white florals / musk, cedar; ORVÉLIS spices / amber, woods / vanilla, patchouli; VAYRÉN spices / leather, oud / smoke, amber | brief's richer note lists used only as mood |

**Never let a generator draw the bottle.** Generators redraw labels and caps wrongly. Every asset with a flacon is a *composite*: generate a product-free plate, then place the approved flacon pixels (the hero renders in `design-explorations/packaging-renders/heroes-2000/sources/<sku>.webp`, label art `shot0x-<sku>/sources/approved_label_hero.png`) with the shared compositor (`shot02-aurevan/solo_build.py` → `shot01-aurevan/duo_build.py` → `pdp-aurevan/pdp_build.py`: cap matte, clear-glass delta, contact shadow, reflection). Measure the pedestal top edge from many rows/columns before placing, and verify with an overlay.

**Lessons from the PDP set (apply to every plate prompt):**
- No product words in a plate prompt ("perfume", "fragrance", "bottle", "luxury campaign") — they make generators add bottles. Say "still-life set" and end with `no bottles`.
- Generators group props into one cluster and ignore "leave a gap". Ask for **exactly N small objects, far apart, never touching, each about one tenth of the frame wide, with a wide empty stretch between them**, then place the flacon from the measured gap.
- Clear glass shows whatever is behind it: keep the area behind the flacon plain (wall / plinth), props at its feet, never overlapping.
- Plain fills of a generator watermark only work on one material; crop or regenerate otherwise.
- Handwriting, labels and boxes: generators garble text. Ask for unreadable cursive or out-of-focus pages; type anything legible yourself.
- Dark sets: give the black cap a rim light and a faint warm pool; compare glass brightness at three strengths before choosing.

**Photography standard (all assets):** commercial still life, Hasselblad H6D-100c or Phase One XF IQ4 with a 100 mm macro (50–85 mm where noted), f/8–f/11, directional window light with soft diffusion cards, real materials and fine grain, no CGI gloss, no HDR halos, no teal-and-orange grade, colour true and uncrushed. Export sRGB, WebP quality 82–88, keep each file under ~450 KB where the image allows.

**Engines.** The PDP set used Kling `kling-image-v3_0_omni` (`text_to_image`, `image_to_image`; about 2 credits per 2k image; check which aspect ratios it accepts, otherwise generate 1:1 or 3:2 and crop). Each prompt below also has a FLUX.1 [dev/pro] form (plain prose, add the camera line) and a Midjourney v6 form (`--style raw --v 6`, `--ar` set, `--no` list).

---

## 1. Hero

`hero-trilogy.webp` 2560×1440 (16:9) · `hero-trilogy-mobile.webp` 1600×2000 (4:5) · **route: composite** · LCP image

**Layout truth.** The approved hero is a split (text panel + picture half). From 1280 px the picture box is about square and shows the **right** of the 16:9 frame (`object-position: 100% 50%`); below 1280 px the 4:5 crop is used. So:
- 16:9: the left third is empty wall (title space for a possible full-bleed layout); the trio sits at x 35–91%. The split shows about 54% of the frame's width at `object-position: 72% 50%` (manifest), which leaves ~50 px of wall either side of the outer flacons at 1440×900. Wider boxes show more wall.
- 4:5: a **separate native plate** (the trio is wider than a 4:5 crop of the 16:9), all three inside the central 62% band vertically (the phone box is landscape and crops top and bottom).
- `sizes` for a cropped picture must describe the *scaled* width (see the manifest's `sizesNote`): the 16:9 hero is scaled to ~1300 px wide inside an almost square box.

**Plate (product-free).** *Prose / FLUX:* A quiet sculptural still-life set photographed straight on, camera level with the middle pedestal top and slightly above it. Three stepped, precisely machined pedestals of honed cream travertine with fine horizontal banding stand in the right half of the frame, in a row, left one low, middle one tallest, right one middle height, their tops perfectly flat and bare, nothing on them; thin clear gaps between them. A smooth limewashed plaster wall in warm pale sand fills the frame behind them, the left 40% of the frame completely bare wall. Diffuse 45-degree directional window light from the upper left at about 4500 K, one soft-edged shadow bar on the wall, soft fill. Real materials, fine grain, no plastic gloss. Calm, monolithic, quiet luxury. No text, no logos, no people, no bottles.

*Midjourney:* `quiet sculptural still-life set, three stepped honed cream travertine pedestals in the right half, bare flat tops, limewashed sand plaster wall, left 40% empty wall, diffuse 45-degree window light from upper left, one soft shadow bar, Hasselblad H6D-100c 100mm f/11, real materials, fine grain --ar 16:9 --style raw --v 6 --s 40 --no bottle, text, logo, people, flowers, plants`

**Composite.** Place the three approved flacons (AURÉVAN left, VAYRÉN centre-high, ORVÉLIS right) on the measured pedestal tops at the same scale (label ≥ 12% of the *frame* width is not possible at 16:9, so target flacon height ≈ 38% of frame height), contact shadows falling right, clear-glass delta per flacon. Then crop the 4:5 from the same composite (not a re-generation) so both match.

**QA:** three labels legible at 100%, chevron A of RARESKIN present, caps read against the wall, trio inside the safe boxes, no generator logo left.

**Results (2026-11-06).** Plates: Kling `kling-image-v3_0_omni` `text_to_image`, 2 credits each: 16:9 `Aagk1btE…` (2720×1536, asked as a middle-tallest trio, came back as a left-low / right-tall staircase: AURÉVAN low, VAYRÉN middle, ORVÉLIS tall) and 3:4 `AdausPJY…` (1760×2368, cropped to 4:5). Flacons at scale 0.42 (desktop) / 0.50 (mobile), light from the left. The 16:9 is trimmed to 2524×1420 above the generator logo. Build: `design-explorations/packaging-renders/homepage/build_all.py` (local, gitignored).

---

## 2. AURÉVAN product

`aurevan-product.webp` 1600×2000 (4:5) · **route: composite** · tile in `collection.tsx`

*Plate:* A still-life set photographed straight on, 100 mm, eye level with the top of the pedestal. A single honed pale limestone pedestal, perfectly flat bare top, stands centred on a pale honed stone floor against a seamless limewashed ivory plaster wall. At its foot, on the floor, exactly three small objects far apart and never touching, each about one eighth of the frame wide: half a bergamot (yellow-green, thick pitted dimpled rind, pale flesh with segments) cut face up at the left; one white gardenia with two dark green leaves at the right; one small sliver of raw pale cedar. A fold of undyed brushed cashmere low at the far right. Early-morning sun at 5000 K, one crisp diagonal sun bar from the upper left across the wall and the stone, soft diffusion, pale gold caustics on the limestone. Fresh, airy, refined. No text, no logos, no people, no bottles.

*Midjourney:* `still-life set, single honed pale limestone pedestal centred, bare flat top, ivory limewash wall, half bergamot yellow-green pitted rind, one white gardenia, sliver of raw cedar at the foot, morning sun bar from upper left, pale gold caustics, 100mm f/8 --ar 4:5 --style raw --v 6 --s 40 --no bottle, text, logo, lemon, lime`

**Composite:** approved AURÉVAN flacon centred on the pedestal top, label 30–34% of the frame width. **Safe zones:** nothing important in the lower-right 12% or the vertical centre of the right edge (tile chevron and dots).

**Results.** Plate `Ab-XyW3C…` (3:4): the plate drew a *round marble stool* (not a block) and, again, a round **lime** instead of a bergamot (its hue was already yellow-green, so no recolour helps). The lime was removed (colour mask + diffusion fill, not touching the pedestal foot) and replaced by the real pebbled bergamot cut out of the Shot 02 re-roll (`shot02-aurevan/sources/bergamot_sprite.png`). Flacon scale 0.66.

---

## 3. VAYRÉN product

`vayren-product.webp` 1600×2000 (4:5) · **route: composite**

*Plate:* A still-life set photographed straight on, 100 mm, eye level with the pedestal top. A single black volcanic basalt pedestal with a bare flat top, centred, against a charcoal limewashed plaster wall, on a black honed stone floor. At its foot, far apart and never touching, exactly three small objects each about one tenth of the frame wide: one rough bark-like oud wood chip lying flat (clearly not an incense stick) with one very thin thread of pale grey smoke rising straight up; a short strip of dark supple bridle leather; a few black peppercorns scattered. One narrow amber blade of low light from the left across the wall, deep soft shadows, a faint warm pool on the wall behind the pedestal top. Bold, nocturnal, restrained. No text, no logos, no people, no bottles.

*Midjourney:* `nocturnal still-life set, black basalt pedestal centred with bare flat top, charcoal plaster wall, oud wood chip with a thin smoke thread, strip of dark bridle leather, black peppercorns at the foot, one narrow amber blade of light from left, chiaroscuro, 100mm f/8 --ar 4:5 --style raw --v 6 --s 40 --no bottle, text, logo, incense stick, candle`

**Composite:** rim light on the cap and glass edge; glass positive-light factor ~0.5 on dark scenes (1.1 made the clear glass milky grey in the PDP set). Keep the smoke inside the central 60%.

**Results.** Plate `AVfv2FbZ…` (3:4): a black disc pedestal, oud bark with a thin smoke thread, pepper, and a small dark brass-and-leather scoop instead of the asked leather strip. Flacon scale 0.66, glass light 0.8, rim 0.5 (0.5 / 0.34 left the clear glass nearly invisible on the near-black wall).

---

## 4. ORVÉLIS product

`orvelis-product.webp` 1600×2000 (4:5) · **route: composite**

*Plate:* A still-life set photographed straight on, 100 mm, eye level with the block top. A single block of reclaimed solid walnut with a visible grain and a bare flat top, centred, on a honed travertine floor against a warm sand limewashed wall. At its foot, far apart and never touching, exactly four small objects each about one tenth of the frame wide: two raw vanilla pods lying side by side; one curl of cinnamon bark; one star anise; a small honey travertine slab. Golden-hour sun at 3400 K from the upper left, one soft-edged sun bar, honeyed light, soft diffusion. Warm, timeless, sophisticated. No text, no logos, no people, no bottles.

*Midjourney:* `warm still-life set, reclaimed solid walnut block centred with bare flat top, sand limewash wall, two raw vanilla pods, cinnamon bark curl, one star anise at the foot, golden-hour sun bar from upper left, honeyed light, 100mm f/8 --ar 4:5 --style raw --v 6 --s 40 --no bottle, text, logo, bowl, dish`

**Composite:** the ORVÉLIS hero source is 1254 px native: sharpen 0.35 on the opaque parts, glass neutral 0.8 on warm sets.

**Results.** Plate `ATPrrRtL…` (3:4): the walnut block is seen at 3/4 (top face a rhombus, the flat front-view flacon stands on its centre), and the plate **added a honeycomb with honey** that was not asked for (not in the catalogue notes; flagged in the manifest). Flacon scale 0.66.

---

## 5. Atomizer macro

`extrait-atomizer-craft.webp` 1600×2000 (4:5) · **route: generative** (no label in frame) · `why-extrait.tsx`

*Prose / FLUX:* Extreme macro of a micro-diffusion atomizer: a polished silver nozzle and collar in the upper third releasing an ultra-fine crystalline suspension mist that fills the lower two thirds, every droplet glinting. Hard backlight with a soft rim, a black flag on the left, black background falling to warm grey, very shallow depth of field, optical glass edge just visible. Pure, precise, quiet. Shot with a 100 mm 2x macro at f/8, focus-stacked. No text, no numbers, no logo, no label, no hand.

*Midjourney:* `extreme macro of a silver atomizer nozzle releasing an ultra-fine crystalline mist, backlit, droplets glinting, black background to warm grey, shallow depth of field, Laowa 100mm 2x macro f/8 --ar 4:5 --style raw --v 6 --s 60 --no text, numbers, label, logo, hand, face, bottle label`

**QA:** no legible characters anywhere; never caption it with a concentration figure (see `claimsToVerify`).

---

## 6. Atelier story

`atelier-story.webp` 2000×1500 (4:3) · **route: generative** · `atelier-story.tsx`

*Prose / FLUX:* A perfumer's oak workbench seen from 35 degrees above in soft northern daylight from a window at the left: an open cotton-rag formulation journal with unreadable handwritten formulas in brown ink, paper blotter strips (mouillettes) fanned beside it, a row of small amber glass laboratory vials, a brass pipette, a few unlabelled prototype glass flacons with black caps. Quiet, intimate, slightly worn; shallow depth of field on the journal. 50 mm, f/5.6, 5600 K. The handwriting is illegible cursive; no printed labels, no readable words, no logos, no people.

*Midjourney:* `perfumer's oak workbench from above, open handwritten journal with illegible cursive, paper blotter strips fanned, amber glass vials, brass pipette, unlabelled prototype glassware, soft northern window light from the left, 50mm f/5.6 --ar 4:3 --style raw --v 6 --s 60 --no readable text, labels, logo, people, face, brand`

**QA:** zoom into the journal at 200% — no readable words; no bottle label that could be mistaken for the product.

---

## 7. Unboxing

`unboxing-experience.webp` 2400×1600 (3:2) · **route: composite** · `unboxing-ritual.tsx`

**Needs confirmation first** (`claimsToVerify`): a midnight-black presentation box, velvet insert, debossed sleeve and wax-sealed note are **not approved packaging** (the approved cartons are powder blue, pastel blue-to-pink and white). Do not publish this picture until the founder confirms the box exists or is planned.

*Plate (box without the product):* A midnight-black soft-touch rigid presentation box seen at 45 degrees on a dark honed stone surface, lid lifted off and leaning behind it, the interior lined with black velvet with one rectangular cut-out for a tall 50 ml bottle and one small cut-out for a vial, both empty. Beside the box a black sleeve with a blind-debossed monogram (no readable text), and a small cotton-rag note folded and closed with a dark red wax seal. One warm key light from the upper left at 3200 K, a black bounce on the right, deep soft shadows. 85 mm, f/8. No bottle, no vial, no readable text, no logos, no people.

*Midjourney:* `midnight black soft-touch rigid presentation box open at 45 degrees on dark stone, black velvet insert with empty cut-outs, blind-debossed black sleeve, folded cotton note with dark red wax seal, one warm key light from upper left, deep shadows, 85mm f/8 --ar 3:2 --style raw --v 6 --s 50 --no bottle, vial, text, logo, people`

**Composite:** the approved flacon into the 50 ml cut-out; the 10 ml vial **only if** its label art is approved (otherwise an unlabelled vial).

---

## 8. Discovery set

`discovery-set-10ml.webp` 1600×2000 (4:5) · **route: composite** · `discovery-set.tsx` (an admin-uploaded set photo wins over this)

Frame: half-width column at ≥ 900 px, 4:3 band below, so keep the three atomizers in the central 56% band vertically.

*Plate:* A still-life set on a sheet of brushed aluminium, photographed 20 degrees above: an architectural matte slide-case (dark grey, rectangular, three cut-outs) partly slid open, the three cut-outs empty. Cool metal against warm light: a single softbox from the upper left with a specular rim on the aluminium edges. 100 mm, f/11. Minimal, crisp. No bottles, no text, no logos, no people.

*Midjourney:* `brushed aluminium surface, matte dark grey architectural slide-case partly open with three empty cut-outs, single softbox from upper left, crisp specular rim, 100mm f/11 --ar 4:5 --style raw --v 6 --s 40 --no bottle, vial, text, logo, people`

**Composite:** three 10 ml atomizers (clear glass, black cap, **unlabelled** until a 10 ml label is approved) in the cut-outs.

---

## 9. Scent on skin

`scent-on-skin-lifestyle.webp` 2560×1440 (16:9) · **route: generative** · `scent-on-skin.tsx`

The words sit over the picture (scrim: left on desktop, bottom on a phone where the frame is 4:5): **subject in the right half**, left half soft and dark; the subject must also fit the central 4:5 band. No face.

*Prose / FLUX:* High-fashion editorial detail of a neck and collarbone, a single fingertip or a fine atomizer mist at the pulse point, warm natural window light from the right at about 3800 K falling off softly to the left, fine peach-fuzz and a trace of mist caught in the light, a soft linen or cashmere neckline at the edge. Tonal, unretouched, quiet and intimate. 85 mm, f/2.8, eye level with the collarbone. Cropped below the jaw: no face, no eyes, no logo, no bottle, no text.

*Midjourney:* `editorial detail of a neck and collarbone, fine mist at the pulse point, warm window light from the right falling off to the left, soft cashmere neckline, tonal, unretouched, 85mm f/2.8 --ar 16:9 --style raw --v 6 --s 80 --no face, eyes, lips, logo, text, bottle, jewelry`

**QA:** generated skin must not resemble an identifiable person; model release for any real-person reference (`claimsToVerify`).

---

## 10. Card directions without a pedestal ("The Three", alternatives)

The pedestal cards (sections 2-4) stand the flacon on furniture with the ingredients on the floor below: the bottle shrinks to about 45% of the frame and the picture is busy. Four alternative directions put the flacon **directly on the ground** (never a pedestal, stool, block or stand) at about 62-64% of the frame height:

| concept_id | direction | surface |
|---|---|---|
| `grounded_stone` | direct earth and stone, ingredients lying beside the base | limestone / raw oak / basalt |
| `chiaroscuro_studio` | plaster sweep, window-frame shadows, merges with the page (`--paper` #fafaf7) | off-white plaster |
| `mineral_bed` | low-angle macro, base set into the bed (foreground ridge pasted over the foot) | marble dust / crushed spice / volcanic sand |
| `liquid_caustics` | shallow water film or optical-glass plate, golden caustics beside the bottle | water / glass |

- **Prompts:** `public/images/prompt-manifest.json` holds all 12 (4 concepts x 3 fragrances): `prompt` (product-free plate prompt for FLUX / Kling), `midjourney` (v6 string with `--ar 4:5 --no ...`), `negative`, `composite` (where and how the approved flacon goes on), `verify`. `pnpm home:images check` rejects a plate prompt that mentions a bottle, stand, label or similar (a generator told about one draws one).
- **Files:** `public/images/homepage/cards/<concept_id>/<slug>.webp`, 1600x2000, manifest ids `<slug>-card-<concept_id>` (tonal placeholders today).
- **Switching:** `src/config/homepage-assets.ts` (`DEFAULT_CARD_CONCEPT`). In development, or with `NEXT_PUBLIC_CARD_SWITCHER=1` at build time, a bar at the bottom of the homepage switches live (and `/?concept=<id>` opens one); it shows how many of the three pictures of each direction are final. A tile whose concept picture is still a placeholder shows the current picture.
- **Decisions kept from the first brief:** label stays `ESSENTIALS | 50ml` (not the brief's `EXTRAIT DE PARFUM · 50 ML / 1.7 FL. OZ.`) and the liquid stays crystal clear (not amber); concept 4's gold is sunlight, painted by the plate, not refracted through the approved bottle.
- **Results so far (2026-11-06, one picture at a time):** `grounded_stone` / AURÉVAN is **final** (plate `AXVReB4Y…`, 2 credits). The generator drew a diagonal limestone slab, a real pebbled bergamot half back-left and one tight group of six petals back-right (not the asked wide empty stretch), light from the RIGHT. The flacon (scale 1.08, about 60% of the frame height) stands at the slab's front; the plate's own petals were cleaned out (they showed through the clear glass like petals inside the bottle) and three were re-placed beside the base. Build: `design-explorations/packaging-renders/homepage/card_build.py gs_aurevan`. `grounded_stone` / ORVÉLIS is **final** too (plate `ATTs1Qbz…`, 2 credits): a wide dark oak tabletop with a deep crack, terracotta wall, vanilla cut by the left frame edge and cinnamon by the right (pushed there with 'partly cut by the frame edge'), but small and far behind the flacon (it reads as depth, not as 'at the base'); flacon scale 1.04 (about 58% of the frame height). New lesson: a busy surface (oak grain, a crack) shows through the clear glass pin-sharp like a hologram, so the plate is blurred inside the bottle silhouette before compositing (`soften_behind_glass` in `card_build.py`), and dark sets need glass edges at posk 1.0 / rim 0.7 / negk 0.5. Earlier lessons: the compositor ignores the target at scale exactly 1.0 (use 0.999 or 1.001); measure the slab's front lip from a gridded close-up of the CONTACT crop (a first estimate was 50-90 px off and hung the left foot over the edge); a pasted prop patch needs a per-channel gain match to its destination (the source was in sun) or it shows as a pale box.
- **Alignment rule (2026-11-06, the user asked for it):** every card of a direction has the bottle at the same place: `BOTTLE = x 880, base y 1580, scale 1.04` in the 1760-px plate (centre of the frame, about 58% of the frame height), shared by all jobs in `card_build.py`. Measured on the exported WebPs: the ORVÉLIS and AURÉVAN labels span x 596-1003 of 1600 (centres 800.5 / 799.5) and start at y 686. So the plate must give a full-width, corner-free surface with the middle empty and the ingredients at the lower corners / frame edges; a plate that puts props or a table corner where the bottle goes cannot be used (AURÉVAN needed three plates: a diagonal slab with props in the middle, then a free-standing table corner, then the full-width floor that shipped; 6 credits for that card).
- **Two AURÉVAN plates kept (2026-11-06, on request):** v3 (full-width floor, macro props in the lower corners) is the `grounded_stone` card; v2 (a glossy limestone table, plate `AQusi21p…`) is kept as the `grounded_stone_v2` alternative ("Stone v2" in the preview bar, `cards/grounded_stone_v2/aurevan.webp`, manifest id `aurevan-card-grounded_stone_v2`, AURÉVAN only: `CARD_CONCEPT_FALLBACK` shows the grounded-stone cards on the other two tiles). Same `BOTTLE` position. For v2 the plate's bergamot sat at the back-centre, hidden behind a centred bottle and showing through the glass as a green orb, so it is cut out by colour mask (`fruit_mask`), lifted away with its reflection, and stood on the table's front right with a new contact shadow and a mirrored reflection clipped at the table lip. Caveat: v2 shows the table's thick front edge (lower 15% of the card), which is close to the brief's 'no pedestal / no stand' rule; v3 has no such edge.
- **Concept 1 (grounded_stone) is complete, 3/3 (2026-11-06):** `grounded_stone` / VAYRÉN is final (plate `Ad-x7mME…`, the second try; the first, `AfyYFwNy…`, drew a steeply tilted bordered strip of black gravel with smoke ribbons running through the floor and was discarded: 4 credits for this card). The shipped plate is a black basalt slab at a diagonal with a vent hole behind the bottle: the smoke rises behind the cap, a cognac-tan stitched leather strip is at the lower left and sharp black peppercorns at the lower right. Alignment measured on the three exports: labels x 596-1003 / 598-1003 / 598-1005 of 1600 (centres 799.5 / 800.5 / 801.5), tops y 686 / 686 / 685. The user chose AURÉVAN v3 over v2 (v2 stays as the 'Stone v2' switcher entry). Prompt lessons that worked: 'no borders, no frame, no cracks and no edges', 'grazing angle', 'smoke against the wall only', props 'partly cut by the frame edge' at the lower corners; what did not: 'large' for a prop (it filled the lower-left) and 'finely pitted ... vesicles' (gravel).
- **Concept 2 (chiaroscuro_studio) started, AURÉVAN final (2026-11-06, plate `AWR1stRM…`, first try, 2 credits):** the plate drew a bright gallery with a window at the left edge, a plaster cove (reads a little like a skate-bowl ramp) and big diagonal window-bar shadows, and a blotchy pixel-mosaic artefact on the floor. Fixes in `card_build.py`: `smooth_texture` (edge-preserving blur of the floor), `add_cast_shadow` (the compositor's contact shadow reads too faint on a near-white ground, so a long soft shadow falls away from the window), `edge_fade` in `make_card` (blends the outer 5% into `--paper` #fafaf7; measured on the export the edge ring is 235-247 against 250, versus 197-235 before). Same `BOTTLE` position. ORVÉLIS and VAYRÉN studio plates still to do (rewrite their prompts with the AURÉVAN lessons: one continuous seamless surface, no corner or edges, nothing standing on it).
- **Concept 2, ORVÉLIS final (2026-11-06, plate `Ad8hCLh4…`, first try, 2 credits):** a warm sand gallery with the window on the right edge, window-pane rectangles with a mullion, a cove and a raked-sand-like floor. Lessons: (1) the plate's floor started BELOW the shared base line (1690 vs 1580), so the bottle would have stood on the wall: shift the plate up (`shift_crop`, 168 rows), which also exposes the generator logo near the bottom, so paint it out FIRST with a patch box that clears the logo by more than the 14 px feather on every side (a box only 3 px beyond the logo left a ghost); (2) a dark-bordered plate needs `lift` + `edge_dodge` before `edge_fade`, otherwise the fade shows as a dark inner frame; (3) floor smoothing `keep` 32 removes raked-sand ripples (18 left dashes). Edge ring on the export 245-247 / 240-245 / 229-238 vs paper 250 / 250 / 247 (warm cream edges). VAYRÉN studio (the darkest variant) is next.
- **Concept 2 (chiaroscuro_studio) complete, 3/3 (2026-11-06):** VAYRÉN studio is final (plate `AeD3v-2Z…`, first try, 2 credits; 6 credits in total for the direction). Again the plate ignored 'no tiles' (a concave tiled floor, painterly patchy walls, a tiny text scribble on the wall): the scribble is cleaned out (`clean_boxes`), the whole plate smoothed (sigma 30, keep 34) so the blade of light survives and the walls read as soft plaster; the bottle stands in the plate's own pool of light. This is the dark variant: `edge_fade 0`, dark-set glass (posk 1.0 / rim 0.7 / negk 0.5 / neutk 0.5), so the 'merges with the page' claim holds for AURÉVAN and (warm cream) ORVÉLIS only. Lessons: a plate for a seamless-sweep direction tends to give a cove or a bowl and a tiled or rippled floor; smooth the floor and check that the floor starts above the base line.
- **Concept 3 (mineral_bed) complete, 3/3 (2026-11-06; plates `AUpPczL7…`, `AYIqnFw-…`, `Adjov5MV-…`, one try each, 6 credits):** the user asked to generate ORVÉLIS and VAYRÉN and composite all three at once (`card_build.py ms_all --export`). The prompt that worked (borderless bed, empty middle, props 'partly cut by the frame edge', crest 'three fifths of the way down') made Kling draw a **mound** (AURÉVAN white granules on a glossy floor, ORVÉLIS ground spice with a star anise and a quill on dark walnut, VAYRÉN a diagonal dune of black sand with oud slats and a smoke plume), whose body holds the shared BOTTLE position, so the foot is buried by `embed_foot` (the plate's own grains pasted over the bottom 50 px of the glass through a wavy clumpy mask with a thin occlusion band; a 1-D per-column jitter drew a comb of spikes, the edge is now 2-D blobs). Dark-set glass for ORVÉLIS and VAYRÉN, a halo on the black wall behind the VAYRÉN cap (the silhouette probe must ignore it). Chevron tone is set from the right-edge luminance but the dots at the bottom must stay visible too (ORVÉLIS = light although its right edge is mid-bright).
- **Concept 4 (liquid_caustics) complete, 3/3 (2026-11-06; 12 credits: two rolls of three plates):** the first roll was unusable: AURÉVAN a woman's face in the water (a floating jasmine petal made it a spa scene), ORVÉLIS a 45-degree view with a dark diagonal 'vein' and concentric ripples, VAYRÉN a steep diagonal black slab with a big leather panel (all kept as `homepage/sources/card_lq_*_plate_v1_discarded.png`). What fixed it: 'shot perfectly level and straight-on, the camera at the height of the water, the line where the wall meets the water exactly horizontal', 'no people, no faces, no hands', 'a flat, plain, evenly toned floor with no veins, no stripes, no slab edges', props as flowers / beans / chips RESTING ON STONE at the frame edge (not floating), no leather. The second roll gave a shallow stone pool (AURÉVAN, turquoise), a sand floor under huge concentric ripples (ORVÉLIS: the bottle reads as making them) and a glowing amber water band on black stone (VAYRÉN: a trough, not a floor). Compositing: the compositor's mirrored reflection (`refl` .40-.45, `refl_fade` 140-170, `refl_len` 340-420; `place_bottles.py` now takes `refl_fade`), `add_water_rings` for AURÉVAN. The amber liquid of the brief is NOT adopted: every glow is the plate's light, not refracted through the approved clear liquid. A tile can now set `dotsTone` (manifest) when the picture is bright at the right edge and dark at the bottom, or the reverse (the chevron and the dots are different places).
- **Overview of all four directions:** `design-explorations/packaging-renders/homepage/review/CARDS_ALL_DIRECTIONS_OVERVIEW.jpg`.
- **Shipping a direction:** composite, export, set `status: "final"` + real `alt` + re-measured `overlayTone` (colour of the chevron and dots over the picture), bump `assetVersion`, then set `DEFAULT_CARD_CONCEPT`. Retire the losing directions and the pedestal cards once one is chosen.

## After producing a picture

1. Export to the manifest size (or larger at the same aspect), sRGB, WebP q82–88, to `public/images/homepage/<file>`.
2. Set `"status": "final"` for that asset in `public/images/assets-manifest.json` (and fix its `alt` if the final differs) and **bump `assetVersion`** (the optimizer cache cannot be invalidated).
3. `pnpm home:images check`, then `pnpm build`.
4. Look at it in the browser at 390, 768 and 1280 px: label legible, safe zones respected, text over images still readable.
