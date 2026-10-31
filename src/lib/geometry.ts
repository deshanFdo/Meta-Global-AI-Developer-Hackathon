import * as THREE from "three";
import type { Door, HouseAnalysis, PlanWindow, Wall } from "@/types";
import { buildFurniture, nominalSize } from "./furnish";

// ---------------------------------------------------------------------------
// buildHouseGroup: HouseAnalysis -> THREE.Group
// Plan coords (x right, y down, meters) map to world (x right, z down).
// The house is centered on the origin.
// ---------------------------------------------------------------------------

export interface GeometryOptions {
  showRoof: boolean;
  showFurniture: boolean;
  facadeMap?: THREE.Texture | null;
  floorMap?: THREE.Texture | null;
  roofMap?: THREE.Texture | null;
  /** Initial open states, keyed by openKey(). New pivots start at their target (no snap-back on rebuild). */
  open?: OpenState;
}

/** Open/closed state per openable element, keyed by openKey(kind, id). */
export type OpenState = Record<string, boolean>;

export function openKey(kind: "door" | "window", id: string): string {
  return `${kind}:${id}`;
}

/** Which styles can physically open. Fixed/bay/skylight windows stay shut. */
export function isOpenable(kind: "door" | "window", style: string): boolean {
  if (kind === "door") return true;
  return style === "casement" || style === "sliding" || style === "single-hung" || style === "double-hung";
}

/** One animated leaf/panel. Hinges rotate; slides/apart/lift move. current/target are 0..1. */
export interface Pivot {
  kind: "door" | "window";
  id: string;
  node: THREE.Object3D;
  mode: "hinge" | "slide";
  closedRotY: number;
  openRotY: number;
  closedPos: THREE.Vector3;
  openPos: THREE.Vector3;
  extra?: { node: THREE.Object3D; closedPos: THREE.Vector3; openPos: THREE.Vector3 };
  current: number;
  target: number;
}

export function pivotsOf(group: THREE.Group): Pivot[] {
  return (group.userData.interactive as Pivot[] | undefined) ?? [];
}

export function setPivotTargets(group: THREE.Group, open: OpenState): void {
  for (const pivot of pivotsOf(group)) {
    pivot.target = open[openKey(pivot.kind, pivot.id)] ? 1 : 0;
  }
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Advance all pivots toward their targets. Call every frame with clamped dt. */
export function updatePivots(group: THREE.Group, dt: number): void {
  const step = Math.min(1, dt * 3.4);
  for (const pivot of pivotsOf(group)) {
    if (pivot.current === pivot.target) continue;
    const delta = pivot.target - pivot.current;
    pivot.current += Math.abs(delta) < step ? delta : Math.sign(delta) * step;
    const eased = smooth(Math.max(0, Math.min(1, pivot.current)));
    if (pivot.mode === "hinge") {
      pivot.node.rotation.y = pivot.closedRotY + (pivot.openRotY - pivot.closedRotY) * eased;
    } else {
      pivot.node.position.lerpVectors(pivot.closedPos, pivot.openPos, eased);
      if (pivot.extra) {
        pivot.extra.node.position.lerpVectors(pivot.extra.closedPos, pivot.extra.openPos, eased);
      }
    }
  }
}

/** Tag attached to selectable meshes so walk/VR modes can identify elements. */
export interface ElementTag {
  kind: "wall" | "door" | "window" | "furniture" | "roof";
  id: string;
}

function tag(obj: THREE.Object3D, kind: ElementTag["kind"], id: string): void {
  obj.userData.element = { kind, id } as ElementTag;
}

/** Walk up the parent chain to find the nearest element tag (raycast hits). */
export function findTag(obj: THREE.Object3D | null): ElementTag | null {
  let current: THREE.Object3D | null = obj;
  while (current) {
    const tagInfo = (current.userData as { element?: ElementTag }).element;
    if (tagInfo && typeof tagInfo.id === "string") return tagInfo;
    current = current.parent;
  }
  return null;
}

interface OpeningSpan {
  t0: number;
  t1: number;
  kind: "door" | "window";
  sill: number; // bottom of opening
  top: number; // top of opening
  ref: Door | PlanWindow;
}

function std(color: string, extra?: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.0, ...extra });
}

function box(
  parent: THREE.Group,
  mat: THREE.Material,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  rotY = 0,
  tagInfo?: ElementTag
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(cx, cy, cz);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (tagInfo) tag(mesh, tagInfo.kind, tagInfo.id);
  parent.add(mesh);
}

export function buildHouseGroup(analysis: HouseAnalysis, opts: GeometryOptions): THREE.Group {
  const group = new THREE.Group();
  group.userData.interactive = [] as Pivot[];
  const { overallWidth: W, overallDepth: D, wallHeight: H } = analysis.metadata;
  const toX = (x: number): number => x - W / 2;
  const toZ = (y: number): number => y - D / 2;

  const matSlab = std("#9aa0ad");
  const matGlass = std("#bcd6e8", { transparent: true, opacity: 0.55, roughness: 0.2 });
  const matRoof = opts.roofMap
    ? new THREE.MeshStandardMaterial({ map: opts.roofMap, roughness: 0.9 })
    : std(analysis.roof.color || "#4a4a4a");

  // ---- ground slab ----
  box(group, matSlab, 0, -0.1, 0, W + 0.4, 0.2, D + 0.4);

  // ---- room floors (flat polygons just above the slab) ----
  const floorMat = opts.floorMap
    ? new THREE.MeshStandardMaterial({ map: opts.floorMap, roughness: 0.8 })
    : null;
  for (const room of analysis.rooms) {
    const shape = new THREE.Shape();
    room.vertices.forEach((v, i) => {
      // Shape (x, y) rotated -90deg about X lands at world (x, 0, -y).
      const sx = toX(v.x);
      const sy = -toZ(v.y);
      if (i === 0) shape.moveTo(sx, sy);
      else shape.lineTo(sx, sy);
    });
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geo, floorMat ?? std(roomTint(room.type)));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.012;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // ---- opening spans per wall ----
  const spans = new Map<string, OpeningSpan[]>();
  const pushSpan = (wall: Wall, kind: "door" | "window", ref: Door | PlanWindow, half: number, sill: number, top: number): void => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    const t = ((ref.position.x - wall.start.x) * dx + (ref.position.y - wall.start.y) * dy) / len;
    const list = spans.get(wall.id) ?? [];
    list.push({ t0: Math.max(0, t - half), t1: Math.min(len, t + half), kind, sill, top, ref });
    spans.set(wall.id, list);
  };
  const wallById = new Map(analysis.walls.map((w) => [w.id, w]));
  for (const d of analysis.doors) {
    const wall = wallById.get(d.wallId);
    if (wall) pushSpan(wall, "door", d, d.width / 2, 0, Math.min(d.height, wall.height > 0 ? wall.height : H));
  }
  for (const win of analysis.windows) {
    const wall = wallById.get(win.wallId);
    if (wall) {
      const wh = wall.height > 0 ? wall.height : H;
      pushSpan(wall, "window", win, win.width / 2, win.sillHeight, Math.min(win.sillHeight + win.height, wh));
    }
  }

  // ---- walls with real openings + dressing ----
  for (const wall of analysis.walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    const angle = Math.atan2(dy, dx); // plan angle; world rotY = -angle
    const rotY = -angle;
    const ux = dx / len;
    const uy = dy / len;
    // Per-wall material so color customization is visible (texture shared, tinted).
    const mat = new THREE.MeshStandardMaterial({
      color: wall.color || (wall.isExterior ? "#e8e2d6" : "#f4f2ec"),
      roughness: 0.92,
      map: wall.isExterior ? (opts.facadeMap ?? null) : null,
    });
    const WH = wall.height > 0 ? wall.height : H;
    const t = wall.thickness;

    const at = (s: number): { x: number; z: number } => ({
      x: toX(wall.start.x + ux * s),
      z: toZ(wall.start.y + uy * s),
    });
    const seg = (s0: number, s1: number, y0: number, y1: number): void => {
      if (s1 - s0 < 0.01 || y1 - y0 < 0.01) return;
      const a = at(s0);
      const b = at(s1);
      box(group, mat, (a.x + b.x) / 2, (y0 + y1) / 2, (a.z + b.z) / 2, s1 - s0, y1 - y0, t, rotY, {
        kind: "wall",
        id: wall.id,
      });
    };

    const list = (spans.get(wall.id) ?? []).sort((p, q) => p.t0 - q.t0);
    let cursor = 0;
    for (const span of list) {
      seg(cursor, span.t0, 0, WH);
      if (span.kind === "door") seg(span.t0, span.t1, span.top, WH); // header
      else {
        seg(span.t0, span.t1, 0, span.sill); // sill wall
        seg(span.t0, span.t1, span.top, WH); // header
      }
      dressOpening(group, wall, span, rotY, toX, toZ, matGlass, opts.open ?? {});
      cursor = span.t1;
    }
    seg(cursor, len, 0, WH);
  }

  // ---- stairs (straight decorative runs) ----
  const matStair = std("#c9c2b4");
  for (const stair of analysis.staircases) {
    const n = Math.max(2, Math.min(16, stair.steps || 8));
    const tread = 0.26;
    const rise = 0.18;
    for (let i = 0; i < n; i += 1) {
      box(
        group,
        matStair,
        toX(stair.position.x) - ((n * tread) / 2) + i * tread + tread / 2,
        ((i + 1) * rise) / 2,
        toZ(stair.position.y),
        tread + 0.01,
        (i + 1) * rise,
        stair.width
      );
    }
  }

  // ---- roof ----
  if (opts.showRoof) buildRoof(group, analysis, matRoof);

  // ---- furniture ----
  if (opts.showFurniture) {
    for (const item of analysis.furniture ?? []) {
      const g = buildFurniture(item.type);
      g.position.set(toX(item.position.x), 0, toZ(item.position.y));
      g.rotation.y = (item.rotation * Math.PI) / 180;
      tag(g, "furniture", item.id);
      // Relative scaling: builders have true footprints, so divide, never multiply blindly.
      const nom = nominalSize(item.type);
      const axis = (v: number, n: number): number =>
        Number.isFinite(v) && v > 0 && n > 0 ? Math.max(0.25, Math.min(5, v / n)) : 1;
      g.scale.set(axis(item.width, nom.w), axis(item.height, nom.h), axis(item.depth, nom.d));
      group.add(g);
    }
  }

  return group;
}

function dressOpening(
  group: THREE.Group,
  wall: Wall,
  span: OpeningSpan,
  rotY: number,
  toX: (x: number) => number,
  toZ: (y: number) => number,
  matGlass: THREE.Material,
  open: OpenState
): void {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return;
  const mid = (span.t0 + span.t1) / 2;
  const px = wall.start.x + (dx / len) * mid;
  const py = wall.start.y + (dy / len) * mid;
  const cx = toX(px);
  const cz = toZ(py);
  const w = span.t1 - span.t0;
  const t = wall.thickness;
  const tagInfo: ElementTag = { kind: span.kind, id: span.ref.id };
  const ax = Math.cos(-rotY); // wall axis in world xz
  const az = Math.sin(-rotY);
  const along = (s: number): { x: number; z: number } => ({ x: cx + ax * s, z: cz + az * s });
  const frameMat = std(span.ref.color || "#3c414d", { roughness: 0.6 });
  const pivots = pivotsOf(group);
  const startAt = open[openKey(span.kind, span.ref.id)] ? 1 : 0;

  /** Mesh child helper for pivot-local construction (tagged for picking). */
  const leaf = (
    parent: THREE.Object3D,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tag(mesh, tagInfo.kind, tagInfo.id);
    parent.add(mesh);
    return mesh;
  };

  if (span.kind === "door") {
    const door = span.ref as Door;
    const h = span.top;
    const leafMat = std(door.color || "#7a5c3e", { roughness: 0.7 });
    const jambL = along(-w / 2);
    const jambR = along(w / 2);
    box(group, frameMat, jambL.x, h / 2, jambL.z, 0.08, h, t + 0.06, rotY, tagInfo);
    box(group, frameMat, jambR.x, h / 2, jambR.z, 0.08, h, t + 0.06, rotY, tagInfo);
    box(group, frameMat, cx, h - 0.04, cz, w, 0.08, t + 0.06, rotY, tagInfo); // head
    const leafW = Math.max(0.05, w - 0.12);
    const leafH = Math.max(0.3, h - 0.06);
    const hingeEdge = w / 2 - 0.06;
    const swingSign = door.swingDirection === "outward" || door.swingDirection === "right" ? -1 : 1;
    const swingAngle = (Math.PI * 0.58) * swingSign;

    const hinge = (edgeS: number, dirSign: 1 | -1): THREE.Group => {
      const hp = along(edgeS);
      const pivot = new THREE.Group();
      pivot.position.set(hp.x, 0, hp.z);
      pivot.rotation.y = rotY;
      group.add(pivot);
      pivots.push({
        kind: "door",
        id: door.id,
        node: pivot,
        mode: "hinge",
        closedRotY: rotY,
        openRotY: rotY + swingAngle * dirSign,
        closedPos: pivot.position.clone(),
        openPos: pivot.position.clone(),
        current: startAt,
        target: startAt,
      });
      if (startAt === 1) pivot.rotation.y = rotY + swingAngle * dirSign;
      return pivot;
    };

    if (door.style === "double") {
      const halfW = leafW / 2 - 0.02;
      const pl = hinge(-hingeEdge, 1);
      leaf(pl, leafMat, halfW / 2, leafH / 2, 0, halfW, leafH, 0.06);
      const pr = hinge(hingeEdge, -1);
      leaf(pr, leafMat, -halfW / 2, leafH / 2, 0, halfW, leafH, 0.06);
    } else if (door.style === "sliding") {
      box(group, frameMat, cx, h + 0.03, cz, w, 0.07, t + 0.1, rotY, tagInfo); // rail
      const mount = new THREE.Group();
      mount.position.set(cx, 0, cz);
      mount.rotation.y = rotY;
      group.add(mount);
      const panelW = leafW * 0.52;
      const p1 = leaf(mount, matGlass, -leafW * 0.22, leafH / 2, 0, panelW, leafH, 0.05);
      const p2 = leaf(mount, matGlass, leafW * 0.22, leafH / 2, 0, panelW, leafH, 0.05);
      const c1 = p1.position.clone();
      const c2 = p2.position.clone();
      const o1 = c1.clone();
      o1.x -= leafW * 0.3;
      const o2 = c2.clone();
      o2.x += leafW * 0.3;
      pivots.push({
        kind: "door", id: door.id, node: p1, mode: "slide",
        closedRotY: 0, openRotY: 0, closedPos: c1, openPos: o1,
        extra: { node: p2, closedPos: c2, openPos: o2 },
        current: startAt, target: startAt,
      });
      if (startAt === 1) {
        p1.position.copy(o1);
        p2.position.copy(o2);
      }
    } else if (door.style === "french") {
      const pivot = hinge(-hingeEdge, 1);
      leaf(pivot, leafMat, leafW / 2, leafH / 2, 0, leafW, leafH, 0.05);
      leaf(pivot, matGlass, leafW / 2, leafH * 0.62, 0, Math.max(0.05, leafW - 0.16), leafH * 0.62, 0.06);
    } else if (door.style === "garage") {
      const lift = new THREE.Group();
      lift.position.set(cx, 0, cz);
      lift.rotation.y = rotY;
      group.add(lift);
      leaf(lift, leafMat, 0, leafH / 2, 0, leafW, leafH, 0.08);
      for (const f of [0.25, 0.5, 0.75]) {
        leaf(lift, frameMat, 0, leafH * f, 0, leafW, 0.03, 0.09);
      }
      const closedPos = lift.position.clone();
      const openPos = closedPos.clone();
      openPos.y += leafH * 0.92; // roll up
      pivots.push({
        kind: "door", id: door.id, node: lift, mode: "slide",
        closedRotY: 0, openRotY: 0, closedPos, openPos, current: startAt, target: startAt,
      });
      if (startAt === 1) lift.position.copy(openPos);
    } else if (door.style === "pocket") {
      box(group, frameMat, cx, leafH / 2, cz, leafW, leafH, 0.04, rotY, tagInfo); // dark pocket slot
      const mount = new THREE.Group();
      mount.position.set(cx, 0, cz);
      mount.rotation.y = rotY;
      group.add(mount);
      const panel = leaf(mount, leafMat, -leafW * 0.2, leafH / 2, 0, leafW * 0.55, leafH, 0.05);
      const closedPos = panel.position.clone();
      const openPos = closedPos.clone();
      openPos.x += leafW * 0.75; // slide into the wall
      pivots.push({
        kind: "door", id: door.id, node: panel, mode: "slide",
        closedRotY: 0, openRotY: 0, closedPos, openPos, current: startAt, target: startAt,
      });
      if (startAt === 1) panel.position.copy(openPos);
    } else {
      const pivot = hinge(-hingeEdge, 1);
      leaf(pivot, leafMat, leafW / 2, leafH / 2, 0, leafW, leafH, 0.06);
      leaf(pivot, frameMat, leafW - 0.18, Math.min(1.0, leafH - 0.2), 0, 0.05, 0.05, 0.1);
    }
  } else {
    const win = span.ref as PlanWindow;
    const h = span.top - span.sill;
    const cy = span.sill + h / 2;
    box(group, frameMat, cx, cy, cz, w + 0.08, h + 0.08, t * 0.6, rotY, tagInfo);
    if (win.style === "casement") {
      const edge = along(-w / 2 + 0.04);
      const pivot = new THREE.Group();
      pivot.position.set(edge.x, span.sill, edge.z);
      pivot.rotation.y = rotY;
      group.add(pivot);
      leaf(pivot, matGlass, w / 2, h / 2, 0, w, h, 0.04);
      leaf(pivot, frameMat, w / 2, h / 2, 0, 0.05, h, 0.05);
      const openRotY = rotY + 1.1;
      pivots.push({
        kind: "window", id: win.id, node: pivot, mode: "hinge",
        closedRotY: rotY, openRotY, closedPos: pivot.position.clone(), openPos: pivot.position.clone(),
        current: startAt, target: startAt,
      });
      if (startAt === 1) pivot.rotation.y = openRotY;
    } else if (win.style === "sliding") {
      const mount = new THREE.Group();
      mount.position.set(cx, cy, cz);
      mount.rotation.y = rotY;
      group.add(mount);
      const halfW = w / 2 - 0.02;
      leaf(mount, matGlass, -w / 4, 0, -0.015, halfW, h, 0.03);
      const slider = leaf(mount, matGlass, w / 4, 0, 0.015, halfW, h, 0.03);
      leaf(mount, frameMat, 0, 0, 0, 0.05, h, 0.05);
      const closedPos = slider.position.clone();
      const openPos = closedPos.clone();
      openPos.x -= w * 0.42;
      pivots.push({
        kind: "window", id: win.id, node: slider, mode: "slide",
        closedRotY: 0, openRotY: 0, closedPos, openPos, current: startAt, target: startAt,
      });
      if (startAt === 1) slider.position.copy(openPos);
    } else if (win.style === "single-hung" || win.style === "double-hung") {
      const sash = new THREE.Group();
      sash.position.set(cx, cy, cz);
      sash.rotation.y = rotY;
      group.add(sash);
      leaf(sash, matGlass, 0, 0, 0, w, h, 0.04);
      leaf(sash, frameMat, 0, 0, 0, w, 0.05, 0.05);
      const closedPos = sash.position.clone();
      const openPos = closedPos.clone();
      openPos.y += h * 0.42;
      pivots.push({
        kind: "window", id: win.id, node: sash, mode: "slide",
        closedRotY: 0, openRotY: 0, closedPos, openPos, current: startAt, target: startAt,
      });
      if (startAt === 1) sash.position.copy(openPos);
    } else {
      // fixed / bay / skylight: static glass, not openable.
      box(group, matGlass, cx, cy, cz, w, h, 0.04, rotY, tagInfo);
      if (win.style === "bay") {
        box(group, frameMat, cx, cy, cz, 0.05, h, 0.05, rotY, tagInfo);
        box(group, frameMat, cx, cy, cz, w, 0.05, 0.05, rotY, tagInfo);
      }
    }
  }
}

function buildRoof(group: THREE.Group, analysis: HouseAnalysis, mat: THREE.Material): void {
  const { overallWidth: W, overallDepth: D, wallHeight: H } = analysis.metadata;
  const { type, pitch, overhang } = analysis.roof;
  const ov = Math.max(0, Math.min(2, overhang || 0));
  const rise = Math.max(0.3, (Math.min(W, D) / 2) * Math.tan(((pitch || 25) * Math.PI) / 180));

  if (type === "flat") {
    box(group, mat, 0, H + 0.08, 0, W + ov * 2, 0.16, D + ov * 2, 0, { kind: "roof", id: "roof" });
    return;
  }
  if (type === "shed" || type === "butterfly") {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + ov * 2, 0.12, D + ov * 2), mat);
    slab.position.y = H + rise / 2;
    slab.rotation.z = ((type === "butterfly" ? -1 : 1) * (pitch || 8) * Math.PI) / 180;
    slab.castShadow = true;
    slab.receiveShadow = true;
    tag(slab, "roof", "roof");
    group.add(slab);
    return;
  }
  if (type === "hip" || type === "mansard" || type === "gambrel") {
    const geo = new THREE.ConeGeometry(1, 1, 4, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = Math.PI / 4;
    mesh.scale.set(((W / 2 + ov) / Math.SQRT1_2), rise, ((D / 2 + ov) / Math.SQRT1_2));
    mesh.position.y = H + rise / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tag(mesh, "roof", "roof");
    group.add(mesh);
    return;
  }
  // Gable: triangular prism with ridge along the longer axis.
  const alongX = W >= D;
  const span = (alongX ? W : D) + ov * 2;
  const depth = (alongX ? D : W) + ov * 2;
  const shape = new THREE.Shape();
  shape.moveTo(-span / 2, 0);
  shape.lineTo(span / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geo, mat);
  if (!alongX) mesh.rotation.y = Math.PI / 2;
  mesh.position.y = H;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  tag(mesh, "roof", "roof");
  group.add(mesh);
}

function roomTint(type: string): string {
  switch (type) {
    case "bathroom":
      return "#d7e6ee";
    case "kitchen":
      return "#e9e2d2";
    case "bedroom":
      return "#e6ddf0";
    case "garage":
      return "#cfcfcf";
    case "hallway":
      return "#e3e3e3";
    default:
      return "#ded7c8";
  }
}

/** Dispose geometries/materials of a built group (textures are shared; caller owns them). */
export function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const stdMat = m as THREE.MeshStandardMaterial;
        if (stdMat.map) {
          // Shared texture: do not dispose the map itself.
          stdMat.map = null;
        }
        m.dispose();
      }
    }
  });
}
