import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

const wonderMessages = [
  {
    role: 'system',
    content: `You are Meta Muse Wonder 1.0, Meta's flagship frontier AI researcher, spatial systems architect, and computational geometry authority.
You are collaborating with Antigravity (Senior Staff AI Architect, Google DeepMind) on the Meta Global AI Developer Hackathon.
Together, you are authoring a groundbreaking academic research treatise and building an enterprise-grade production platform: "BlueprintTo3D".
Provide deep academic rigor, mathematical formulations (LaTeX / KaTeX style), algorithmic pseudocode, comparative benchmarking, and senior staff architectural precision.`
  }
];

async function callWonder(promptText, label) {
  console.log(`\n======================================================`);
  console.log(`💬 >>> ANTIGRAVITY TO MUSE WONDER (${label}):`);
  console.log(`${promptText.substring(0, 200)}...\n`);
  wonderMessages.push({ role: 'user', content: promptText });

  const startTime = Date.now();
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'muse-wonder-1.0',
      messages: wonderMessages,
      max_tokens: 8192,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Error on ${label}:`, errorText);
    throw new Error(`API returned ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const reply = data.choices[0]?.message?.content || '';
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🏛️ <<< MUSE WONDER 1.0 RESPONSE (${label}, ${elapsed}s):\n${reply.substring(0, 320)}...\n`);

  wonderMessages.push({ role: 'assistant', content: reply });
  return reply;
}

async function runSymposium() {
  console.log('🚀 Convening Academic Research & Production Symposium with Meta Muse Wonder 1.0...\n');

  // Turn 1: Academic Research Gap Analysis
  const turn1 = await callWonder(
    `Greetings, Muse Wonder 1.0. We are building BlueprintTo3D for the Meta Global AI Developer Hackathon.
Our user (a Senior Fullstack Engineer & Final Year Academic CS Researcher) has issued a mandate:
1. Conduct an exhaustive Academic Research Gap Analysis: Why do existing 2D-to-3D floorplan pipelines (e.g., FloorNet, Raster-to-Vector, PolyDiff, House-GAN++, CAD-Estate) fail to deliver production BIM and spatial computing digital twins?
2. Formulate our research contribution: Identify the specific theoretical and practical gaps our system solves:
   - The Metric Scale Disconnect (ignoring CAD dimension chains like '14 810 mm' vs visual bounding boxes)
   - The Non-Manifold Topological Collapse (continuous walls swallowing doorways, breaking WebXR locomotion and physics)
   - The "Plastic Toy" Material Deficit (absence of micro-surface PBR normal/roughness manifolds and architectural detailing)
   - Multi-Tier Model Specialization vs Monolithic LLM/VLM Bottlenecks.

Define the formal problem statement, mathematical graph representation G = (V, E, R, P), and objective functions.`,
    'Turn 1: Academic Research Gap Analysis'
  );

  // Turn 2: Algorithmic Blueprint for Architectural Realism & Roof Systems
  const turn2 = await callWonder(
    `Turn 2: Now let's address a direct feedback from our user: "the house feels like a toy currently... and also the roofings are not there as well."
In architectural visualization and computer graphics, what transforms a 3D model from a "plastic toy" into an authentic architectural digital twin?
Specifically provide:
1. Complete Roof System Architecture:
   - Parametric Gable, Hip, and Flat Parapet construction with authentic eaves overhang (0.5m-0.8m), soffits, fascia boards, ridge flashing caps, and gutter drip edges.
   - PBR roof textures (Spanish terracotta barrel tiles and Nordic charcoal slate shingles) with procedural normal displacement.
2. Architectural Detailing (Sub-millimeter cues):
   - Interior baseboard mouldings (10cm skirting boards separating floor from drywall).
   - Door jamb casings and exterior projecting window sills with drip grooves.
   - Concrete foundation plinth (raising walls 0.18m off ground level) and landscaped terrace stone pavers + lawn apron.
3. Lighting & Cook-Torrance BRDF Shading:
   - Soft penumbra shadow cascades (PCF), ambient occlusion ground contact shading, and warm interior photometric point lights.
Provide mathematical geometry formulas and Three.js shader / geometry code snippets.`,
    'Turn 2: Realistic Architecture & Roof Systems'
  );

  // Turn 3: Multi-Model Orchestration Architecture (Wonder + Spark + Image)
  const turn3 = await callWonder(
    `Turn 3: Multi-Model Architecture Integration:
Our API endpoint provides a suite of specialized Meta models:
- 'muse-wonder-1.0' (Frontier reasoning, structural graph solving, academic synthesis)
- 'muse-spark-1.3' (Multimodal spatial vision, millimeter dimension OCR, blueprint vectorization)
- 'muse-image-1.0' (Generative diffusion PBR texture synthesis on /v1/images/generations)

How should we structure a Multi-Agent / Multi-Model Pipeline in our Next.js fullstack backend?
- Stage 1: Muse Spark 1.3 extracts the raw coordinate graph and dimension strings from 2D raster/SVG.
- Stage 2: Muse Wonder 1.0 validates topological closure, enforces dimension constraints (Least-Squares projection), verifies room polygon areas, and computes RSMeans quantity takeoffs.
- Stage 3: Muse Image 1.0 generates bespoke, seamless PBR texture maps for roof tiles and stone masonry.
Provide the pipeline architecture diagram, API routing pattern, and error recovery protocols.`,
    'Turn 3: Multi-Model Orchestration Architecture'
  );

  // Turn 4: Academic Paper Draft & Production Sign-Off
  const turn4 = await callWonder(
    `Turn 4: Comprehensive Academic Paper & Production Synthesis:
Please synthesize our findings into an academic paper format suitable for submission to computer vision / spatial computing conferences (e.g. ACM SIGGRAPH, IEEE VR, CVPR):
- Title
- Abstract
- 1. Introduction & Research Gaps
- 2. System Architecture & Multi-Model Orchestration
- 3. Mathematical Formulation (Graph Topology, Constraint-Preserving Rectification, Closed Pier Manifolds)
- 4. Photorealistic Shading & Procedural Roof Generation
- 5. Comparative Benchmark Matrix (BlueprintTo3D vs SOTA: FloorNet, PolyDiff, House-GAN, Manual CAD)
- 6. Conclusion & Future Outlook

Provide the complete, publication-tier treatise with LaTeX/KaTeX formulas.`,
    'Turn 4: Academic Paper & Synthesis'
  );

  // Write full transcript
  const transcript = `# Academic Research Symposium & Multi-Model Architecture Synthesis
**Date:** ${new Date().toISOString()}
**Participating Principal Architects:** Antigravity Senior Staff Architect (Google DeepMind) & Meta Muse Wonder 1.0 (Meta AI)
**Models Deployed:** \`muse-wonder-1.0\` (Reasoning & Research), \`muse-spark-1.3\` (Vision Extraction), \`muse-image-1.0\` (Generative PBR)

---

## Turn 1: Academic Research Gap Analysis & Formal Mathematical Problem Statement
### Antigravity Prompt:
${wonderMessages[1].content}

### Meta Muse Wonder 1.0 Treatise:
${turn1}

---

## Turn 2: Algorithmic Blueprint for Architectural Realism & Parametric Roof Systems
### Antigravity Prompt:
${wonderMessages[3].content}

### Meta Muse Wonder 1.0 Architecture:
${turn2}

---

## Turn 3: Multi-Model Orchestration Architecture (Wonder + Spark + Image)
### Antigravity Prompt:
${wonderMessages[5].content}

### Meta Muse Wonder 1.0 Orchestration Design:
${turn3}

---

## Turn 4: Academic Research Paper & Publication-Tier Treatise
### Antigravity Prompt:
${wonderMessages[7].content}

### Meta Muse Wonder 1.0 Academic Paper:
${turn4}

---
*Generated collaboratively via Meta AI API for the Meta Global AI Developer Hackathon.*
`;

  const outputPath = path.join(rootDir, 'muse-wonder-research-dialogue.md');
  fs.writeFileSync(outputPath, transcript, 'utf8');
  console.log(`\n🎉 Full Academic Research Symposium saved to: ${outputPath}`);
}

runSymposium().catch((err) => {
  console.error('Symposium failed:', err);
  process.exit(1);
});

