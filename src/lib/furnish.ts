import * as THREE from "three";
import type { FurnitureType } from "@/types";

// ---------------------------------------------------------------------------
// Procedural furniture. Each builder returns a group roughly 1x1 units in
// plan; the geometry engine scales it to the extracted width/depth/height.
// Front faces +Z at rotation 0.
// ---------------------------------------------------------------------------

function mat(color: string, roughness = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function part(
  parent: THREE.Group,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

const wood = (): THREE.Material => mat("#8a6b4a");
const fabric = (): THREE.Material => mat("#5b7fa6");
const white = (): THREE.Material => mat("#f2f3f5", 0.6);
const dark = (): THREE.Material => mat("#3a3f4a", 0.6);
const steel = (): THREE.Material => mat("#b9c0c9", 0.4);
const green = (): THREE.Material => mat("#4d7c4d");

function bed(g: THREE.Group, double: boolean): void {
  const w = double ? 1 : 0.62;
  part(g, wood(), 0, 0.14, 0, w, 0.22, 1);
  part(g, white(), 0, 0.32, 0.04, w - 0.08, 0.14, 0.88);
  part(g, wood(), 0, 0.42, -0.5, w, 0.5, 0.08);
  part(g, white(), -w / 4, 0.4, -0.32, w / 2 - 0.06, 0.1, 0.2);
  part(g, white(), w / 4, 0.4, -0.32, w / 2 - 0.06, 0.1, 0.2);
}

function sofa(g: THREE.Group): void {
  part(g, fabric(), 0, 0.2, 0, 1, 0.24, 0.42);
  part(g, fabric(), 0, 0.4, -0.2, 1, 0.4, 0.12);
  part(g, fabric(), -0.48, 0.32, 0, 0.1, 0.34, 0.42);
  part(g, fabric(), 0.48, 0.32, 0, 0.1, 0.34, 0.42);
  part(g, dark(), 0, 0.05, 0, 0.9, 0.08, 0.36);
}

function table(g: THREE.Group, top: number): void {
  part(g, wood(), 0, top, 0, 1, 0.05, 0.6);
  for (const [lx, lz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]] as const) {
    part(g, wood(), lx, top / 2, lz, 0.05, top, 0.05);
  }
}

/** True footprint of each builder, so scaling is relative instead of double-applied. */
const NOMINAL: Record<FurnitureType, { w: number; h: number; d: number }> = {
  bed_double: { w: 1, h: 0.67, d: 1 },
  bed_single: { w: 0.62, h: 0.67, d: 1 },
  sofa: { w: 1.06, h: 0.6, d: 0.47 },
  dining_table: { w: 1, h: 0.77, d: 0.6 },
  chair: { w: 0.45, h: 0.95, d: 0.45 },
  kitchen_counter: { w: 1.02, h: 0.95, d: 0.62 },
  toilet: { w: 0.42, h: 0.6, d: 0.58 },
  bathtub: { w: 0.8, h: 0.53, d: 1 },
  sink: { w: 0.5, h: 0.78, d: 0.45 },
  desk: { w: 1, h: 1.04, d: 0.6 },
  wardrobe: { w: 1, h: 1.8, d: 0.55 },
  coffee_table: { w: 1, h: 0.43, d: 0.6 },
  nightstand: { w: 0.45, h: 0.5, d: 0.4 },
  plant: { w: 0.52, h: 0.81, d: 0.52 },
  tv_unit: { w: 1, h: 1.03, d: 0.35 },
  furnace: { w: 0.65, h: 1.2, d: 0.65 },
  washing_machine: { w: 0.65, h: 1.2, d: 0.65 },
  column: { w: 0.28, h: 1, d: 0.28 },
};

export function nominalSize(type: FurnitureType): { w: number; h: number; d: number } {
  return NOMINAL[type] ?? { w: 0.8, h: 0.8, d: 0.8 };
}

export function buildFurniture(type: FurnitureType): THREE.Group {
  const g = new THREE.Group();
  switch (type) {
    case "bed_double":
      bed(g, true);
      break;
    case "bed_single":
      bed(g, false);
      break;
    case "sofa":
      sofa(g);
      break;
    case "dining_table":
      table(g, 0.74);
      break;
    case "desk":
      table(g, 0.74);
      part(g, dark(), 0, 0.9, -0.2, 0.4, 0.28, 0.03);
      break;
    case "coffee_table":
      table(g, 0.4);
      break;
    case "chair":
      part(g, wood(), 0, 0.45, 0, 0.45, 0.05, 0.45);
      part(g, wood(), 0, 0.7, -0.21, 0.45, 0.5, 0.05);
      break;
    case "kitchen_counter":
      part(g, steel(), 0, 0.45, 0, 1, 0.9, 0.6);
      part(g, white(), 0, 0.92, 0, 1.02, 0.05, 0.62);
      part(g, dark(), -0.2, 0.93, 0, 0.3, 0.03, 0.35);
      break;
    case "toilet":
      part(g, white(), 0, 0.35, -0.18, 0.4, 0.5, 0.18);
      part(g, white(), 0, 0.22, 0.08, 0.42, 0.3, 0.45);
      break;
    case "bathtub":
      part(g, white(), 0, 0.28, 0, 0.8, 0.5, 1);
      part(g, steel(), 0, 0.5, 0, 0.66, 0.06, 0.86);
      break;
    case "sink":
      part(g, white(), 0, 0.4, 0, 0.5, 0.7, 0.45);
      part(g, steel(), 0, 0.76, 0, 0.4, 0.04, 0.35);
      break;
    case "wardrobe":
      part(g, wood(), 0, 0.9, 0, 1, 1.8, 0.55);
      part(g, dark(), 0, 0.9, 0.28, 0.02, 1.4, 0.01);
      break;
    case "nightstand":
      part(g, wood(), 0, 0.25, 0, 0.45, 0.5, 0.4);
      break;
    case "tv_unit":
      part(g, dark(), 0, 0.22, 0, 1, 0.4, 0.35);
      part(g, steel(), 0, 0.75, -0.1, 0.9, 0.55, 0.04);
      break;
    case "furnace":
    case "washing_machine":
      part(g, steel(), 0, 0.6, 0, 0.65, 1.2, 0.65);
      part(g, dark(), 0, 0.7, 0.33, 0.4, 0.4, 0.02);
      break;
    case "column": {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 12), white());
      mesh.position.y = 0.5;
      mesh.castShadow = true;
      g.add(mesh);
      break;
    }
    case "plant": {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.3, 10), mat("#a35f3c"));
      pot.position.y = 0.15;
      pot.castShadow = true;
      g.add(pot);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), green());
      ball.position.y = 0.55;
      ball.castShadow = true;
      g.add(ball);
      break;
    }
    default:
      part(g, wood(), 0, 0.4, 0, 0.8, 0.8, 0.8);
      break;
  }
  return g;
}
