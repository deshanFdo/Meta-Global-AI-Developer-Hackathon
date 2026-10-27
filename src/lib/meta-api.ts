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
- If the plan contains dimension lines with numbers, use those directly (they are in meters, centimeters, feet, or inches — convert to meters).
- If no dimensions are given, estimate scale using known references:
  - Standard single door width = 0.90 m
  - Standard toilet depth = 0.70 m
  - Standard bathtub length = 1.50 m
  - Standard single bed width = 0.90 m, double bed width = 1.40 m
  - Standard kitchen counter depth = 0.60 m
- The "scale" field = (1 pixel) / (meters). For example, if a 0.90 m door measures ~45 pixels, scale = 45 / 0.90 = 50 px/m.
- Set overallWidth and overallDepth to the bounding-box dimensions of the entire plan in meters.

## 6. STAIRCASES
- Staircases appear as a series of parallel lines (treads) inside a rectangular outline.
- An arrow on the staircase indicates the direction of ascent ("up") or descent ("down").
- Spiral staircases appear as a circular or pie-shaped element with radiating lines.
- Count the number of visible tread lines to determine "steps".

## 7. ROOF
- Floor plans rarely show the roof directly. Infer from:
  - Dashed lines outside the wall boundary = roof overhang
  - If the plan is labeled "ground floor" or shows stairs going up, the house likely has a gable or hip roof.
  - Default to gable roof, 25° pitch, 0.5 m overhang, asphalt shingle if no evidence.

## 8. METADATA
- "style": Infer from overall layout (e.g., "Ranch", "Colonial", "Modern", "Bungalow", "Split-Level"). Default "Modern" if unclear.
- "floors": Count floor levels. If only one plan with no stairs → 1. If stairs present → likely 2+.
- "wallHeight": Standard residential floor height = 2.70 m unless noted.

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
 * Strips markdown code fences (```json ... ``` or ``` ... ```) from model output.
 * The model is instructed not to wrap output, but we handle it defensively.
 */
function stripMarkdownCodeFences(text: string): string {
  let cleaned = text.trim();

  // Remove ```json ... ``` or ``` ... ```
  const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = cleaned.match(fenceRegex);
  if (match) {
    cleaned = match[1].trim();
  }

  return cleaned;
}

/**
 * Validates that a parsed object has the minimum required fields to be a
 * valid HouseAnalysis. Throws MetaAPIError on validation failure.
 */
function validateHouseAnalysis(analysis: HouseAnalysis): void {
  const errors: string[] = [];

  if (!analysis.id || typeof analysis.id !== 'string') {
    errors.push('Missing or invalid "id" field.');
  }

  if (!analysis.metadata || typeof analysis.metadata !== 'object') {
    errors.push('Missing or invalid "metadata" object.');
  } else {
    if (typeof analysis.metadata.floors !== 'number' || analysis.metadata.floors < 1) {
      errors.push('"metadata.floors" must be a positive integer.');
    }
    if (typeof analysis.metadata.totalArea !== 'number' || analysis.metadata.totalArea <= 0) {
      errors.push('"metadata.totalArea" must be a positive number.');
    }
    if (typeof analysis.metadata.overallWidth !== 'number' || analysis.metadata.overallWidth <= 0) {
      errors.push('"metadata.overallWidth" must be a positive number.');
    }
    if (typeof analysis.metadata.overallDepth !== 'number' || analysis.metadata.overallDepth <= 0) {
      errors.push('"metadata.overallDepth" must be a positive number.');
    }
  }

  if (!Array.isArray(analysis.walls) || analysis.walls.length === 0) {
    errors.push('"walls" must be a non-empty array.');
  }

  if (!Array.isArray(analysis.rooms) || analysis.rooms.length === 0) {
    errors.push('"rooms" must be a non-empty array.');
  }

  if (!Array.isArray(analysis.doors)) {
    errors.push('"doors" must be an array.');
  }

  if (!Array.isArray(analysis.windows)) {
    errors.push('"windows" must be an array.');
  }

  if (!analysis.roof || typeof analysis.roof !== 'object') {
    errors.push('Missing or invalid "roof" object.');
  }

  if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
    errors.push('"confidence" must be a number between 0 and 1.');
  }

  if (errors.length > 0) {
    throw new MetaAPIError(
      `HouseAnalysis validation failed:\n- ${errors.join('\n- ')}`,
      'VALIDATION_ERROR',
    );
  }

  // Cross-reference: every door/window wallId must exist in walls
  const wallIds = new Set(analysis.walls.map((w) => w.id));

  for (const door of analysis.doors) {
    if (!wallIds.has(door.wallId)) {
      errors.push(`Door "${door.id}" references non-existent wall "${door.wallId}".`);
    }
  }

  for (const win of analysis.windows) {
    if (!wallIds.has(win.wallId)) {
      errors.push(`Window "${win.id}" references non-existent wall "${win.wallId}".`);
    }
  }

  for (const room of analysis.rooms) {
    for (const wId of room.wallIds) {
      if (!wallIds.has(wId)) {
        errors.push(`Room "${room.id}" references non-existent wall "${wId}".`);
      }
    }
  }

  if (errors.length > 0) {
    throw new MetaAPIError(
      `HouseAnalysis cross-reference validation failed:\n- ${errors.join('\n- ')}`,
      'VALIDATION_ERROR',
    );
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
