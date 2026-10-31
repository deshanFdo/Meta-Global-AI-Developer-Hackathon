# Demo video — shot script (target 2:30, hard max 3:00)

Rubric weight: Demo is 25% of the score. Requirements: working, impressive, 3-minute video.
Record at 1080p with Xbox Game Bar (Win+G → record) or OBS. One continuous take, no cuts if
possible — cuts make judges suspect fakery. Narrate while doing (phone earbuds mic is fine).

## Setup (before pressing record)
- Fresh load http://localhost:3000, villa sample loaded, orbit view, day lighting.
- Close other tabs/notifications. Zoom browser to 100%.
- Have a phone ready for the AR shot (same Wi-Fi, page open).

## Shots

### 0:00–0:15 — Hook (problem)
- Show the SOURCE floor plan image fullscreen for 3 seconds.
- Say: "This flat drawing is how 90% of homeowners plan a renovation — and nobody can
  feel a space from lines on paper. Watch it become a house you can walk through."

### 0:15–0:50 — AI extraction (live proof)
- Click Urban Loft sample (fast, no waiting) — OR upload a real plan if confident.
- Scroll the 2D source-vs-reconstruction comparison slowly.
- Say: "Muse Spark reads walls, doors, windows, rooms and furniture into strict 3D data —
  then a second AI pass audits every item, and SAM independently verifies symbols on the plan."

### 0:50–1:20 — Orbit: alive house
- Orbit around slowly, toggle roof off/on, click 2 doors open, drag sun slider 9:00 → 18:00.
- Generate one texture (floor), switch to night lighting for 3 seconds (window glow).
- Say: "Every door and window opens. Sunlight is fully controllable, finishes generate with Muse Image."

### 1:20–1:50 — Walk inside (the money shot)
- Click Walk inside. Walk forward through a doorway (open it with E first).
- Click a door → panel opens → click Recommend → Apply suggestion.
- Say: "First-person walkthrough with collision and jumping. Click anything to customize it —
  Muse tells you what belongs in that exact opening."

### 1:50–2:10 — Build
- Back to orbit (Q). Build tab: drag a wall, draw a short wall, add a window to it, undo once.
- Flash the Verify tab SAM boxes for 3 seconds.
- Say: "And it's a real editor — move, add, delete, undo. SAM cross-checks the AI's work."

### 2:10–2:30 — AR + close
- Phone shot: View in AR → place tabletop model on desk (film phone with webcam, or
  screen-record the phone itself).
- Click Export GLB. End on the orbit view slowly auto-rotating.
- Say: "View it in AR, export to GLB, DXF and CSV. BlueprintTo3D — from paper plan to
  house in sixty seconds."

## Rules
- DO show: real clicks, real waiting (cut only if inference exceeds 20s — say so on camera).
- DO NOT: fake anything, use a slideshow, exceed 3:00, include API keys on screen.
- Export 1080p MP4. Upload unlisted to YouTube + attach/post per submission form.
