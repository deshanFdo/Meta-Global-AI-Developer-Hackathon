#!/usr/bin/env node

/**
 * Meta Muse Spark 1.3 Vision Architecture CLI
 * 
 * Standalone terminal runner for executing Meta's deep reasoning vision model
 * directly on CAD floorplans and architectural drawings.
 * 
 * Usage:
 *   node scripts/meta-muse-cli.mjs [imagePath] [--out output.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Read environment variables from .env.local
function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const apiKey = process.env.META_API_KEY;
const baseURL = process.env.META_API_BASE_URL || 'https://api.meta.ai/v1';

if (!apiKey) {
  console.error('\x1b[31m[Error] META_API_KEY is not defined in .env.local or environment.\x1b[0m');
  process.exit(1);
}

// 2. Parse arguments
const args = process.argv.slice(2);
let imagePath = path.join(rootDir, 'public', 'sample-floorplan.png');
let outPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out' && args[i + 1]) {
    outPath = path.resolve(process.cwd(), args[i + 1]);
    i++;
  } else if (!args[i].startsWith('--')) {
    imagePath = path.resolve(process.cwd(), args[i]);
  }
}

if (!fs.existsSync(imagePath)) {
  console.error(`\x1b[31m[Error] Image file not found: ${imagePath}\x1b[0m`);
  process.exit(1);
}

console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[1m\x1b[34m🏛️  Meta Muse Spark 1.3 Architecture Reconstruction Terminal CLI\x1b[0m');
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log(`📁 Target Blueprint: \x1b[33m${path.basename(imagePath)}\x1b[0m`);
console.log(`🌐 Endpoint:         \x1b[32m${baseURL}\x1b[0m`);
console.log(`🧠 Vision Model:     \x1b[35mmuse-spark-1.3 (Deep Architectural Reasoning)\x1b[0m`);
console.log('');

// 3. Encode image
const imageBuffer = fs.readFileSync(imagePath);
const mimeType = imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
const base64Data = imageBuffer.toString('base64');
const dataUri = `data:${mimeType};base64,${base64Data}`;

console.log(`📦 Payload: ${Math.round(imageBuffer.length / 1024)} KB (${base64Data.length} chars base64)`);
console.log('🚀 Sending inference request to Meta AI API...');
const startTime = Date.now();

const systemPrompt = `You are an expert computational architect and BIM engineer. Analyze this 2D floor plan drawing with extreme mathematical precision.

Extract all walls, doors, windows, rooms, roof parameters, and interior furniture items.
All dimensions must be in METERS.
Ensure furniture facing orientations use standard degrees:
- Sofas: 90 degrees if back is at West and seats face East; 270 degrees if back is at East.
- Beds: 0 degrees if headboard is at North wall extending South; 90 degrees if headboard is at West wall extending East.
- Wardrobes, desks, toilets, vanities: back against wall, opening/front facing into the room.

Output ONLY a single valid JSON object following this schema:
{
  "id": "<string>",
  "metadata": { "style": "<string>", "floors": 1, "totalArea": <number>, "overallWidth": <number>, "overallDepth": <number>, "wallHeight": 2.8, "scale": 50.0 },
  "walls": [ { "id": "wall-<n>", "start": {"x": <num>, "y": <num>}, "end": {"x": <num>, "y": <num>}, "thickness": <num>, "height": 2.8, "material": "stucco|drywall", "color": "<hex>", "isExterior": <bool> } ],
  "doors": [ { "id": "door-<n>", "position": {"x": <num>, "y": <num>}, "width": <num>, "height": 2.1, "wallId": "<id>", "style": "single|french|sliding", "swingDirection": "inward|outward", "material": "wood|glass", "color": "<hex>" } ],
  "windows": [ { "id": "win-<n>", "position": {"x": <num>, "y": <num>}, "width": <num>, "height": <num>, "sillHeight": <num>, "wallId": "<id>", "style": "double-hung|casement", "panes": 2, "material": "vinyl", "color": "<hex>" } ],
  "rooms": [ { "id": "room-<n>", "name": "<string>", "type": "living_room|bedroom|kitchen|bathroom|hallway|patio|utility_room", "vertices": [{"x": <num>, "y": <num>}], "area": <num>, "wallIds": ["<id>"] } ],
  "roof": { "type": "gable", "pitch": 28, "overhang": 0.6, "material": "asphalt_shingle", "color": "#3C4048" },
  "furniture": [ { "id": "f-<n>", "type": "bed_double|sofa|dining_table|kitchen_counter|toilet|bathtub|sink|wardrobe|desk|coffee_table|tv_unit|plant|furnace|washing_machine|column", "position": {"x": <num>, "y": <num>}, "rotation": <num>, "width": <num>, "depth": <num>, "height": <num>, "room": "<string>" } ],
  "confidence": 0.95,
  "notes": ["<string>"]
}`;

async function run() {
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'muse-spark-1.3',
        max_tokens: 16384,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Perform comprehensive architectural BIM analysis on this floor plan image.' },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Meta API HTTP ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\x1b[32m✔ Response received in ${duration}s!\x1b[0m\n`);

    const usage = json.usage || {};
    if (usage.reasoning_tokens) {
      console.log(`🧠 Reasoning Tokens: \x1b[35m${usage.reasoning_tokens}\x1b[0m | Total: ${usage.total_tokens}`);
    }

    const content = json.choices?.[0]?.message?.content || '';
    // Strip markdown code fence if present
    const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const analysis = JSON.parse(cleaned);

    console.log('\x1b[1m\x1b[32m📊 ARCHITECTURAL RECONSTRUCTION AUDIT\x1b[0m');
    console.log('──────────────────────────────────────────────────');
    console.log(`Style:           ${analysis.metadata?.style || 'Modern'}`);
    console.log(`Dimensions:      ${analysis.metadata?.overallWidth}m × ${analysis.metadata?.overallDepth}m`);
    console.log(`Total Area:      ${analysis.metadata?.totalArea} m²`);
    console.log(`Confidence:      ${Math.round((analysis.confidence || 0.9) * 100)}%`);
    console.log(`Walls Detected:  ${analysis.walls?.length || 0}`);
    console.log(`Doors Detected:  ${analysis.doors?.length || 0}`);
    console.log(`Windows:         ${analysis.windows?.length || 0}`);
    console.log(`Furniture Items: ${analysis.furniture?.length || 0}`);
    console.log(`Rooms Mapped:    ${analysis.rooms?.length || 0}`);
    console.log('');

    if (analysis.rooms && analysis.rooms.length > 0) {
      console.log('\x1b[1mInterior Functional Spaces:\x1b[0m');
      for (const r of analysis.rooms) {
        console.log(`  • \x1b[36m${(r.name || r.id).padEnd(25)}\x1b[0m [${r.type.padEnd(12)}]  ${r.area ? `${r.area.toFixed(1)} m²` : ''}`);
      }
      console.log('');
    }

    if (analysis.furniture && analysis.furniture.length > 0) {
      console.log('\x1b[1mIdentified Furniture & Facing Orientations:\x1b[0m');
      for (const f of analysis.furniture.slice(0, 10)) {
        console.log(`  • \x1b[33m${f.type.padEnd(16)}\x1b[0m in ${(f.room || 'Room').padEnd(22)} facing ${f.rotation}° at (${f.position.x.toFixed(1)}, ${f.position.y.toFixed(1)})`);
      }
      if (analysis.furniture.length > 10) {
        console.log(`  ... and ${analysis.furniture.length - 10} more items.`);
      }
      console.log('');
    }

    if (analysis.notes && analysis.notes.length > 0) {
      console.log('\x1b[1mAI Architectural Notes:\x1b[0m');
      for (const n of analysis.notes) {
        console.log(`  💡 ${n}`);
      }
      console.log('');
    }

    if (outPath) {
      fs.writeFileSync(outPath, JSON.stringify(analysis, null, 2));
      console.log(`\x1b[32m✔ Saved analysis JSON to: ${outPath}\x1b[0m`);
    }

  } catch (err) {
    console.error('\x1b[31m[CLI Failure]\x1b[0m', err.message);
    process.exit(1);
  }
}

run();

