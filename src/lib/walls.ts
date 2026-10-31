import type { HouseAnalysis, Wall } from "@/types";

// ---------------------------------------------------------------------------
// Wall graph: split walls at every junction so each run between two connection
// points is its own editable, deletable segment. Openings are remapped to the
// piece they sit on; rooms keep references to all pieces of a former wall.
// Idempotent: re-splitting an already-split model is a no-op.
// ---------------------------------------------------------------------------

interface Pt {
  x: number;
  y: number;
}

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}

function len(v: Pt): number {
  return Math.hypot(v.x, v.y);
}

/** Parameters t in (0,1) where wall b cuts wall a (with end margins). */
function cutParameters(a: Wall, b: Wall): number[] {
  const out: number[] = [];
  const d1 = sub(a.end, a.start);
  const d2 = sub(b.end, b.start);
  const l1 = len(d1);
  const l2 = len(d2);
  if (l1 < 1e-9 || l2 < 1e-9) return out;
  const margin1 = 0.03 / l1;
  const margin2 = 0.03 / l2;
  const denom = d1.x * d2.y - d1.y * d2.x;

  const interior = (t: number, margin: number): boolean => t > margin && t < 1 - margin;

  if (Math.abs(denom) > 1e-9) {
    // Proper crossing (or T-touch): solve a.start + t*d1 = b.start + u*d2.
    const dx = b.start.x - a.start.x;
    const dy = b.start.y - a.start.y;
    const t = (dx * d2.y - dy * d2.x) / denom;
    const u = (dx * d1.y - dy * d1.x) / denom;
    // Touching endpoints don't split: both must be meaningfully interior,
    // except a clean T where one endpoint lands mid-segment.
    const tIn = interior(t, margin1);
    const uIn = interior(u, margin2);
    const tEnd = !tIn && t >= -1e-6 && t <= 1 + 1e-6;
    const uEnd = !uIn && u >= -1e-6 && u <= 1 + 1e-6;
    if ((tIn && uIn) || (tIn && uEnd) || (tEnd && uIn)) {
      if (tIn) out.push(t);
    }
    return out;
  }

  // Parallel/collinear: split a where b's endpoints land on its interior.
  for (const p of [b.start, b.end]) {
    const t = ((p.x - a.start.x) * d1.x + (p.y - a.start.y) * d1.y) / (l1 * l1);
    if (!interior(t, margin1)) continue;
    const px = a.start.x + d1.x * t;
    const py = a.start.y + d1.y * t;
    if (Math.hypot(px - p.x, py - p.y) < 0.03) out.push(t);
  }
  return out;
}

function at(wall: Wall, t: number): Pt {
  return { x: wall.start.x + (wall.end.x - wall.start.x) * t, y: wall.start.y + (wall.end.y - wall.start.y) * t };
}

function projectT(wall: Wall, p: Pt): number {
  const d = sub(wall.end, wall.start);
  const l2 = d.x * d.x + d.y * d.y;
  if (l2 < 1e-12) return 0;
  return ((p.x - wall.start.x) * d.x + (p.y - wall.start.y) * d.y) / l2;
}

export function splitWallsAtJunctions(input: HouseAnalysis): HouseAnalysis {
  const walls = input.walls;
  if (walls.length < 2) return input;

  // 1. Collect cut parameters per wall.
  const cuts = new Map<string, number[]>();
  for (let i = 0; i < walls.length; i += 1) {
    for (let j = i + 1; j < walls.length; j += 1) {
      const a = walls[i];
      const b = walls[j];
      for (const t of cutParameters(a, b)) {
        const list = cuts.get(a.id) ?? [];
        list.push(t);
        cuts.set(a.id, list);
      }
      for (const t of cutParameters(b, a)) {
        const list = cuts.get(b.id) ?? [];
        list.push(t);
        cuts.set(b.id, list);
      }
    }
  }
  if (cuts.size === 0) return input;

  // 2. Build pieces (drop cuts that would leave slivers < 8 cm).
  const newWalls: Wall[] = [];
  const piecesOf = new Map<string, Wall[]>();
  for (const wall of walls) {
    const raw = (cuts.get(wall.id) ?? []).sort((p, q) => p - q);
    const kept: number[] = [];
    let prev = 0;
    const totalLen = len(sub(wall.end, wall.start));
    for (const t of raw) {
      if (t - prev < 0.08 / totalLen) continue;
      kept.push(t);
      prev = t;
    }
    if (kept.length > 0 && 1 - kept[kept.length - 1] < 0.08 / totalLen) kept.pop();
    if (kept.length === 0) {
      newWalls.push(wall);
      piecesOf.set(wall.id, [wall]);
      continue;
    }
    const bounds = [0, ...kept, 1];
    const pieces: Wall[] = [];
    for (let k = 0; k < bounds.length - 1; k += 1) {
      pieces.push({
        ...wall,
        id: `${wall.id}s${k + 1}`,
        start: at(wall, bounds[k]),
        end: at(wall, bounds[k + 1]),
      });
    }
    newWalls.push(...pieces);
    piecesOf.set(wall.id, pieces);
  }
  if (newWalls.length === walls.length) return input;

  // 3. Remap openings to the piece they sit on.
  const remap = (wallId: string, p: Pt): string => {
    const pieces = piecesOf.get(wallId);
    if (!pieces || pieces.length === 1) return wallId;
    let best = pieces[0];
    let bestDist = Infinity;
    for (const piece of pieces) {
      const t = Math.max(0, Math.min(1, projectT(piece, p)));
      const q = at(piece, t);
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = piece;
      }
    }
    return best.id;
  };

  return {
    ...input,
    walls: newWalls,
    doors: input.doors.map((d) => ({ ...d, wallId: remap(d.wallId, d.position) })),
    windows: input.windows.map((w) => ({ ...w, wallId: remap(w.wallId, w.position) })),
    rooms: input.rooms.map((r) => ({
      ...r,
      wallIds: r.wallIds.flatMap((id) => piecesOf.get(id)?.map((p) => p.id) ?? [id]),
    })),
    notes: [...input.notes, `Split ${walls.length} walls into ${newWalls.length} segments at junctions.`],
  };
}
