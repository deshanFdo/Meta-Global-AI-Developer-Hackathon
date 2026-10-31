import type { HouseAnalysis } from "@/types";
import type { OpenState } from "./geometry";

// ---------------------------------------------------------------------------
// 2D circle-vs-segment collision in world coords (plan centered on origin).
// Open doorways stay walkable; closed doors block. Window walls always block.
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
  radius: number,
  open?: OpenState
): { x: number; z: number } {
  const { overallWidth: w, overallDepth: d } = analysis.metadata;
  const toX = (px: number): number => px - w / 2;
  const toZ = (py: number): number => py - d / 2;
  let px = x;
  let pz = z;

  const pushOut = (ax: number, az: number, bx: number, bz: number, halfThick: number): void => {
    const closest = closestOnSegment(px, pz, ax, az, bx, bz);
    const minDist = radius + halfThick;
    if (closest.dist >= minDist) return;
    const push = minDist - closest.dist;
    let nx = px - closest.x;
    let nz = pz - closest.z;
    const nlen = Math.hypot(nx, nz);
    if (nlen < 1e-6) {
      const dx = bx - ax;
      const dz = bz - az;
      const dl = Math.hypot(dx, dz) || 1;
      nx = -dz / dl;
      nz = dx / dl;
    } else {
      nx /= nlen;
      nz /= nlen;
    }
    px += nx * push;
    pz += nz * push;
  };

  for (let pass = 0; pass < 2; pass += 1) {
    for (const wall of analysis.walls) {
      const ax = toX(wall.start.x);
      const az = toZ(wall.start.y);
      const bx = toX(wall.end.x);
      const bz = toZ(wall.end.y);
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1e-6) continue;
      const ux = (bx - ax) / len;
      const uz = (bz - az) / len;
      // Subtract spans of OPEN doors; closed doors (and all windows) block.
      let free: Array<[number, number]> = [[0, len]];
      // Build the open-door gaps to subtract.
      const gaps: Array<[number, number]> = [];
      for (const door of analysis.doors) {
        if (door.wallId !== wall.id) continue;
        if (!(open && open[`door:${door.id}`])) continue;
        const t = (toX(door.position.x) - ax) * ux + (toZ(door.position.y) - az) * uz;
        const half = door.width / 2;
        gaps.push([Math.max(0, t - half), Math.min(len, t + half)]);
      }
      gaps.sort((p, q) => p[0] - q[0]);
      for (const [a, b] of gaps) {
        const next: Array<[number, number]> = [];
        for (const [s0, s1] of free) {
          if (b <= s0 || a >= s1) {
            next.push([s0, s1]);
            continue;
          }
          if (a > s0) next.push([s0, a]);
          if (b < s1) next.push([b, s1]);
        }
        free = next;
      }
      for (const [s0, s1] of free) {
        pushOut(ax + ux * s0, az + uz * s0, ax + ux * s1, az + uz * s1, wall.thickness / 2);
      }
    }
    for (const item of analysis.furniture ?? []) {
      if (item.type === "rug") continue; // flat: walkable
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
