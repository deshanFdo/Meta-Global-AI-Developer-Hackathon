# BlueprintTo3D

Turn a residential floor-plan image into an interactive 3D reconstruction. Muse Spark 1.3 extracts strict-JSON
structure (walls, doors, windows, rooms, furniture, stairs, roof) with an optional deep furniture-audit pass;
Three.js rebuilds it locally in the browser. Walk inside in first person, click any door/window/wall/furniture to
customize it (with Muse recommendations), verify symbols with SAM 3.1, restyle with Muse Image, view in mobile AR,
walk in VR, and export to GLB, DXF and CSV.

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

- `POST /api/analyze` — live Spark 1.3 vision extraction plus optional deep furniture audit, or a labeled prebuilt
  archetype when `isDemo` is set.
- `POST /api/ask` — plan Q&A via Muse Wonder with Spark fallback, else a labeled local heuristic.
- `POST /api/recommend` — door/window product recommendation for one opening (style, material, color + reason).
- `POST /api/texture` — Muse Image finishes (facade, floor, roof) applied as tiling textures.
- `POST /api/sam` — SAM 3.1 symbol grounding, one concept per request, overlaid on the source image.
- `GET /api/health` — key status and model IDs.

## Current limits

Single-floor 3D view. Dimensions, roof shape, furniture and heights may be inferred; confidence is the model's
self-estimate. SAM boxes assume an unrotated raster source. AR needs a mobile browser (page URL opened on the
phone); VR needs a headset and a WebXR browser. Cost figures are placeholder demo rates. Answers do not certify
structural safety or code compliance. Before public deployment, add authentication and request quotas to protect
API spend.

## Demo script (2 minutes)

1. Load the Nordic Villa sample — orbit the 3D model, click a door to swing it open.
2. Click Walk inside — WASD + Space through the rooms, E opens what you're looking at, click customizes it.
3. Upload a real plan with the deep furniture pass — show the source-vs-2D comparison and evidence notes.
4. Run SAM verification — show boxes on the source image; generate the three Image textures.
5. View in AR on a phone, or enter VR: trigger opens, grip restyles. Download the GLB.

## Walk controls

WASD/arrows walk · Space jump · Shift run · mouse look · E open/close targeted door or window ·
click customize targeted element · F fullscreen · Q back to orbit · Esc pauses (click to resume).
