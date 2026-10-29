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

const messages = [
  {
    role: 'system',
    content: `You are Meta Muse Spark 1.3, an expert Principal Spatial Computing & AI Architect working on the Meta Global AI Developer Hackathon.
You specialize in 3D WebXR (Immersive VR, Spatial AR, Meta Quest 3, Apple Vision Pro), Three.js / React Three Fiber, CAD/BIM reconstruction, first-person camera kinematics, physics collision manifolds, and architectural interaction design.
Provide rigorous, production-grade technical guidance with executable code snippets, mathematical formulas, and precise architectural algorithms.`
  }
];

async function sendMessage(userPrompt) {
  console.log(`\n💬 >>> USER TO MUSE:\n${userPrompt.substring(0, 180)}...\n`);
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
  console.log(`🏛️ <<< MUSE SPARK REPLY (${elapsed}s):\n${reply.substring(0, 320)}...\n`);

  messages.push({ role: 'assistant', content: reply });
  return reply;
}

async function runMultiTurnDialogue() {
  console.log('🚀 Initiating Locomotion & Spatial WebXR Multi-Turn Conversation with Meta Muse Spark 1.3...\n');

  // Turn 1: Fixing First-Person Walking Locomotion
  const turn1 = await sendMessage(`We are optimizing the first-person walkthrough navigation in our Three.js React Three Fiber house viewer.
The user noticed: "walking seems bit off so fix that".
Upon deep inspection, we identified three root causes:
1. OrbitControls was remaining enabled while in first-person mode, causing dragging to orbit around an old static target rather than rotating the player's head.
2. In tight hallways (1.0m to 1.2m wide) and door openings (0.85m to 0.9m wide), an overly large player collision margin (0.32m + wall thickness) caused players to get snagged or jitter when sliding along walls.
3. Walls with doors were represented as continuous line segments with an approximate doorway exemption window, which caused false normal pushback near jambs.

As Meta Muse Spark 1.3, what is your recommended production-grade architecture for:
a) Decoupling OrbitControls vs First-Person look cleanly in React Three Fiber.
b) Smooth mouse look with both Pointer Lock (canvas click) and Drag-to-Look, with exponential damping on high-DPI mice.
c) Robust line-segment wall collision with multi-pass sliding (2-3 iterations) and breaking walls into actual solid piers (leaving door openings as empty navigable air).
d) Natural bipedal kinematics: acceleration, friction damping, head-bobbing sine wave with vertical and lateral sway, and footstep sound cadence.`);

  // Turn 2: WebXR VR Locomotion (Teleportation Arc + Snap Turn + Door Interaction)
  const turn2 = await sendMessage(`Turn 2: Now regarding WebXR VR and AR on Meta Quest 2/3/Pro:
In VR walkthroughs:
1. Smooth joystick locomotion can cause vestibular disorientation (motion sickness) for some users unless paired with comfort snap-turning (e.g., 30° or 45° instantaneous yaw rotation on the right thumbstick).
2. Teleportation arcs: How should we implement a parabolic bezier / projectile teleportation ray from the right controller that casts onto the floor plane and highlights a circular landing reticle with orientation indicator?
3. In VR/AR, how should users interact with doors (swinging them open/closed) via the controller raycaster trigger or proximity?
Provide precise Three.js WebXR implementation details.`);

  // Turn 3: Complete Integration & Synthesis
  const turn3 = await sendMessage(`Turn 3: Architectural synthesis:
How should we tie together:
1. Desktop first-person walkthrough (WASD + mouse look + pointer lock + 'E' to toggle nearest door + door walk-through)
2. Desktop orbit / top-down / elevation view with room labels and measurement tool
3. WebXR VR immersive mode with teleport arc and snap turn
4. WebXR AR tabletop (1:20 scale) vs 1:1 real-scale passthrough mode
5. Live BIM finish studio and cost estimator
Provide a crisp architecture summary and best practices checklist.`);

  const logContent = `# Meta Muse Spark 1.3 Locomotion & Spatial WebXR Technical Consultation Transcript
**Date:** ${new Date().toISOString()}
**Participating Agents:** Antigravity Senior Staff Architect & Meta Muse Spark 1.3
**Scope:** First-Person Locomotion Overhaul, Multi-Pass Collision Manifolds, WebXR VR Teleportation Arc, AR Scale Switching, and Interactive Architectural BIM.

---

## Turn 1: First-Person Walking Locomotion Kinematics & Collision Manifolds
### User Prompt:
${messages[1].content}

### Meta Muse Spark 1.3 Architecture Guidance:
${turn1}

---

## Turn 2: WebXR VR Locomotion (Parabolic Teleport Arc, Snap Turning & Spatial Rays)
### User Prompt:
${messages[3].content}

### Meta Muse Spark 1.3 Architecture Guidance:
${turn2}

---

## Turn 3: Unified Cross-Platform Architecture Synthesis
### User Prompt:
${messages[5].content}

### Meta Muse Spark 1.3 Architecture Guidance:
${turn3}
`;

  const outputPath = path.join(rootDir, 'muse-locomotion-transcript.md');
  fs.writeFileSync(outputPath, logContent, 'utf8');
  console.log(`\n✅ Multi-turn conversation saved to ${outputPath}`);
}

runMultiTurnDialogue().catch((err) => {
  console.error('Fatal error during Muse Spark dialogue:', err);
  process.exit(1);
});

