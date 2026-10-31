# BlueprintTo3D

Turn a residential floor-plan image into an interactive 3D reconstruction. Muse Spark 1.3 extracts strict-JSON
structure (walls, doors, windows, rooms, stairs, roof) with an optional deep verification pass; Three.js rebuilds
it locally in the browser. Remodel everything in the Build tab (move/add/delete with undo), walk inside in first
person, click any element to customize it (with Muse recommendations), verify symbols with SAM 3.1, restyle with
Muse Image, view in mobile AR, walk in VR, and export to GLB, DXF and CSV.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your META_API_KEY
npm run dev                  # http://localhost:3000
```

Without a key the app still runs: the three labeled samples work fully offline, and plan Q&A falls back to a
clearly labeled on-device geometry summary. Live uploads without a key return 503 and never substitute sample data.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Pipeline

- `POST /api/analyze` — live Spark 1.3 vision extraction plus optional deep verification pass, or a labeled
  prebuilt archetype when `isDemo` is set.
- `POST /api/ask` — plan Q&A via Muse Wonder with Spark fallback, else a labeled local heuristic.
- `POST /api/recommend` — door/window product recommendation for one opening (style, material, color + reason).
- `POST /api/texture` — Muse Image finishes (facade, floor, roof) applied as tiling textures.
- `POST /api/sam` — SAM 3.1 symbol grounding, one concept per request, overlaid on the source image.
- `GET /api/health` — key status and model IDs.

## Editor

- Build tab: select / move / add-wall / add-door / add-window / add-decor / measure tools, undo + redo
  (Ctrl+Z/Y), element lists with delete. New walls snap to 0.25 m and 15° angles.
- Furniture catalog (28 pieces): sofas (2/3-seat), beds, dining sets, bath, office and decor. Click to place
  with a live ghost preview (R rotates), then drag, recolor, resize or swap variants.
- Everything is editable: wall geometry, height and thickness, all opening styles and dimensions, roof shape
  and finishes. Wall delete cascades to its openings; rooms keep no stale references.
- Start from a blank canvas to design from scratch, or from AI extraction.
- Projects autosave to the browser, with named slots and JSON export/import in the Export tab.

## Current limits

Single-floor 3D view. Dimensions, roof shape, furniture and heights may be inferred; confidence is the model's
self-estimate. SAM boxes assume an unrotated raster source. AR needs a mobile browser (page URL opened on the
phone); VR needs a headset and a WebXR browser. Cost figures are placeholder demo rates. Answers do not certify
structural safety or code compliance. Before public deployment, add authentication and request quotas to protect
API spend.

## Demo script (2 minutes)

1. Load the Nordic Villa sample — orbit the 3D model, click a door to swing it open.
2. Build tab: drag a wall, draw a new one, add a window to it, undo once.
3. Click Walk inside — WASD + Space through the rooms, E opens what you're looking at, click customizes it.
4. Run SAM verification, sweep the sun-time slider, snapshot a PNG.
5. View in AR on a phone, or enter VR: trigger opens, grip restyles. Export GLB/DXF/CSV.

## Walk controls

WASD/arrows walk · Space jump · Shift run · mouse look · E open/close targeted door or window ·
click customize targeted element · F fullscreen · M mute · Q back to orbit · Esc pauses (click to resume).
