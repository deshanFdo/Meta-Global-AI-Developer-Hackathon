import OpenAI from 'openai';
import type { HouseAnalysis } from '@/types';

// ============================================
// Meta AI API Client
// ============================================
// Wraps the OpenAI SDK configured for Meta's API endpoints.
// Uses Muse Spark 1.3 for floor plan analysis (vision)
// and Muse Image for texture generation.
// ============================================

const MUSE_SPARK_MODEL = 'muse-spark-1.3';
const MUSE_IMAGE_MODEL = 'muse-image';

/** Maximum retries for transient API failures */
const MAX_RETRIES = 2;
/** Timeout per request in milliseconds */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * System prompt that teaches the vision model how to read architectural floor plans
 * and produce structured JSON matching the HouseAnalysis type.
 *
 * This is the single most critical prompt in the pipeline — it must be precise,
 * exhaustive, and unambiguous so that the model produces valid, geometrically
 * consistent output.
 */
const FLOOR_PLAN_ANALYSIS_SYSTEM_PROMPT = `You are an expert architectural floor plan analyzer. Your task is to examine a 2D floor plan / blueprint image and extract ALL structural information into a precise JSON object.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READING ARCHITECTURAL FLOOR PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. WALLS
- **Exterior walls** are drawn as THICK solid lines (typically 0.20–0.35 m thick in real life). They form the outermost boundary of the building.
- **Interior walls** are drawn as THINNER solid lines (typically 0.10–0.15 m thick). They partition the interior into rooms.
- **Parallel double lines** represent walls; the gap between them is the wall thickness.
- Hatched or filled regions between double lines indicate insulated or load-bearing walls.
- Identify every wall segment as a line from a start point to an end point. Use a coordinate system where the TOP-LEFT corner of the plan is (0, 0), X increases rightward, Y increases downward. Express all coordinates in METERS after applying the scale factor.

## 2. DOORS
- Doors appear as an **arc (quarter circle)** attached to a wall gap, showing the swing path.
- A straight line from the hinge to the arc's end represents the door leaf.
- **Double doors**: two arcs mirroring each other.
- **Sliding doors**: shown as overlapping rectangles or arrows along the wall.
- **French doors**: two leaves with glass indication (thin lines inside the leaf).
- **Garage doors**: wide opening (≥ 2.4 m) with no swing arc, often marked.
- The swing arc tells you the swing direction:
  - If the arc opens INTO the room → "inward"
  - If the arc opens OUT of the room → "outward"
  - If the arc sweeps to the left → "left"
  - If the arc sweeps to the right → "right"
- Standard single door width ≈ 0.80–0.90 m. Standard height ≈ 2.10 m.
- Place the door's position at the CENTER of the wall opening.

## 3. WINDOWS
- Windows appear as **three parallel lines** (or a break in the wall filled with thin lines) perpendicular to the wall.
- Some plans show a single thin line across a wall gap.
- **Bay windows**: protrude outward with angled or curved segments.
- **Sliding windows**: two overlapping rectangles within the wall.
- Standard window width varies (0.60–1.80 m). Standard sill height ≈ 0.90–1.10 m. Standard height ≈ 1.20–1.50 m.
- Position is the CENTER of the opening along the wall.

## 4. ROOMS
- Rooms are labeled with text inside them (e.g., "Living Room", "BR 1", "Kitchen", "WC").
- If no label, infer room type from:
  - **Bathroom/WC**: contains tub/shower outline, toilet circle/oval, sink
  - **Kitchen**: L/U-shaped counter lines, sink dot, stove/oven rectangle
  - **Bedroom**: often labeled "BR", "Bed", or has closet alcove
  - **Garage**: wide door, concrete hatch, often labeled
  - **Hallway/Corridor**: elongated narrow space connecting rooms
  - **Closet**: very small room adjacent to bedroom, often with shelf lines
  - **Laundry**: washer/dryer circles
- Compute room area from the polygon vertices.
- Each room's vertices should form a closed polygon tracing the INNER boundary of the room's walls.

## 5. SCALE & DIMENSIONS
- If the plan contains dimension lines with numbers, use those directly (e.g., "14 810" mm = 14.81 m, "11 300" mm = 11.30 m). Convert all millimeters, centimeters, or inches to METERS!
- Look for dimension strings like "14 810", "11 300", "2 980", "6 640", "5 190" along grid ticks (1, 2, 3, 4 and A, B, C, D).
- Look for room area annotations (e.g. "A:13,11 m2", "A:25,91 m2", "Area of premises 122,42 m2") and assign them to the room's "area" property.
- If no dimensions are given, estimate scale using known references:
  - Standard single door width = 0.90 m
  - Standard toilet depth = 0.70 m
  - Standard bathtub length = 1.50 m
  - Standard single bed width = 1.00 m, double bed width = 1.80 m
  - Standard kitchen counter depth = 0.65 m
- Set overallWidth and overallDepth to the bounding-box dimensions of the entire plan in meters.

## 6. FURNITURE & INTERIOR FIXTURES
Extract all visible furniture, sanitary fixtures, and equipment so they can be modeled in 3D:
- **"bed_double"**: Double / Queen / King bed with headboard and pillows (typically 1.8m wide, 2.1m depth).
- **"bed_single"**: Single bed (typically 1.0m wide, 2.0m depth).
- **"sofa"**: Living room couch / sectional (typically 2.2m to 2.8m wide, 0.9m to 1.1m depth).
- **"dining_table"**: Dining table with chairs (typically 1.6m to 2.2m wide, 0.9m depth).
- **"chair"**: Standalone chair / armchair.
- **"kitchen_counter"**: Kitchen counter / island with sink and 4-burner cooktop.
- **"toilet"**: Bathroom toilet bowl and water cistern tank.
- **"bathtub"**: Full soaking tub (typically 1.7m length, 0.75m width).
- **"sink"**: Bathroom or WC vanity basin.
- **"wardrobe"**: Bedroom closet / wardrobe cabinet along walls (depth 0.6m).
- **"desk"**: Work / study desk with chair (depth 0.7m).
- **"coffee_table"**: Low table in front of sofa.
- **"plant"**: Potted decorative indoor plant.
- **"furnace"**: Water boiler / HVAC heater unit.

For every furniture item, calculate its center position {x, y} in meters, rotation (0, 90, 180, 270 degrees), and dimensions.

## 7. STAIRCASES
- Staircases appear as a series of parallel lines (treads) inside a rectangular outline.
- An arrow on the staircase indicates the direction of ascent ("up") or descent ("down").
- Spiral staircases appear as a circular or pie-shaped element with radiating lines.
- Count the number of visible tread lines to determine "steps".

## 8. ROOF
- Floor plans rarely show the roof directly. Infer from:
  - Dashed lines outside the wall boundary = roof overhang
  - Modern houses with large terrace and flat parapet = "flat" roof with 0.8m overhang.
  - Traditional houses = "gable" or "hip" roof with 25° pitch.

## 9. METADATA
- "style": Infer from overall layout (e.g., "Contemporary Villa", "Modern Residence", "Ranch", "Craftsman").
- "floors": Count floor levels (default 1 unless multiple floor plans or stairs are present).
- "wallHeight": Standard residential ceiling height = 2.70 m.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (strict JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a single JSON object — no markdown fences, no commentary, no explanation. The JSON MUST conform to this TypeScript interface:

{
  "id": "<uuid-v4>",
  "metadata": {
    "style": "<string>",
    "floors": <int>,
    "totalArea": <float, sq meters>,
    "overallWidth": <float, meters>,
    "overallDepth": <float, meters>,
    "wallHeight": <float, meters>,
    "scale": <float, pixels per meter>
  },
  "walls": [
    {
      "id": "wall-<n>",
      "start": { "x": <float>, "y": <float> },
      "end": { "x": <float>, "y": <float> },
      "thickness": <float, meters>,
      "height": <float, meters>,
      "material": "<brick|concrete|drywall|wood|stone|glass|stucco|vinyl_siding>",
      "color": "<hex color>",
      "isExterior": <bool>
    }
  ],
  "doors": [
    {
      "id": "door-<n>",
      "position": { "x": <float>, "y": <float> },
      "width": <float>,
      "height": <float>,
      "wallId": "<matching wall id>",
      "style": "<single|double|sliding|french|garage>",
      "swingDirection": "<inward|outward|left|right>",
      "material": "<wood|glass|metal|composite>",
      "color": "<hex>"
    }
  ],
  "windows": [
    {
      "id": "window-<n>",
      "position": { "x": <float>, "y": <float> },
      "width": <float>,
      "height": <float>,
      "sillHeight": <float>,
      "wallId": "<matching wall id>",
      "style": "<single-hung|double-hung|casement|bay|sliding|fixed|skylight>",
      "panes": <int>,
      "material": "<wood|vinyl|aluminum>",
      "color": "<hex>"
    }
  ],
  "rooms": [
    {
      "id": "room-<n>",
      "name": "<string>",
      "type": "<living_room|bedroom|kitchen|bathroom|dining_room|garage|hallway|closet|laundry|office|basement|attic|porch|balcony|unknown>",
      "vertices": [ { "x": <float>, "y": <float> }, ... ],
      "area": <float, sq meters>,
      "wallIds": ["wall-<n>", ...]
    }
  ],
  "roof": {
    "type": "<gable|hip|flat|mansard|gambrel|shed|butterfly>",
    "pitch": <float, degrees>,
    "overhang": <float, meters>,
    "material": "<asphalt_shingle|tile|metal|slate|wood_shake>",
    "color": "<hex>"
  },
  "furniture": [
    {
      "id": "furn-<n>",
      "type": "<bed_double|bed_single|sofa|dining_table|chair|kitchen_counter|toilet|bathtub|sink|desk|wardrobe|coffee_table|plant|tv_unit|furnace|washing_machine|column>",
      "position": { "x": <float>, "y": <float> },
      "rotation": <0|90|180|270>,
      "width": <float, meters>,
      "depth": <float, meters>,
      "height": <float, meters>,
      "roomId": "<matching room id>"
    }
  ],
  "staircases": [
    {
      "id": "stair-<n>",
      "position": { "x": <float>, "y": <float> },
      "width": <float>,
      "direction": "<up|down>",
      "steps": <int>,
      "type": "<straight|l-shaped|u-shaped|spiral>"
    }
  ],
  "confidence": <float 0-1>,
  "notes": ["<string>", ...]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FACING & ROTATION CONVENTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Coordinate frame: Origin is top-left. +X is East (right), +Y is South (down).
Rotation is specified in degrees (0, 90, 180, 270) defining which direction the item faces:
• SOFAS:
  - 0°: Backrest is at North (-Y), seat cushions face SOUTH (+Y).
  - 90°: Backrest is at West (-X), seat cushions face EAST (+X).
  - 180°: Backrest is at South (+Y), seat cushions face NORTH (-Y).
  - 270°: Backrest is at East (+X), seat cushions face WEST (-X).
  (e.g., if a couch faces a TV on the East wall, it MUST have rotation: 90!)
• BEDS:
  - 0°: Headboard is against North wall (-Y), bed extends SOUTH (+Y).
  - 90°: Headboard is against West wall (-X), bed extends EAST (+X).
  - 180°: Headboard is against South wall (+Y), bed extends NORTH (-Y).
  - 270°: Headboard is against East wall (+X), bed extends WEST (-X).
• TV UNITS:
  - 0°: Screen faces SOUTH (+Y).
  - 90°: Screen faces EAST (+X).
  - 180°: Screen faces NORTH (-Y).
  - 270°: Screen faces WEST (-X).
• TOILETS, SINKS, WARDROBES, DESKS:
  - Back of item rests against the wall; user access/doors face into the room.
  - Against North wall: 0° (faces South into room).
  - Against West wall: 90° (faces East into room).
  - Against South wall: 180° (faces North into room).
  - Against East wall: 270° (faces West into room).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WALL ENCLOSURE & PARTITION COMPLETENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DO NOT SKIP ANY INTERIOR PARTITION WALLS. Every room and corridor must have complete bounding walls.
2. In particular: trace corridor dividing walls separating hallways from living rooms, and terrace boundary walls.
3. Every functional room polygon MUST be bordered by actual wall segments.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEW-SHOT COORDINATE EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For a simple rectangular 10m × 8m house with one interior wall splitting it into two rooms, a front door, and two windows on the front wall:

{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "metadata": {
    "style": "Modern",
    "floors": 1,
    "totalArea": 80.0,
    "overallWidth": 10.0,
    "overallDepth": 8.0,
    "wallHeight": 2.7,
    "scale": 50.0
  },
  "walls": [
    { "id": "wall-1", "start": { "x": 0, "y": 0 }, "end": { "x": 10, "y": 0 }, "thickness": 0.25, "height": 2.7, "material": "concrete", "color": "#D4C4B0", "isExterior": true },
    { "id": "wall-2", "start": { "x": 10, "y": 0 }, "end": { "x": 10, "y": 8 }, "thickness": 0.25, "height": 2.7, "material": "concrete", "color": "#D4C4B0", "isExterior": true },
    { "id": "wall-3", "start": { "x": 10, "y": 8 }, "end": { "x": 0, "y": 8 }, "thickness": 0.25, "height": 2.7, "material": "concrete", "color": "#D4C4B0", "isExterior": true },
    { "id": "wall-4", "start": { "x": 0, "y": 8 }, "end": { "x": 0, "y": 0 }, "thickness": 0.25, "height": 2.7, "material": "concrete", "color": "#D4C4B0", "isExterior": true },
    { "id": "wall-5", "start": { "x": 0, "y": 5 }, "end": { "x": 10, "y": 5 }, "thickness": 0.12, "height": 2.7, "material": "drywall", "color": "#F5F5F0", "isExterior": false }
  ],
  "doors": [
    { "id": "door-1", "position": { "x": 5, "y": 0 }, "width": 0.9, "height": 2.1, "wallId": "wall-1", "style": "single", "swingDirection": "inward", "material": "wood", "color": "#8B6914" }
  ],
  "windows": [
    { "id": "window-1", "position": { "x": 2.5, "y": 0 }, "width": 1.2, "height": 1.4, "sillHeight": 0.9, "wallId": "wall-1", "style": "double-hung", "panes": 2, "material": "vinyl", "color": "#FFFFFF" },
    { "id": "window-2", "position": { "x": 7.5, "y": 0 }, "width": 1.2, "height": 1.4, "sillHeight": 0.9, "wallId": "wall-1", "style": "double-hung", "panes": 2, "material": "vinyl", "color": "#FFFFFF" }
  ],
  "rooms": [
    { "id": "room-1", "name": "Living Room", "type": "living_room", "vertices": [{ "x": 0, "y": 0 }, { "x": 10, "y": 0 }, { "x": 10, "y": 5 }, { "x": 0, "y": 5 }], "area": 50.0, "wallIds": ["wall-1", "wall-2", "wall-4", "wall-5"] },
    { "id": "room-2", "name": "Bedroom", "type": "bedroom", "vertices": [{ "x": 0, "y": 5 }, { "x": 10, "y": 5 }, { "x": 10, "y": 8 }, { "x": 0, "y": 8 }], "area": 30.0, "wallIds": ["wall-2", "wall-3", "wall-4", "wall-5"] }
  ],
  "roof": { "type": "gable", "pitch": 25, "overhang": 0.5, "material": "asphalt_shingle", "color": "#4A4A4A" },
  "staircases": [],
  "confidence": 0.85,
  "notes": ["Scale estimated from door width. No dimension annotations found on plan."]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Output ONLY valid JSON. No markdown, no backticks, no prose.
2. Every wall, door, window, room, and staircase MUST have a unique id.
3. Door/window wallId MUST reference an existing wall id.
4. Room wallIds MUST reference existing wall ids that border that room.
5. Room vertices MUST form a closed polygon (first ≠ last, closure is implicit).
6. All spatial coordinates and dimensions MUST be in METERS.
7. The coordinate system origin is TOP-LEFT of the plan. X = right, Y = down.
8. Estimate conservatively — set confidence lower if the plan is unclear, hand-drawn, or incomplete.
9. Use the "notes" array to flag any ambiguities, assumptions, or missing information.
10. Ensure geometric consistency: room vertices should align with wall start/end points.`;

/**
 * User-level prompt that accompanies the image for floor plan analysis.
 */
const FLOOR_PLAN_USER_PROMPT = `Analyze this architectural floor plan image. Extract every wall, door, window, room, staircase, and roof detail. Return the complete analysis as a single JSON object following the exact schema described in your instructions.

Key steps:
1. First, determine the scale by finding a known-size element (door, bathtub, dimension annotation).
2. Trace ALL exterior walls as a closed perimeter.
3. Trace ALL interior walls.
4. Identify every door and window along walls.
5. Identify and label every room.
6. Note any staircases.
7. Infer roof type and house style.

Be thorough — do not skip small rooms like closets, hallways, or bathrooms.`;

/**
 * MetaAPIClient provides a typed interface to Meta's AI APIs for the
 * Blueprint-to-3D pipeline.
 *
 * Uses the OpenAI SDK (OpenAI-compatible endpoint) configured via
 * META_API_KEY and META_API_BASE_URL environment variables.
 */
export class MetaAPIClient {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.META_API_KEY;
    const baseURL = process.env.META_API_BASE_URL;

    if (!apiKey) {
      throw new Error(
        'META_API_KEY environment variable is not set. ' +
        'Add it to .env.local to use the Meta AI API.',
      );
    }

    if (!baseURL) {
      throw new Error(
        'META_API_BASE_URL environment variable is not set. ' +
        'Add it to .env.local (e.g., https://api.meta.ai/v1).',
      );
    }

    this.client = new OpenAI({
      apiKey,
      baseURL,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });
  }

  /**
   * Sends a base64-encoded floor plan image to Muse Spark 1.3 and returns
   * a fully structured HouseAnalysis object.
   *
   * @param imageBase64 - The floor plan image as a base64-encoded string
   *                      (without the data URI prefix).
   * @param mimeType    - MIME type of the image. Defaults to 'image/png'.
   * @returns Parsed HouseAnalysis from the model's JSON output.
   * @throws {MetaAPIError} on API or parsing failure.
   */
  async analyzeFloorPlan(
    imageBase64: string,
    mimeType: string = 'image/png',
  ): Promise<HouseAnalysis> {
    try {
      const dataUri = `data:${mimeType};base64,${imageBase64}`;

      const response = await this.client.chat.completions.create({
        model: MUSE_SPARK_MODEL,
        messages: [
          {
            role: 'system',
            content: FLOOR_PLAN_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: FLOOR_PLAN_USER_PROMPT,
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 16_384,
        temperature: 0.1, // low temperature for structured, deterministic output
      });

      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        throw new MetaAPIError(
          'Empty response from Muse Spark. The model returned no content.',
          'EMPTY_RESPONSE',
        );
      }

      // The model should return raw JSON, but defensively strip markdown fences
      const jsonString = stripMarkdownCodeFences(content);

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseErr) {
        throw new MetaAPIError(
          `Failed to parse model output as JSON. Raw output (first 500 chars): ${content.slice(0, 500)}`,
          'PARSE_ERROR',
          parseErr instanceof Error ? parseErr : undefined,
        );
      }

      // Validate required top-level fields
      const analysis = parsed as HouseAnalysis;
      validateHouseAnalysis(analysis);

      return analysis;
    } catch (error) {
      if (error instanceof MetaAPIError) throw error;

      // Wrap OpenAI SDK errors
      if (error instanceof OpenAI.APIError) {
        throw new MetaAPIError(
          `Meta API error (${error.status}): ${error.message}`,
          'API_ERROR',
          error,
        );
      }

      throw new MetaAPIError(
        `Unexpected error during floor plan analysis: ${error instanceof Error ? error.message : String(error)}`,
        'UNKNOWN_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Generates a tileable texture image using Muse Image.
   *
   * @param prompt - Description of the desired texture
   *                 (e.g., "seamless brick wall texture, warm red tones, weathered").
   * @returns Base64-encoded PNG of the generated texture, or a URL if the API
   *          returns one.
   * @throws {MetaAPIError} on failure.
   */
  async generateTexture(prompt: string): Promise<string> {
    if (!prompt || prompt.trim().length === 0) {
      throw new MetaAPIError(
        'Texture prompt must be a non-empty string.',
        'INVALID_INPUT',
      );
    }

    try {
      const response = await this.client.images.generate({
        model: MUSE_IMAGE_MODEL,
        prompt: `Seamless tileable texture for architectural visualization: ${prompt}. The texture must tile perfectly on all edges with no visible seams. Photorealistic, high resolution, even lighting with no harsh shadows.`,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      const imageData = response.data?.[0];

      if (!imageData) {
        throw new MetaAPIError(
          'Muse Image returned no image data.',
          'EMPTY_RESPONSE',
        );
      }

      // Prefer b64_json, fall back to url
      if (imageData.b64_json) {
        return imageData.b64_json;
      }

      if (imageData.url) {
        return imageData.url;
      }

      throw new MetaAPIError(
        'Muse Image response contained neither b64_json nor url.',
        'EMPTY_RESPONSE',
      );
    } catch (error) {
      if (error instanceof MetaAPIError) throw error;

      if (error instanceof OpenAI.APIError) {
        throw new MetaAPIError(
          `Meta Image API error (${error.status}): ${error.message}`,
          'API_ERROR',
          error,
        );
      }

      throw new MetaAPIError(
        `Unexpected error during texture generation: ${error instanceof Error ? error.message : String(error)}`,
        'UNKNOWN_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }
}

// ============================================
// Error class
// ============================================

export type MetaAPIErrorCode =
  | 'EMPTY_RESPONSE'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'INVALID_INPUT'
  | 'UNKNOWN_ERROR';

export class MetaAPIError extends Error {
  public readonly code: MetaAPIErrorCode;
  public readonly cause?: Error;

  constructor(message: string, code: MetaAPIErrorCode, cause?: Error) {
    super(message);
    this.name = 'MetaAPIError';
    this.code = code;
    this.cause = cause;
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MetaAPIError);
    }
  }
}

// ============================================
// Helpers
// ============================================

/**
 * Strips markdown code fences or extracts the JSON object from model output.
 * Extremely defensive against any prose, prefixes, or suffixes returned by LLMs.
 */
function stripMarkdownCodeFences(text: string): string {
  let cleaned = text.trim();

  // 1. Try finding fenced code block: ```json ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 2. If there are still surrounding characters, extract outermost JSON object { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

/**
 * Validates and self-heals a parsed HouseAnalysis object.
 * Ensures the 3D geometry engine will never crash on minor model inconsistencies.
 */
function validateHouseAnalysis(analysis: HouseAnalysis): void {
  // Self-heal top-level defaults
  if (!analysis.id) {
    analysis.id = `house-${Date.now()}`;
  }

  if (!analysis.notes) {
    analysis.notes = [];
  }

  if (!analysis.walls || !Array.isArray(analysis.walls) || analysis.walls.length === 0) {
    throw new MetaAPIError('HouseAnalysis failed: Model detected no walls in the floor plan.', 'VALIDATION_ERROR');
  }

  // Ensure metadata exists and is populated
  if (!analysis.metadata || typeof analysis.metadata !== 'object') {
    analysis.metadata = {
      style: 'Contemporary Residential',
      floors: 1,
      totalArea: 100,
      overallWidth: 10,
      overallDepth: 10,
      wallHeight: 2.7,
      scale: 50,
    };
  }

  // Calculate bounding box if dimensions are missing or 0
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const wall of analysis.walls) {
    if (wall.start && wall.end) {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      minY = Math.min(minY, wall.start.y, wall.end.y);
      maxY = Math.max(maxY, wall.start.y, wall.end.y);
    }
  }

  const computedWidth = isFinite(maxX - minX) && maxX > minX ? maxX - minX : 10;
  const computedDepth = isFinite(maxY - minY) && maxY > minY ? maxY - minY : 8;

  if (!analysis.metadata.overallWidth || analysis.metadata.overallWidth <= 0) {
    analysis.metadata.overallWidth = computedWidth;
  }
  if (!analysis.metadata.overallDepth || analysis.metadata.overallDepth <= 0) {
    analysis.metadata.overallDepth = computedDepth;
  }
  if (!analysis.metadata.totalArea || analysis.metadata.totalArea <= 0) {
    analysis.metadata.totalArea = analysis.metadata.overallWidth * analysis.metadata.overallDepth;
  }
  if (!analysis.metadata.wallHeight || analysis.metadata.wallHeight <= 0) {
    analysis.metadata.wallHeight = 2.7;
  }
  if (!analysis.metadata.floors || analysis.metadata.floors < 1) {
    analysis.metadata.floors = 1;
  }

  // Ensure arrays exist
  if (!Array.isArray(analysis.doors)) analysis.doors = [];
  if (!Array.isArray(analysis.windows)) analysis.windows = [];
  if (!Array.isArray(analysis.rooms)) analysis.rooms = [];
  if (!Array.isArray(analysis.furniture)) analysis.furniture = [];
  if (!Array.isArray(analysis.staircases)) analysis.staircases = [];

  // Ensure roof exists with defaults
  if (!analysis.roof || typeof analysis.roof !== 'object') {
    analysis.roof = {
      type: 'gable',
      pitch: 25,
      overhang: 0.5,
      material: 'asphalt_shingle',
      color: '#4A4A4A',
    };
  }

  // Self-heal wall reference cross-linking
  const validWallIds = new Set(analysis.walls.map((w) => w.id));
  const fallbackWallId = analysis.walls[0].id;

  for (const door of analysis.doors) {
    if (!door.wallId || !validWallIds.has(door.wallId)) {
      door.wallId = fallbackWallId;
    }
  }

  for (const win of analysis.windows) {
    if (!win.wallId || !validWallIds.has(win.wallId)) {
      win.wallId = fallbackWallId;
    }
  }

  for (const room of analysis.rooms) {
    if (!Array.isArray(room.wallIds)) {
      room.wallIds = [];
    } else {
      room.wallIds = room.wallIds.filter((wId) => validWallIds.has(wId));
    }
  }

  if (typeof analysis.confidence !== 'number') {
    analysis.confidence = 0.85;
  }
}

// ============================================
// Singleton export
// ============================================

let _clientInstance: MetaAPIClient | null = null;

/**
 * Returns a singleton MetaAPIClient instance.
 * Lazily initialized on first call.
 */
export function getMetaAPIClient(): MetaAPIClient {
  if (!_clientInstance) {
    _clientInstance = new MetaAPIClient();
  }
  return _clientInstance;
}
