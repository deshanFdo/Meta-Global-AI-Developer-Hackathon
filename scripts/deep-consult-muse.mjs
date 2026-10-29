import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

const apiKey = process.env.META_API_KEY;
const baseURL = process.env.META_API_BASE_URL || 'https://api.meta.ai/v1';

if (!apiKey) {
  console.error('META_API_KEY is not defined in .env.local');
  process.exit(1);
}

const imagePath = path.join(rootDir, 'public', 'sample-floorplan.png');
const imgBuf = fs.readFileSync(imagePath);
const base64 = imgBuf.toString('base64');

async function consultMuse() {
  console.log('🏛️ Sending Deep Architectural Consultation to Meta Muse Spark 1.3...');
  const startTime = Date.now();

  const prompt = `Perform an exhaustive senior architectural, structural, and computational building science assessment of this residential floor plan (14.81m x 11.30m, 122.42 m2 + 22.53 m2 terrace).
Provide detailed, structured technical analysis covering:
1. STRUCTURAL GRID & LOAD-BEARING ANALYSIS:
   - Analysis of axes 1, 2, 3, 4 and A, B, C, D
   - Load paths from the roof ridge to exterior walls and central corridor bearing spines
   - Shear resistance and open-concept spans across the 6.64m living room / terrace void

2. LIFE SAFETY & IBC/IRC BUILDING CODE COMPLIANCE AUDIT:
   - Egress analysis for all 4 bedrooms (minimum net clear opening, sill height <= 1.1m)
   - Glazing & natural light ratio (glazing area >= 8% of floor area per room)
   - Natural ventilation ratio (openable window area >= 4% of floor area)
   - Corridor clearance and means of egress widths (minimum 0.90m)

3. MEP (MECHANICAL, ELECTRICAL, PLUMBING) & WET-WALL OPTIMIZATION:
   - Analysis of the centralized wet wall grouping between Guest WC, Main WC, and Furnace Room
   - HVAC supply/return duct routing efficiency from the 3.75 m2 furnace hub
   - Kitchen plumbing run distance to the main sanitary stack

4. PASSIVE SOLAR, MICROCLIMATE & DAYLIGHTING PERFORMANCE:
   - South-facing covered terrace solar heat gain coefficient (SHGC) and overhang shading in summer vs winter
   - Cross-ventilation pathways from North windows to South sliding terrace doors
   - Solar exposure evaluation for daylighting

5. ELEVATING TO LOD 300 (LEVEL OF DEVELOPMENT) & INTERACTIVE DIGITAL TWIN:
   - Specific computational geometry requirements (e.g. wall void decomposition, layered drywall/masonry assemblies)
   - Interactive features: First-person navigation with collision, dynamic sun-path heliodon simulation, material swapper, and WebXR spatial preview

Format your response with clear headings, metric equations, and authoritative architectural engineering depth.`;

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'muse-spark-1.3',
        max_tokens: 8192,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a Senior Principal BIM Architect, Licensed Structural Engineer, and Computational Building Scientist. You provide peer-review grade architectural assessments with mathematical precision.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('API Error:', await res.text());
      process.exit(1);
    }

    const data = await res.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✔ Muse Spark 1.3 synthesized architectural analysis in ${duration}s!\n`);

    const result = data.choices[0].message.content;
    const outputPath = path.join(rootDir, 'architectural-muse-analysis.md');
    fs.writeFileSync(outputPath, result, 'utf8');
    console.log(`Saved full synthesis to: ${outputPath}\n`);
    console.log('=== MUSE SPARK 1.3 SYNTHESIS SUMMARY ===');
    console.log(result.slice(0, 1500) + '...\n');
  } catch (err) {
    console.error('Failed to consult Muse:', err);
    process.exit(1);
  }
}

consultMuse();

