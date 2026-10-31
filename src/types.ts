// Shared types for the BlueprintTo3D pipeline.
// Units: meters for geometry, square meters for areas.

export interface Point2D {
  x: number;
  y: number;
}

export type WallMaterial =
  | "brick"
  | "concrete"
  | "drywall"
  | "wood"
  | "stone"
  | "glass"
  | "stucco"
  | "vinyl_siding";

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number;
  height: number;
  material: WallMaterial;
  color: string;
  isExterior: boolean;
}

export interface Door {
  id: string;
  position: Point2D;
  width: number;
  height: number;
  wallId: string;
  style: "single" | "double" | "sliding" | "french" | "garage" | "pocket";
  swingDirection: "inward" | "outward" | "left" | "right";
  material: "wood" | "glass" | "metal" | "composite";
  color: string;
}

export interface PlanWindow {
  id: string;
  position: Point2D;
  width: number;
  height: number;
  sillHeight: number;
  wallId: string;
  style: "single-hung" | "double-hung" | "casement" | "bay" | "sliding" | "fixed" | "skylight";
  panes: number;
  material: "wood" | "vinyl" | "aluminum";
  color: string;
}

export type RoomType =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "dining_room"
  | "garage"
  | "hallway"
  | "closet"
  | "laundry"
  | "office"
  | "basement"
  | "attic"
  | "porch"
  | "balcony"
  | "utility_room"
  | "patio"
  | "unknown";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  vertices: Point2D[];
  area: number;
  wallIds: string[];
}

export interface Roof {
  type: "gable" | "hip" | "flat" | "mansard" | "gambrel" | "shed" | "butterfly";
  pitch: number;
  overhang: number;
  material: "asphalt_shingle" | "tile" | "metal" | "slate" | "wood_shake";
  color: string;
}

export interface Staircase {
  id: string;
  position: Point2D;
  width: number;
  direction: "up" | "down";
  steps: number;
  type: "straight" | "l-shaped" | "u-shaped" | "spiral";
}

export type FurnitureType =
  | "bed_double"
  | "bed_single"
  | "sofa"
  | "dining_table"
  | "chair"
  | "kitchen_counter"
  | "toilet"
  | "bathtub"
  | "sink"
  | "desk"
  | "wardrobe"
  | "coffee_table"
  | "nightstand"
  | "plant"
  | "tv_unit"
  | "furnace"
  | "washing_machine"
  | "column";

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  position: Point2D;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  roomId?: string;
  room?: string;
  name?: string;
  color?: string;
  /** What symbol was seen on the plan (deep pass). */
  evidence?: string;
}

export interface HouseAnalysis {
  id: string;
  metadata: {
    style: string;
    floors: number;
    totalArea: number;
    overallWidth: number;
    overallDepth: number;
    wallHeight: number;
    scale: number;
  };
  walls: Wall[];
  doors: Door[];
  windows: PlanWindow[];
  rooms: Room[];
  roof: Roof;
  furniture?: FurnitureItem[];
  staircases: Staircase[];
  confidence: number;
  notes: string[];
}

/** Where the current analysis came from. Always shown in the UI. */
export type AnalysisSource = "live" | "sample";

export interface GeneratedTextures {
  facade?: string; // data URL
  floor?: string;
  roof?: string;
}

export interface SamBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
  confidence?: number;
}

export interface SamMatch {
  concept: string;
  ordinal: number;
  box: SamBox;
}

export type PipelineStage =
  | "idle"
  | "uploading"
  | "analyzing"
  | "complete"
  | "error";
