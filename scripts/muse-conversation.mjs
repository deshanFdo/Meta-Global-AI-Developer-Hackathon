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

// Conversation history
const messages = [
  {
    role: 'system',
    content: `You are Meta Muse Spark 1.3, an expert Principal Spatial Computing & AI Architect working on the Meta Global AI Developer Hackathon.
You specialize in 3D WebXR (Immersive VR, Spatial AR, Meta Quest 3, Apple Vision Pro, mobile WebXR), Three.js / React Three Fiber, CAD/BIM reconstruction, PBR lighting, and architectural interaction design.
Provide rigorous, production-grade technical guidance with executable code snippets, architectural formulas, and precise implementation architectures.`
  }
];

async function sendMessage(userPrompt) {
  console.log(`\n💬 >>> USER TO MUSE:\n${userPrompt.substring(0, 160)}...\n`);
  messages.push({ role: 'user', content: userPrompt });

  const startTime = Date.now();
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'muse-spark-1.3',
      messages,
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('API Error:', errorText);
    throw new Error(`API responded with ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const reply = data.choices[0]?.message?.content || '';
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🏛️ <<< MUSE SPARK REPLY (${elapsed}s):\n${reply.substring(0, 300)}...\n`);

  messages.push({ role: 'assistant', content: reply });
  return reply;
}

async function runMultiTurnDialogue() {
  console.log('🚀 Initiating Multi-Turn Conversation with Meta Muse Spark 1.3...\n');

  // Turn 1: WebXR & AR/VR Architecture
  const turn1 = await sendMessage(`We are building BlueprintTo3D for the Meta Global AI Developer Hackathon.
Our user wants AR/VR to be a real, fully functional experience rather than a placeholder.
Specifically:
1. How should we implement WebXR in Three.js for both:
   a) Immersive VR (for Meta Quest 2/3/Pro and PC VR headsets with controllers and teleportation)
   b) Immersive AR (for WebXR AR devices, mobile WebXR, with real-world hit testing, ground placement, and 1:1 vs 1:20 tabletop scale toggle)
2. What is the best pattern to handle cross-device compatibility:
   - Native WebXR when navigator.xr is supported and session is granted
   - WebXR VR button and WebXR AR button in Three.js
   - Fallback to Apple AR Quick Look (.usdz) for iOS and Android Scene Viewer (<model-viewer> or intent URL)
Provide concrete implementation details and Three.js / WebXR code.`);

  // Turn 2: Interactive Interior Finishes & Real-time Material Customizer
  const turn2 = await sendMessage(`Excellent. Now for Turn 2:
In professional architectural BIM software (like Twinmotion, Enscape, or Revit), clients want to customize interior finishes and see instant visual updates and cost estimates.
What architecture should we use to allow the user to:
1. Select any room (e.g. Master Bedroom, Living Room, Bathrooms) and customize:
   - Wall paint color (e.g. Warm Alabaster, Sage Green, Deep Charcoal, Nordic Birch)
   - Flooring material (Scandinavian Oak Parquet, Dark Walnut Herringbone, Carrara Marble Tile, Polished Concrete, Terracotta)
   - Trim & Door finish (Matte Black, Brushed Brass, Natural White Oak, Sleek Aluminum)
2. Calculate an instant Bill of Materials & Cost Estimate ($/m² based on regional construction indices for finishes, drywall, MEP, glazing)
Provide the mathematical cost estimation model and the Three.js material swapping strategy.`);

  // Turn 3: Interactive Doors, Lighting & Immersion
  const turn3 = await sendMessage(`Turn 3:
To make the house feel truly interactive and alive, rather than a static dollhouse:
1. How should we implement interactive doors and windows that swing or slide open/close when clicked in 3D?
2. What architectural lighting setups (e.g. Cinematic Twilight, Crisp Architectural Daylight, Warm Cozy Night with recessed spot cans and under-cabinet LED strips) maximize the visual realism of the PBR procedural materials?
Summarize the complete feature suite and give us the definitive architectural specification for the hackathon.`);

  // Save the full transcript to markdown
  const transcriptPath = path.join(rootDir, 'muse-conversations.md');
  let md = '# Multi-Turn Architectural & Spatial Computing Consultation with Meta Muse Spark 1.3\n\n';
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Model:** \`muse-spark-1.3\`\n\n`;

  for (let i = 1; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'user') {
      md += `## 💬 Question ${Math.ceil(i / 2)}\n\n${m.content}\n\n`;
    } else if (m.role === 'assistant') {
      md += `## 🏛️ Meta Muse Spark Response ${Math.ceil(i / 2)}\n\n${m.content}\n\n---\n\n`;
    }
  }

  fs.writeFileSync(transcriptPath, md, 'utf8');
  console.log(`✅ Multi-turn conversation complete! Saved to ${transcriptPath}`);
}

runMultiTurnDialogue().catch(console.error);

