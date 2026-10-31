import type { HouseAnalysis } from "@/types";

// ---------------------------------------------------------------------------
// 2D circle-vs-segment collision in world coords (plan centered on origin).
// Door gaps have no wall segments, so they stay walkable.
// ---------------------------------------------------------------------------

function closestOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { x: number; z: number; dist: number } {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz;
  let t = len2 > 0 ? ((px - ax) * abx + (pz - az) * abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + abx * t;
  const z = az + abz * t;
  return { x, z, dist: Math.hypot(px - x, pz - z) };
}

export function resolveCollision(
  analysis: HouseAnalysis,
  x: number,
  z: number,
  radius: number
): { x: number; z: number } {
  const { overallWidth: w, overallDepth: d } = analysis.metadata;
  const toX = (px: number): number => px - w / 2;
  const toZ = (py: number): number => py - d / 2;
  let px = x;
  let pz = z;

  for (let pass = 0; pass < 2; pass += 1) {
    for (const wall of analysis.walls) {
      const closest = closestOnSegment(
        px,
        pz,
        toX(wall.start.x),
        toZ(wall.start.y),
        toX(wall.end.x),
        toZ(wall.end.y)
      );
      const minDist = radius + wall.thickness / 2;
      if (closest.dist < minDist) {
        const push = minDist - closest.dist;
        let nx = px - closest.x;
        let nz = pz - closest.z;
        const nlen = Math.hypot(nx, nz);
        if (nlen < 1e-6) {
          // Center exactly on the wall: push along the wall normal.
          const dx = toX(wall.end.x) - toX(wall.start.x);
          const dz = toZ(wall.end.y) - toZ(wall.start.y);
          const dl = Math.hypot(dx, dz) || 1;
          nx = -dz / dl;
          nz = dx / dl;
        } else {
          nx /= nlen;
          nz /= nlen;
        }
        px += nx * push;
        pz += nz * push;
      }
    }
    for (const item of analysis.furniture ?? []) {
      const fx = toX(item.position.x);
      const fz = toZ(item.position.y);
      const fr = Math.max(0.15, Math.min(item.width, item.depth) / 2);
      const dx = px - fx;
      const dz = pz - fz;
      const dist = Math.hypot(dx, dz);
      if (dist < radius + fr && dist > 1e-6) {
        const push = radius + fr - dist;
        px += (dx / dist) * push;
        pz += (dz / dist) * push;
      }
    }
  }

  px = Math.max(-w / 2 - 2, Math.min(w / 2 + 2, px));
  pz = Math.max(-d / 2 - 2, Math.min(d / 2 + 2, pz));
  return { x: px, z: pz };
}

/** Start pose: center of the largest room at eye height. */
export function spawnPose(analysis: HouseAnalysis): { x: number; z: number; yaw: number } {
  const { overallWidth: w, overallDepth: d } = analysis.metadata;
  let best = analysis.rooms[0];
  for (const r of analysis.rooms) {
    if (r.area > (best?.area ?? 0)) best = r;
  }
  if (!best || best.vertices.length === 0) return { x: 0, z: 0, yaw: 0 };
  const cx = best.vertices.reduce((s, v) => s + v.x, 0) / best.vertices.length - w / 2;
  const cz = best.vertices.reduce((s, v) => s + v.y, 0) / best.vertices.length - d / 2;
  return { x: cx, z: cz, yaw: 0 };
}
