# Submission writeup (paste + adapt into the form)

## One-liner
Floor plan → interactive 3D house: AI extraction, first-person walkthrough, full remodeling,
AR/VR, and CAD export.

## Problem statement
Homeowners and small builders plan renovations from flat 2D drawings they can't truly read:
60M+ people use home-design apps, yet every one of them starts by painfully redrawing the
plan by hand. Mistakes surface only during construction, when fixes cost 10x. BlueprintTo3D
removes the redrawing step entirely — photograph or upload any floor plan and walk through
the house in a minute, then remodel it live before spending a dollar.

## What it does
- Muse Spark 1.3 extracts walls/doors/windows/rooms/furniture into strict 3D data, then a
  second audit pass verifies every item; SAM 3.1 independently cross-checks symbols.
- Interactive 3D twin: openable doors/windows, sun-time control, AI-generated finishes,
  day/night atmosphere.
- First-person walkthrough (collision, jump, footsteps, spatial audio-free procedural SFX),
  click-anything customization with per-opening Muse recommendations.
- Full editor: draw/move/delete walls and openings with snapping, 28-piece furniture
  catalog, undo/redo, autosave, blank-canvas mode.
- Mobile AR placement, WebXR VR walk with in-headset editing, GLB/DXF/CSV/PNG export.

## Meta models used
- muse-spark-1.3 — vision extraction, furniture audit, Q&A + recommendation fallback
- muse-wonder-1.0 — plan Q&A and per-opening recommendations (primary)
- sam-3.1 — symbol grounding / extraction verification overlay
- muse-image-1.0 — tiling facade/floor/roof finishes

## Links
- Demo video (3 min): <YOUTUBE URL>
- Live demo / repo: <URL>
- X post: <URL>
