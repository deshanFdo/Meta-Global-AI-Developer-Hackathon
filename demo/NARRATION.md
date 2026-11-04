# Full demo script v2 — say / do / see (with built-in voiceover)

The app now narrates itself: the **tour speaks every scene** and walk mode has a
**Narrate walk** button. Your job is only: press record, click twice, walk a little.
Target: 2:20 finished video (hard max 3:00).

## Setup (5 min before)
1. `http://localhost:3000`, load **Nordic Villa**, volume up, unmuted (top bars show mute state).
2. Close notifications. Browser 100%, 1080p screen.
3. Recorder: Xbox Game Bar (Win+G) → record. Check "record audio" is ON.
4. Do ONE dry run of the tour (no recording) so doors end open — then reload the page for a clean take.

## PART 1 — Tour, 0:00–~1:15 (you do nothing but watch)

Click **Play tour**, then record. The camera, captions, doors and voice run themselves:

| Time | What you SEE | What you HEAR (built in) |
|---|---|---|
| 0:00 | Wide villa, letterbox bars, caption card | "Every renovation starts with a drawing nobody can truly read. Watch this flat floor plan become a house you can walk through." |
| 0:08 | Roof lifts, camera swoops | "Lift the roof. Every room, door, and window — extracted by AI, down to the centimeter." |
| 0:14+ | Room fly-throughs, doors swing open with sounds | Rotating lines: "Doors and windows that actually open…" / "Each space measured…" / "Nothing here is decoration…" / "Move walls, swap styles…" / "Designed by AI. Finished by you." |
| ~0:50 | Shadows sweep 8 AM → 6 PM | "Drag the sun across the sky. Check every shadow before you commit to a single brick." |
| ~1:00 | Night falls, windows glow warm | "And after dark, every room glows exactly where your lamps will be." |
| ~1:07 | Wide beauty shot | "Blueprint to 3D. Now — walk it yourself." |

Do NOT talk over it. Let captions + voice carry. If a beat lags, keep recording — trim later.

## PART 2 — Walk, ~1:15–2:05 (you walk, voice guides)

Click **Walk it live** (end of tour) → click to lock the mouse → click **Narrate walk**.
Choreograph to the voice:

| Voice line (built in) | What YOU do |
|---|---|
| "This is not a render. I'm walking the actual plan —" | Walk forward (W) through the biggest room. |
| "— real collision, real doors." | Bump a wall once (proves collision), stop at a closed door. |
| "This opening deserves better than a basic door, so let us ask Muse what belongs here." | Click the door → panel opens → click **Recommend**. |
| "A glass sliding door. Applied — instantly." | Click **Apply suggestion** as the line lands. |
| (walk-2) "Verify with AI segmentation…" | Press Q (back to orbit), open Verify tab, run SAM. |
| "…export to real CAD tools…" | Export tab → download GLB + DXF (show the files). |
| "…or step into AR and VR." | Click View in AR (show phone screen if possible). |
| "Blueprint to 3D — from paper plan to house in sixty seconds." | Wide orbit shot, hold 3 seconds. STOP recording. |

## PART 3 — Finish (15 min in CapCut)
1. Trim head/tail. Add title card (first 2s): "BlueprintTo3D — Meta Global AI Developer Hackathon".
2. Optional: auto-captions on top (tour already has captions; walk benefits from them).
3. Low background music UNDER everything at 10–15% volume (tour voice must dominate).
4. Export 1080p MP4 → upload unlisted → submit. Cut a 60s version (tour only) for X.

## Full voiceover transcript (all 12 clips, in order)
1. tour-establishing: "Every renovation starts with a drawing nobody can truly read. Watch this flat floor plan become a house you can walk through."
2. tour-roof: "Lift the roof. Every room, door, and window — extracted by AI, down to the centimeter."
3. tour-room-1: "Doors and windows that actually open. Go ahead — click anything."
4. tour-room-2: "Each space measured, labeled, and ready to remodel."
5. tour-room-3: "Nothing here is decoration. Everything you see can change."
6. tour-room-4: "Move walls, swap styles, make it yours — with full undo."
7. tour-room-5: "Designed by AI. Finished by you."
8. tour-sun: "Drag the sun across the sky. Check every shadow before you commit to a single brick."
9. tour-night: "And after dark, every room glows exactly where your lamps will be."
10. tour-finale: "Blueprint to 3D. Now — walk it yourself."
11. walk-1: "This is not a render. I am walking the actual plan — real collision, real doors. This opening deserves better than a basic door, so let us ask Muse what belongs here. A glass sliding door. Applied — instantly."
12. walk-2: "Verify with AI segmentation, export to real CAD tools, or step into AR and VR. Blueprint to 3D — from paper plan to house in sixty seconds."

Room lines are generic by design (room names differ per house) — the on-screen captions
carry the specific names and areas. Voice files live in `public/audio/` and ship with the app.
