import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { FurnitureType } from "@/types";

// ---------------------------------------------------------------------------
// Furniture catalog. Every builder works in REAL meters, front faces +Z, base
// sits at y=0. nominalSize mirrors each builder so scaling stays exact.
// ---------------------------------------------------------------------------

function M(color: string, roughness = 0.85, extra?: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
}

const WOOD = "#7a5a3c";
const WOOD_DARK = "#5c432c";
const CERAMIC = "#f1f2f4";
const CHROME = "#c3cad4";
const DARK = "#2c313b";

function part(
  parent: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const rbox = (w: number, h: number, d: number, r = 0.03): RoundedBoxGeometry =>
  new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2.01));
const box = (w: number, h: number, d: number): THREE.BoxGeometry => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 14): THREE.CylinderGeometry =>
  new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r: number): THREE.SphereGeometry => new THREE.SphereGeometry(r, 14, 12);

function legs(g: THREE.Group, mat: THREE.Material, w: number, d: number, h: number): void {
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    part(g, cyl(0.03, 0.025, h, 8), mat, (sx * (w / 2 - 0.08)), h / 2, (sz * (d / 2 - 0.08)));
  }
}

function buildSofa(g: THREE.Group, seats: number, color: string): { w: number; h: number; d: number } {
  const w = seats === 1 ? 0.95 : seats === 2 ? 1.55 : 2.1;
  const d = 0.9;
  const fabric = M(color, 0.95);
  legs(g, M(DARK, 0.6), w, d, 0.12);
  part(g, rbox(w, 0.3, d), fabric, 0, 0.27, 0);
  part(g, rbox(w, 0.55, 0.22), fabric, 0, 0.62, -(d / 2 - 0.11));
  part(g, rbox(0.24, 0.3, d), fabric, -(w / 2 - 0.12), 0.5, 0);
  part(g, rbox(0.24, 0.3, d), fabric, w / 2 - 0.12, 0.5, 0);
  const cw = (w - 0.52) / seats;
  for (let i = 0; i < seats; i += 1) {
    const x = -((w - 0.52) / 2) + cw / 2 + i * cw;
    part(g, rbox(cw - 0.03, 0.16, 0.6), fabric, x, 0.5, 0.08);
    part(g, rbox(cw - 0.03, 0.38, 0.15), fabric, x, 0.7, -(d / 2 - 0.3), -0.12);
  }
  return { w, h: 0.92, d };
}

function buildBed(g: THREE.Group, size: "single" | "double" | "king", color: string): { w: number; h: number; d: number } {
  const w = size === "single" ? 1.0 : size === "double" ? 1.6 : 1.9;
  const len = size === "single" ? 2.0 : 2.1;
  const wood = M(WOOD_DARK, 0.7);
  part(g, box(w, 0.22, len), wood, 0, 0.2, 0);
  part(g, rbox(w, 0.85, 0.09, 0.04), wood, 0, 0.62, -(len / 2 - 0.045));
  part(g, rbox(w - 0.08, 0.24, len - 0.2, 0.06), M("#ece7dc", 0.9), 0, 0.43, 0.03);
  const pillows = size === "single" ? 1 : 2;
  for (let i = 0; i < pillows; i += 1) {
    const x = pillows === 1 ? 0 : i === 0 ? -0.33 : 0.33;
    part(g, rbox(0.55, 0.13, 0.35, 0.05), M("#f5f3ee", 0.95), x, 0.58, -(len / 2 - 0.42));
  }
  part(g, box(w - 0.06, 0.05, len * 0.36), M(color, 0.95), 0, 0.56, len * 0.22); // throw blanket
  return { w, h: 1.05, d: len };
}

function buildChairAt(g: THREE.Group, x: number, z: number, ry: number, mat: THREE.Material): void {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  g.add(c);
  part(c, rbox(0.45, 0.06, 0.45, 0.02), mat, 0, 0.46, 0);
  part(c, rbox(0.45, 0.5, 0.06, 0.02), mat, 0, 0.72, -0.2);
  for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]] as const) {
    part(c, cyl(0.025, 0.025, 0.46, 8), mat, lx, 0.23, lz);
  }
}

function buildDiningTable(g: THREE.Group, shape: "rect" | "round"): { w: number; h: number; d: number } {
  const wood = M(WOOD, 0.65);
  if (shape === "round") {
    part(g, cyl(0.65, 0.65, 0.06, 24), wood, 0, 0.74, 0);
    part(g, cyl(0.09, 0.12, 0.68, 12), wood, 0, 0.37, 0);
    part(g, cyl(0.32, 0.36, 0.05, 16), wood, 0, 0.03, 0);
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      buildChairAt(g, Math.sin(a) * 1.0, Math.cos(a) * 1.0, a + Math.PI, wood);
    }
    return { w: 2.4, h: 0.98, d: 2.4 };
  }
  part(g, rbox(1.6, 0.07, 0.95, 0.02), wood, 0, 0.74, 0);
  for (const [lx, lz] of [[-0.72, -0.4], [0.72, -0.4], [-0.72, 0.4], [0.72, 0.4]] as const) {
    part(g, box(0.08, 0.7, 0.08), wood, lx, 0.37, lz);
  }
  buildChairAt(g, -0.4, -0.85, Math.PI, wood);
  buildChairAt(g, 0.4, -0.85, Math.PI, wood);
  buildChairAt(g, -0.4, 0.85, 0, wood);
  buildChairAt(g, 0.4, 0.85, 0, wood);
  return { w: 2.5, h: 0.98, d: 2.1 };
}

function buildDesk(g: THREE.Group, monitor: boolean): { w: number; h: number; d: number } {
  const wood = M(WOOD, 0.65);
  part(g, box(1.4, 0.05, 0.7), wood, 0, 0.74, 0);
  part(g, box(0.05, 0.72, 0.65), wood, -0.65, 0.37, 0);
  part(g, box(0.05, 0.72, 0.65), wood, 0.65, 0.37, 0);
  part(g, box(0.5, 0.35, 0.6), wood, 0.38, 0.2, 0); // drawer unit
  if (monitor) {
    part(g, box(0.2, 0.03, 0.16), M(DARK, 0.5), 0, 0.78, -0.1);
    part(g, box(0.04, 0.3, 0.04), M(DARK, 0.5), 0, 0.93, -0.12);
    part(g, rbox(0.56, 0.34, 0.03, 0.01), M("#14181f", 0.4), 0, 1.12, -0.12);
    part(g, box(0.52, 0.3, 0.005), M("#274a7a", 0.3, { emissive: "#274a7a", emissiveIntensity: 0.7 }), 0, 1.12, -0.1);
  }
  return { w: 1.4, h: monitor ? 1.3 : 0.77, d: 0.7 };
}

function buildKitchenCounter(g: THREE.Group): { w: number; h: number; d: number } {
  part(g, box(2.2, 0.84, 0.6), M("#8f9aa8", 0.7), 0, 0.45, 0);
  part(g, box(2.26, 0.05, 0.66), M("#e8e6e1", 0.4), 0, 0.895, 0);
  for (let i = 0; i < 4; i += 1) {
    part(g, box(0.02, 0.6, 0.01), M(DARK, 0.6), -0.82 + i * 0.55, 0.45, 0.305); // cabinet seams
  }
  part(g, box(0.5, 0.03, 0.36), M("#4a5058", 0.4), -0.6, 0.9, 0); // sink inset
  part(g, cyl(0.02, 0.02, 0.25, 8), M(CHROME, 0.3), -0.6, 1.02, -0.22); // faucet
  part(g, cyl(0.015, 0.015, 0.2, 8), M(CHROME, 0.3), -0.6, 1.13, -0.13, Math.PI / 2);
  for (const [bx, bz, br] of [[0.45, -0.12, 0.09], [0.75, -0.12, 0.07], [0.45, 0.16, 0.07], [0.75, 0.16, 0.09]] as const) {
    part(g, cyl(br, br, 0.02, 16), M("#1c1f24", 0.5), bx, 0.93, bz); // burners
  }
  return { w: 2.26, h: 1.15, d: 0.66 };
}

function buildToilet(g: THREE.Group): { w: number; h: number; d: number } {
  const ceramic = M(CERAMIC, 0.35);
  part(g, rbox(0.42, 0.45, 0.18, 0.04), ceramic, 0, 0.62, -0.2);
  part(g, rbox(0.42, 0.32, 0.5, 0.08), ceramic, 0, 0.24, 0.03);
  part(g, cyl(0.2, 0.22, 0.07, 18), ceramic, 0, 0.43, 0.06);
  part(g, cyl(0.14, 0.14, 0.075, 18), M("#9aa2ad", 0.5), 0, 0.43, 0.06);
  return { w: 0.45, h: 0.85, d: 0.62 };
}

function buildBathtub(g: THREE.Group): { w: number; h: number; d: number } {
  part(g, rbox(0.85, 0.52, 1.75, 0.1), M(CERAMIC, 0.35), 0, 0.3, 0);
  part(g, box(0.65, 0.05, 1.5), M("#9fc8e8", 0.2), 0, 0.5, 0); // water
  part(g, cyl(0.025, 0.025, 0.3, 8), M(CHROME, 0.3), 0, 0.65, -0.78); // faucet
  part(g, cyl(0.02, 0.02, 0.18, 8), M(CHROME, 0.3), 0, 0.78, -0.7, Math.PI / 2);
  return { w: 0.85, h: 0.8, d: 1.75 };
}

function buildShower(g: THREE.Group): { w: number; h: number; d: number } {
  const glass = M("#bcd6e8", 0.15, { transparent: true, opacity: 0.45 });
  part(g, box(0.95, 0.09, 0.95), M(CERAMIC, 0.4), 0, 0.045, 0);
  part(g, box(0.95, 1.9, 0.03), glass, 0, 1.0, 0.46);
  part(g, box(0.03, 1.9, 0.95), glass, 0.46, 1.0, 0);
  part(g, cyl(0.02, 0.02, 0.5, 8), M(CHROME, 0.3), -0.3, 1.85, -0.3);
  part(g, cyl(0.11, 0.13, 0.04, 16), M(CHROME, 0.3), -0.3, 1.62, -0.3); // head
  return { w: 0.95, h: 2.1, d: 0.95 };
}

function buildWardrobe(g: THREE.Group, doors: 2 | 3, color: string): { w: number; h: number; d: number } {
  const w = doors === 3 ? 1.8 : 1.2;
  const body = M(color, 0.7);
  part(g, box(w, 1.95, 0.58), body, 0, 1.0, 0);
  part(g, box(w + 0.04, 0.06, 0.62), body, 0, 2.0, 0);
  for (let i = 0; i < doors; i += 1) {
    const x = -((w - 0.1) / 2) + ((w - 0.1) / doors) * (i + 0.5);
    part(g, box((w - 0.1) / doors - 0.03, 1.7, 0.02), M(color, 0.65), x, 1.0, 0.3);
    part(g, cyl(0.015, 0.015, 0.22, 8), M(CHROME, 0.3), x + (w - 0.1) / doors / 2 - 0.06, 1.0, 0.33);
  }
  return { w, h: 2.03, d: 0.62 };
}

function buildBookshelf(g: THREE.Group, low: boolean): { w: number; h: number; d: number } {
  const wood = M(WOOD, 0.7);
  const h = low ? 1.0 : 1.9;
  part(g, box(0.05, h, 0.32), wood, -0.425, h / 2, 0);
  part(g, box(0.05, h, 0.32), wood, 0.425, h / 2, 0);
  part(g, box(0.9, 0.05, 0.32), wood, 0, h - 0.025, 0);
  part(g, box(0.9, 0.05, 0.32), wood, 0, 0.05, 0);
  const shelves = low ? 1 : 3;
  const palette = ["#a4442e", "#2e6ea4", "#3f7a4d", "#c2a83e", "#6a4d8f"];
  for (let s = 0; s < shelves; s += 1) {
    const y = 0.1 + ((h - 0.2) / (shelves + 1)) * (s + 1);
    part(g, box(0.8, 0.04, 0.3), wood, 0, y - 0.22, 0);
    for (let b = 0; b < 6; b += 1) {
      const bh = 0.24 + ((s * 7 + b * 3) % 4) * 0.03;
      part(g, box(0.09, bh, 0.2), M(palette[(s * 6 + b) % palette.length], 0.8), -0.3 + b * 0.12, y - 0.2 + bh / 2, 0);
    }
  }
  return { w: 0.9, h, d: 0.32 };
}

function buildTvUnit(g: THREE.Group): { w: number; h: number; d: number } {
  part(g, box(1.6, 0.38, 0.4), M(WOOD_DARK, 0.65), 0, 0.24, 0);
  part(g, box(0.06, 0.3, 0.06), M(DARK, 0.5), 0, 0.55, -0.1);
  part(g, rbox(1.3, 0.75, 0.05, 0.01), M("#14181f", 0.4), 0, 1.0, -0.1);
  part(g, box(1.24, 0.69, 0.01), M("#1d3f6e", 0.3, { emissive: "#1d3f6e", emissiveIntensity: 0.9 }), 0, 1.0, -0.07);
  return { w: 1.6, h: 1.38, d: 0.42 };
}

function buildPlant(g: THREE.Group): { w: number; h: number; d: number } {
  part(g, cyl(0.16, 0.12, 0.3, 12), M("#a35f3c", 0.8), 0, 0.15, 0);
  part(g, sph(0.24), M("#4d7c4d", 0.9), 0, 0.52, 0);
  part(g, sph(0.17), M("#5d8f57", 0.9), 0.14, 0.68, 0.08);
  part(g, sph(0.15), M("#436f43", 0.9), -0.13, 0.64, -0.06);
  return { w: 0.55, h: 0.95, d: 0.55 };
}

function buildFloorLamp(g: THREE.Group, color: string): { w: number; h: number; d: number } {
  part(g, cyl(0.16, 0.18, 0.04, 16), M(DARK, 0.5), 0, 0.02, 0);
  part(g, cyl(0.02, 0.02, 1.5, 8), M(DARK, 0.5), 0, 0.79, 0);
  part(g, cyl(0.19, 0.24, 0.28, 16), M(color, 0.9), 0, 1.6, 0);
  part(g, sph(0.06), M("#ffe2b0", 0.4, { emissive: "#ffcf96", emissiveIntensity: 2 }), 0, 1.56, 0);
  return { w: 0.5, h: 1.76, d: 0.5 };
}

function buildRug(g: THREE.Group, shape: "rect" | "round", color: string): { w: number; h: number; d: number } {
  if (shape === "round") {
    part(g, cyl(1.0, 1.0, 0.025, 28), M(color, 0.98), 0, 0.013, 0);
    part(g, cyl(0.72, 0.72, 0.028, 28), M("#e5ddcf", 0.98), 0, 0.014, 0);
    return { w: 2.0, h: 0.03, d: 2.0 };
  }
  part(g, box(2.0, 0.025, 1.4), M(color, 0.98), 0, 0.013, 0);
  part(g, box(1.7, 0.028, 1.1), M("#e5ddcf", 0.98), 0, 0.014, 0);
  return { w: 2.0, h: 0.03, d: 1.4 };
}

// ---------------------------------------------------------------------------
// Public builder + nominal sizes + catalog
// ---------------------------------------------------------------------------

export type SofaVariant = "2-seat" | "3-seat";
export type TableVariant = "rect" | "round";
export type DeskVariant = "plain" | "with-monitor";
export type WardrobeVariant = "2-door" | "3-door";
export type RugVariant = "rect" | "round";
export type ShelfVariant = "tall" | "low";

export const VARIANT_OPTIONS: Partial<Record<FurnitureType, string[]>> = {
  sofa: ["2-seat", "3-seat"],
  dining_table: ["rect", "round"],
  desk: ["plain", "with-monitor"],
  wardrobe: ["2-door", "3-door"],
  rug: ["rect", "round"],
  bookshelf: ["tall", "low"],
};

export interface CatalogEntry {
  id: string;
  label: string;
  category: string;
  type: FurnitureType;
  variant?: string;
  w: number;
  d: number;
  h: number;
  color: string;
}

export const FURNITURE_CATALOG: CatalogEntry[] = [
  { id: "sofa-3", label: "3-Seat Sofa", category: "Living", type: "sofa", variant: "3-seat", w: 2.1, d: 0.9, h: 0.92, color: "#5b7fa6" },
  { id: "sofa-2", label: "2-Seat Sofa", category: "Living", type: "sofa", variant: "2-seat", w: 1.55, d: 0.9, h: 0.92, color: "#7a6a8f" },
  { id: "armchair", label: "Armchair", category: "Living", type: "armchair", w: 0.95, d: 0.9, h: 0.92, color: "#8f6a4d" },
  { id: "coffee-table", label: "Coffee Table", category: "Living", type: "coffee_table", w: 1.1, d: 0.6, h: 0.43, color: "#7a5a3c" },
  { id: "tv-unit", label: "TV Unit", category: "Living", type: "tv_unit", w: 1.6, d: 0.42, h: 1.38, color: "#5c432c" },
  { id: "rug-rect", label: "Rug (rect)", category: "Living", type: "rug", variant: "rect", w: 2.0, d: 1.4, h: 0.03, color: "#8a6f5c" },
  { id: "rug-round", label: "Rug (round)", category: "Living", type: "rug", variant: "round", w: 2.0, d: 2.0, h: 0.03, color: "#5f7a6a" },
  { id: "floor-lamp", label: "Floor Lamp", category: "Living", type: "floor_lamp", w: 0.5, d: 0.5, h: 1.76, color: "#e8ddc8" },
  { id: "plant", label: "Plant", category: "Living", type: "plant", w: 0.55, d: 0.55, h: 0.95, color: "#4d7c4d" },
  { id: "bookshelf", label: "Bookshelf", category: "Living", type: "bookshelf", variant: "tall", w: 0.9, d: 0.32, h: 1.9, color: "#7a5a3c" },
  { id: "bed-single", label: "Single Bed", category: "Bedroom", type: "bed_single", w: 1.0, d: 2.0, h: 1.05, color: "#7a9cc6" },
  { id: "bed-double", label: "Double Bed", category: "Bedroom", type: "bed_double", w: 1.6, d: 2.1, h: 1.05, color: "#c67a8a" },
  { id: "bed-king", label: "King Bed", category: "Bedroom", type: "bed_king", w: 1.9, d: 2.1, h: 1.05, color: "#6a8f7a" },
  { id: "nightstand", label: "Nightstand", category: "Bedroom", type: "nightstand", w: 0.45, d: 0.4, h: 0.55, color: "#7a5a3c" },
  { id: "wardrobe-2", label: "Wardrobe 2-door", category: "Bedroom", type: "wardrobe", variant: "2-door", w: 1.2, d: 0.62, h: 2.03, color: "#8a6b4a" },
  { id: "wardrobe-3", label: "Wardrobe 3-door", category: "Bedroom", type: "wardrobe", variant: "3-door", w: 1.8, d: 0.62, h: 2.03, color: "#6b5a44" },
  { id: "dining-rect", label: "Dining Set (rect)", category: "Kitchen", type: "dining_table", variant: "rect", w: 2.5, d: 2.1, h: 0.98, color: "#7a5a3c" },
  { id: "dining-round", label: "Dining Set (round)", category: "Kitchen", type: "dining_table", variant: "round", w: 2.4, d: 2.4, h: 0.98, color: "#7a5a3c" },
  { id: "chair", label: "Dining Chair", category: "Kitchen", type: "chair", w: 0.45, d: 0.45, h: 0.98, color: "#7a5a3c" },
  { id: "counter", label: "Kitchen Counter", category: "Kitchen", type: "kitchen_counter", w: 2.26, d: 0.66, h: 1.15, color: "#8f9aa8" },
  { id: "toilet", label: "Toilet", category: "Bath", type: "toilet", w: 0.45, d: 0.62, h: 0.85, color: "#f1f2f4" },
  { id: "bathtub", label: "Bathtub", category: "Bath", type: "bathtub", w: 0.85, d: 1.75, h: 0.8, color: "#f1f2f4" },
  { id: "vanity", label: "Vanity Sink", category: "Bath", type: "sink_vanity", w: 0.9, d: 0.5, h: 0.95, color: "#e8e6e1" },
  { id: "pedestal-sink", label: "Pedestal Sink", category: "Bath", type: "sink", w: 0.5, d: 0.45, h: 0.85, color: "#f1f2f4" },
  { id: "shower", label: "Shower", category: "Bath", type: "shower", w: 0.95, d: 0.95, h: 2.1, color: "#bcd6e8" },
  { id: "desk", label: "Desk", category: "Office", type: "desk", variant: "with-monitor", w: 1.4, d: 0.7, h: 1.3, color: "#7a5a3c" },
  { id: "office-chair", label: "Office Chair", category: "Office", type: "office_chair", w: 0.6, d: 0.6, h: 1.05, color: "#3a4356" },
  { id: "column", label: "Column", category: "Structure", type: "column", w: 0.35, d: 0.35, h: 2.7, color: "#e8e4da" },
];

export function buildFurniture(type: FurnitureType, variant: string | undefined, color: string | undefined): THREE.Group {
  const g = new THREE.Group();
  const c = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#5b7fa6";
  switch (type) {
    case "sofa":
      buildSofa(g, variant === "3-seat" ? 3 : 2, c);
      break;
    case "armchair":
      buildSofa(g, 1, c);
      break;
    case "coffee_table": {
      part(g, rbox(1.1, 0.06, 0.6, 0.02), M(WOOD, 0.65), 0, 0.4, 0);
      part(g, box(0.95, 0.04, 0.45), M(WOOD, 0.7), 0, 0.14, 0);
      legs(g, M(WOOD_DARK, 0.7), 1.0, 0.5, 0.38);
      break;
    }
    case "bed_single":
      buildBed(g, "single", c);
      break;
    case "bed_double":
      buildBed(g, "double", c);
      break;
    case "bed_king":
      buildBed(g, "king", c);
      break;
    case "nightstand": {
      part(g, box(0.45, 0.46, 0.4), M(WOOD, 0.7), 0, 0.28, 0);
      part(g, box(0.37, 0.14, 0.02), M(WOOD_DARK, 0.7), 0, 0.36, 0.2);
      part(g, sph(0.025), M(CHROME, 0.3), 0, 0.36, 0.22);
      part(g, box(0.48, 0.04, 0.43), M(WOOD_DARK, 0.7), 0, 0.53, 0);
      break;
    }
    case "dining_table":
      buildDiningTable(g, variant === "round" ? "round" : "rect");
      break;
    case "chair":
      buildChairAt(g, 0, 0, 0, M(WOOD, 0.65));
      break;
    case "desk":
      buildDesk(g, variant !== "plain");
      break;
    case "office_chair": {
      part(g, rbox(0.5, 0.09, 0.5, 0.03), M(c, 0.9), 0, 0.52, 0);
      part(g, rbox(0.48, 0.6, 0.09, 0.03), M(c, 0.9), 0, 0.85, -0.23);
      part(g, cyl(0.03, 0.03, 0.35, 8), M(DARK, 0.5), 0, 0.3, 0);
      part(g, cyl(0.3, 0.32, 0.05, 16), M(DARK, 0.5), 0, 0.05, 0);
      break;
    }
    case "kitchen_counter":
      buildKitchenCounter(g);
      break;
    case "toilet":
      buildToilet(g);
      break;
    case "bathtub":
      buildBathtub(g);
      break;
    case "sink": {
      part(g, cyl(0.09, 0.12, 0.6, 12), M(CERAMIC, 0.35), 0, 0.3, 0);
      part(g, cyl(0.25, 0.18, 0.15, 18), M(CERAMIC, 0.35), 0, 0.68, 0);
      part(g, cyl(0.02, 0.02, 0.16, 8), M(CHROME, 0.3), 0, 0.82, -0.16);
      break;
    }
    case "sink_vanity": {
      part(g, box(0.9, 0.72, 0.48), M(c, 0.7), 0, 0.4, 0);
      part(g, box(0.94, 0.05, 0.52), M(CERAMIC, 0.35), 0, 0.79, 0);
      part(g, cyl(0.19, 0.15, 0.13, 18), M(CERAMIC, 0.35), -0.2, 0.86, 0);
      part(g, cyl(0.18, 0.15, 0.13, 18), M(CERAMIC, 0.35), 0.2, 0.86, 0);
      part(g, cyl(0.02, 0.02, 0.14, 8), M(CHROME, 0.3), -0.2, 0.95, -0.14);
      part(g, cyl(0.02, 0.02, 0.14, 8), M(CHROME, 0.3), 0.2, 0.95, -0.14);
      break;
    }
    case "shower":
      buildShower(g);
      break;
    case "wardrobe":
      buildWardrobe(g, variant === "3-door" ? 3 : 2, c);
      break;
    case "bookshelf":
      buildBookshelf(g, variant === "low");
      break;
    case "tv_unit":
      buildTvUnit(g);
      break;
    case "plant":
      buildPlant(g);
      break;
    case "floor_lamp":
      buildFloorLamp(g, c);
      break;
    case "rug":
      buildRug(g, variant === "round" ? "round" : "rect", c);
      break;
    case "column": {
      part(g, box(0.34, 0.12, 0.34), M(CERAMIC, 0.8), 0, 0.06, 0);
      part(g, cyl(0.14, 0.16, 2.4, 14), M(c, 0.8), 0, 1.32, 0);
      part(g, box(0.4, 0.12, 0.4), M(CERAMIC, 0.8), 0, 2.58, 0);
      break;
    }
    case "furnace":
    case "washing_machine": {
      // Legacy extraction types: clean utility boxes.
      part(g, rbox(0.65, 1.05, 0.62, 0.03), M("#b9c0c9", 0.5), 0, 0.55, 0);
      part(g, cyl(0.2, 0.2, 0.03, 20), M("#2c313b", 0.4), 0, 0.62, 0.31, Math.PI / 2);
      part(g, box(0.5, 0.08, 0.02), M("#2c313b", 0.5), 0, 0.95, 0.31);
      break;
    }
    default:
      part(g, box(0.8, 0.8, 0.8), M(WOOD, 0.8), 0, 0.4, 0);
      break;
  }
  return g;
}

export function nominalSize(type: FurnitureType, variant?: string): { w: number; h: number; d: number } {
  switch (type) {
    case "sofa":
      return variant === "3-seat" ? { w: 2.1, h: 0.92, d: 0.9 } : { w: 1.55, h: 0.92, d: 0.9 };
    case "armchair":
      return { w: 0.95, h: 0.92, d: 0.9 };
    case "coffee_table":
      return { w: 1.1, h: 0.43, d: 0.6 };
    case "bed_single":
      return { w: 1.0, h: 1.05, d: 2.0 };
    case "bed_double":
      return { w: 1.6, h: 1.05, d: 2.1 };
    case "bed_king":
      return { w: 1.9, h: 1.05, d: 2.1 };
    case "nightstand":
      return { w: 0.48, h: 0.55, d: 0.43 };
    case "dining_table":
      return variant === "round" ? { w: 2.4, h: 0.98, d: 2.4 } : { w: 2.5, h: 0.98, d: 2.1 };
    case "chair":
      return { w: 0.45, h: 0.98, d: 0.45 };
    case "desk":
      return { w: 1.4, h: variant === "plain" ? 0.77 : 1.3, d: 0.7 };
    case "office_chair":
      return { w: 0.6, h: 1.15, d: 0.6 };
    case "kitchen_counter":
      return { w: 2.26, h: 1.15, d: 0.66 };
    case "toilet":
      return { w: 0.45, h: 0.85, d: 0.62 };
    case "bathtub":
      return { w: 0.85, h: 0.8, d: 1.75 };
    case "sink":
      return { w: 0.5, h: 0.9, d: 0.45 };
    case "sink_vanity":
      return { w: 0.94, h: 1.02, d: 0.52 };
    case "shower":
      return { w: 0.95, h: 2.1, d: 0.95 };
    case "wardrobe":
      return variant === "3-door" ? { w: 1.84, h: 2.03, d: 0.62 } : { w: 1.24, h: 2.03, d: 0.62 };
    case "bookshelf":
      return variant === "low" ? { w: 0.9, h: 1.0, d: 0.32 } : { w: 0.9, h: 1.9, d: 0.32 };
    case "tv_unit":
      return { w: 1.6, h: 1.38, d: 0.42 };
    case "plant":
      return { w: 0.55, h: 0.95, d: 0.55 };
    case "floor_lamp":
      return { w: 0.5, h: 1.76, d: 0.5 };
    case "rug":
      return variant === "round" ? { w: 2.0, h: 0.03, d: 2.0 } : { w: 2.0, h: 0.03, d: 1.4 };
    case "column":
      return { w: 0.4, h: 2.64, d: 0.4 };
    case "furnace":
    case "washing_machine":
      return { w: 0.65, h: 1.1, d: 0.65 };
    default:
      return { w: 0.8, h: 0.8, d: 0.8 };
  }
}
