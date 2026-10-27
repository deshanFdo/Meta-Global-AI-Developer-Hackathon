// TypeScript types for the Blueprint-to-3D pipeline

// ============================================
// Floor Plan Analysis Types
// ============================================

/** Represents a 2D point on the floor plan */
export interface Point2D {
  x: number;
  y: number;
}

/** Represents a wall segment extracted from the floor plan */
export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number; // in meters
  height: number; // in meters
  material: WallMaterial;
  color: string;
  isExterior: boolean;
}

/** Represents a door in the floor plan */
export interface Door {
  id: string;
  position: Point2D;
  width: number; // in meters
  height: number; // in meters
  wallId: string; // which wall it belongs to
  style: 'single' | 'double' | 'sliding' | 'french' | 'garage';
  swingDirection: 'inward' | 'outward' | 'left' | 'right';
  material: 'wood' | 'glass' | 'metal' | 'composite';
  color: string;
}

/** Represents a window in the floor plan */
export interface Window {
  id: string;
  position: Point2D;
  width: number; // in meters
  height: number; // in meters
  sillHeight: number; // height from floor
  wallId: string;
  style: 'single-hung' | 'double-hung' | 'casement' | 'bay' | 'sliding' | 'fixed' | 'skylight';
  panes: number;
  material: 'wood' | 'vinyl' | 'aluminum';
  color: string;
}

/** Represents a room in the floor plan */
export interface Room {
  id: string;
  name: string;
  type: RoomType;
  vertices: Point2D[]; // polygon outline
  area: number; // square meters
  wallIds: string[];
}

/** Types of rooms we can identify */
export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'dining_room'
  | 'garage'
  | 'hallway'
  | 'closet'
  | 'laundry'
  | 'office'
  | 'basement'
  | 'attic'
  | 'porch'
  | 'balcony'
  | 'unknown';

/** Wall material types */
export type WallMaterial =
  | 'brick'
  | 'concrete'
  | 'drywall'
  | 'wood'
  | 'stone'
  | 'glass'
  | 'stucco'
  | 'vinyl_siding';

/** Roof configuration */
export interface Roof {
  type: 'gable' | 'hip' | 'flat' | 'mansard' | 'gambrel' | 'shed' | 'butterfly';
  pitch: number; // degrees
  overhang: number; // meters
  material: 'asphalt_shingle' | 'tile' | 'metal' | 'slate' | 'wood_shake';
  color: string;
}

/** Staircase in the plan */
export interface Staircase {
  id: string;
  position: Point2D;
  width: number;
  direction: 'up' | 'down';
  steps: number;
  type: 'straight' | 'l-shaped' | 'u-shaped' | 'spiral';
}

// ============================================
// Complete House Analysis Result
// ============================================

/** The full analysis output from the AI pipeline */
export interface HouseAnalysis {
  /** Unique identifier for this analysis */
  id: string;

  /** Overall house metadata */
  metadata: {
    style: string;
    floors: number;
    totalArea: number; // square meters
    overallWidth: number; // meters
    overallDepth: number; // meters
    wallHeight: number; // per floor, meters
    scale: number; // pixels-to-meters conversion factor
  };

  /** All detected walls */
  walls: Wall[];

  /** All detected doors */
  doors: Door[];

  /** All detected windows */
  windows: Window[];

  /** All detected rooms */
  rooms: Room[];

  /** Roof configuration */
  roof: Roof;

  /** Staircases (if multi-floor) */
  staircases: Staircase[];

  /** AI confidence score (0-1) */
  confidence: number;

  /** Any notes or warnings from analysis */
  notes: string[];
}

// ============================================
// API Request/Response Types
// ============================================

/** Request body for the analysis endpoint */
export interface AnalyzeRequest {
  image: string; // base64 encoded image
  imageType: 'floor_plan' | 'blueprint' | 'sketch';
  options?: {
    generateTextures?: boolean;
    detailLevel?: 'low' | 'medium' | 'high';
    assumedScale?: number; // if user provides scale info
  };
}

/** Response from the analysis endpoint */
export interface AnalyzeResponse {
  success: boolean;
  analysis?: HouseAnalysis;
  textures?: GeneratedTextures;
  error?: string;
  processingTime: number; // ms
}

/** Generated textures from Muse Image */
export interface GeneratedTextures {
  wallTexture?: string; // URL or base64
  floorTexture?: string;
  roofTexture?: string;
  doorTexture?: string;
  windowTexture?: string;
  [key: string]: string | undefined;
}

// ============================================
// 3D Viewer State
// ============================================

/** Camera configuration for the 3D viewer */
export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

/** Viewer state */
export interface ViewerState {
  isLoading: boolean;
  analysis: HouseAnalysis | null;
  textures: GeneratedTextures | null;
  selectedElement: string | null; // id of selected wall/door/window
  viewMode: 'perspective' | 'top' | 'front' | 'side';
  showLabels: boolean;
  showDimensions: boolean;
  showWireframe: boolean;
  currentFloor: number;
}

/** Pipeline processing stage */
export type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'analyzing_structure' // Muse Spark analyzing
  | 'segmenting'          // SAM 3.1 segmenting
  | 'fusing'              // Combining results
  | 'generating_3d'       // Building mesh
  | 'generating_textures' // Muse Image
  | 'complete'
  | 'error';

export interface PipelineProgress {
  stage: PipelineStage;
  progress: number; // 0-100
  message: string;
  startedAt: number;
  estimatedRemaining?: number; // seconds
}

