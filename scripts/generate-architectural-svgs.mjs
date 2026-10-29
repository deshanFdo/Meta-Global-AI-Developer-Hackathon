import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Urban Loft SVG (10.0m x 7.4m, 74m²)
const urbanLoftSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 740" width="1000" height="740" style="background:#ffffff; font-family:'Segoe UI',system-ui,sans-serif;">
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f0f0f4" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1000" height="740" fill="url(#grid)" />

  <!-- Title & Dimensions Header -->
  <text x="500" y="45" font-size="22" font-weight="bold" text-anchor="middle" fill="#111827">Urban Industrial Loft - 74.0 m²</text>
  <text x="500" y="68" font-size="12" text-anchor="middle" fill="#6b7280">Scale 1:50 | Dimensions in Millimeters (10 000 mm × 7 400 mm)</text>

  <!-- Exterior Walls (Thick black double lines) -->
  <rect x="100" y="90" width="800" height="560" fill="none" stroke="#111827" stroke-width="18" stroke-linejoin="miter" />

  <!-- Interior Partitions -->
  <!-- Bathroom Partition -->
  <line x1="620" y1="90" x2="620" y2="350" stroke="#1f2937" stroke-width="10" />
  <line x1="620" y1="350" x2="900" y2="350" stroke="#1f2937" stroke-width="10" />

  <!-- Bedroom Glass Partition Wall -->
  <line x1="100" y1="390" x2="480" y2="390" stroke="#3b82f6" stroke-width="6" stroke-dasharray="16,6" />

  <!-- Windows (Triple lines) -->
  <!-- South Glass Curtain Wall (Living) -->
  <line x1="200" y1="650" x2="520" y2="650" stroke="#0284c7" stroke-width="6" />
  <line x1="200" y1="644" x2="520" y2="644" stroke="#0284c7" stroke-width="2" />
  <line x1="200" y1="656" x2="520" y2="656" stroke="#0284c7" stroke-width="2" />

  <!-- North Bedroom Window -->
  <line x1="180" y1="90" x2="380" y2="90" stroke="#0284c7" stroke-width="6" />

  <!-- Doors with Swing Arcs -->
  <!-- Entry Door (West Wall) -->
  <line x1="100" y1="480" x2="160" y2="480" stroke="#10b981" stroke-width="4" />
  <path d="M 160 480 A 60 60 0 0 1 100 540" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="4,4" />

  <!-- Bathroom Door -->
  <line x1="620" y1="260" x2="620" y2="320" stroke="#10b981" stroke-width="4" />
  <path d="M 620 260 A 60 60 0 0 0 680 320" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="4,4" />

  <!-- Furniture & Fixtures -->
  <!-- Kitchen Island -->
  <rect x="540" y="440" width="220" height="80" fill="#f3f4f6" stroke="#4b5563" stroke-width="3" rx="4" />
  <circle cx="580" cy="480" r="14" fill="none" stroke="#6b7280" stroke-width="2" />
  <circle cx="630" cy="480" r="14" fill="none" stroke="#6b7280" stroke-width="2" />
  <rect x="680" y="460" width="50" height="40" fill="none" stroke="#6b7280" stroke-width="2" />

  <!-- Living Room Sectional Sofa -->
  <path d="M 240 560 L 420 560 L 420 460" fill="none" stroke="#4b5563" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />

  <!-- King Bed -->
  <rect x="180" y="160" width="160" height="180" fill="#f8fafc" stroke="#334155" stroke-width="3" rx="4" />
  <rect x="200" y="170" width="50" height="30" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" />
  <rect x="270" y="170" width="50" height="30" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" />

  <!-- Bathroom Vanity & Tub -->
  <rect x="740" y="130" width="120" height="60" fill="#e0f2fe" stroke="#0369a1" stroke-width="2" rx="10" />
  <rect x="660" y="130" width="60" height="45" fill="#f1f5f9" stroke="#475569" stroke-width="2" />

  <!-- Room Labels & Metric Areas -->
  <g fill="#1e293b" text-anchor="middle">
    <text x="320" y="490" font-size="18" font-weight="bold">Living &amp; Dining Loft</text>
    <text x="320" y="512" font-size="13" fill="#64748b">A: 38.40 m²</text>

    <text x="260" y="270" font-size="16" font-weight="bold">Primary Bedroom</text>
    <text x="260" y="290" font-size="12" fill="#64748b">A: 22.80 m²</text>

    <text x="760" y="270" font-size="15" font-weight="bold">Luxury Bath</text>
    <text x="760" y="290" font-size="12" fill="#64748b">A: 12.80 m²</text>
  </g>

  <!-- Metric Dimension Chains -->
  <g stroke="#dc2626" stroke-width="1.5" fill="#dc2626" font-size="11" text-anchor="middle">
    <!-- Horizontal Dimension Top -->
    <line x1="100" y1="80" x2="900" y2="80" />
    <line x1="100" y1="73" x2="100" y2="87" />
    <line x1="900" y1="73" x2="900" y2="87" />
    <text x="500" y="76" stroke="none">10 000 mm</text>

    <!-- Vertical Dimension Right -->
    <line x1="915" y1="90" x2="915" y2="650" />
    <line x1="908" y1="90" x2="922" y2="90" />
    <line x1="908" y1="650" x2="922" y2="650" />
    <text x="940" y="375" stroke="none" transform="rotate(90 940 375)">7 400 mm</text>
  </g>
</svg>`;

// 2. Eco Cabin SVG (8.4m x 5.0m, 42m²)
const ecoCabinSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 500" width="840" height="500" style="background:#ffffff; font-family:'Segoe UI',system-ui,sans-serif;">
  <rect width="840" height="500" fill="#fdfbf7" />

  <!-- Title -->
  <text x="420" y="40" font-size="20" font-weight="bold" text-anchor="middle" fill="#14532d">Alpine Eco-Cabin Retreat - 42.0 m²</text>
  <text x="420" y="60" font-size="11" text-anchor="middle" fill="#15803d">Timber Frame Construction | 8 400 mm × 5 000 mm</text>

  <!-- Heavy Timber Exterior Wall -->
  <rect x="80" y="80" width="680" height="340" fill="none" stroke="#166534" stroke-width="16" />

  <!-- Partition Wall -->
  <line x1="480" y1="80" x2="480" y2="280" stroke="#15803d" stroke-width="10" />
  <line x1="480" y1="280" x2="760" y2="280" stroke="#15803d" stroke-width="10" />

  <!-- Hearth / Fireplace Core -->
  <rect x="420" y="160" width="50" height="60" fill="#d97706" stroke="#78350f" stroke-width="3" rx="4" />
  <text x="445" y="195" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="bold">🔥</text>

  <!-- Large Glazing to Panoramic Deck -->
  <line x1="120" y1="420" x2="400" y2="420" stroke="#0284c7" stroke-width="6" />

  <!-- Covered Timber Deck (South) -->
  <rect x="80" y="420" width="680" height="45" fill="none" stroke="#b45309" stroke-width="3" stroke-dasharray="10,5" />
  <text x="420" y="448" font-size="11" fill="#b45309" text-anchor="middle" font-weight="bold">Panoramic Outdoor Deck (18.5 m²)</text>

  <!-- Room Labels -->
  <g fill="#1e293b" text-anchor="middle">
    <text x="260" y="240" font-size="16" font-weight="bold">Vaulted Great Room</text>
    <text x="260" y="260" font-size="12" fill="#64748b">A: 26.50 m²</text>

    <text x="620" y="170" font-size="15" font-weight="bold">Bunk Suite</text>
    <text x="620" y="190" font-size="12" fill="#64748b">A: 10.20 m²</text>

    <text x="620" y="340" font-size="14" font-weight="bold">Bath &amp; Sauna</text>
    <text x="620" y="358" font-size="12" fill="#64748b">A: 5.30 m²</text>
  </g>

  <!-- Dimensions -->
  <g stroke="#dc2626" stroke-width="1.5" fill="#dc2626" font-size="11" text-anchor="middle">
    <line x1="80" y1="485" x2="760" y2="485" />
    <text x="420" y="498" stroke="none">8 400 mm</text>
    <line x1="40" y1="80" x2="40" y2="420" />
    <text x="30" y="250" stroke="none" transform="rotate(-90 30 250)">5 000 mm</text>
  </g>
</svg>`;

// 3. Two-Story Residence SVG (12.0m x 9.0m, 180m²)
const twoStoryResidenceSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900" style="background:#ffffff; font-family:'Segoe UI',system-ui,sans-serif;">
  <defs>
    <pattern id="grid12" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="url(#grid12)" />

  <!-- Title & Header -->
  <text x="600" y="50" font-size="24" font-weight="bold" text-anchor="middle" fill="#0f172a">Modern Two-Story Residence - 180.0 m²</text>
  <text x="600" y="75" font-size="13" text-anchor="middle" fill="#64748b">Level 1 Ground Plan | Metric Dimensions: 12 000 mm × 9 000 mm</text>

  <!-- Exterior Masonry Walls -->
  <rect x="120" y="100" width="960" height="700" fill="none" stroke="#0f172a" stroke-width="20" stroke-linejoin="miter" />

  <!-- Staircase Core to Level 2 -->
  <rect x="520" y="320" width="160" height="240" fill="#f8fafc" stroke="#334155" stroke-width="4" />
  <line x1="520" y1="360" x2="680" y2="360" stroke="#64748b" stroke-width="2" />
  <line x1="520" y1="400" x2="680" y2="400" stroke="#64748b" stroke-width="2" />
  <line x1="520" y1="440" x2="680" y2="440" stroke="#64748b" stroke-width="2" />
  <line x1="520" y1="480" x2="680" y2="480" stroke="#64748b" stroke-width="2" />
  <line x1="520" y1="520" x2="680" y2="520" stroke="#64748b" stroke-width="2" />
  <line x1="600" y1="540" x2="600" y2="340" stroke="#dc2626" stroke-width="3" stroke-dasharray="8,4" />
  <polygon points="600,330 594,345 606,345" fill="#dc2626" />
  <text x="600" y="435" font-size="12" font-weight="bold" fill="#dc2626" text-anchor="middle">UP TO L2</text>

  <!-- Interior Partitions -->
  <!-- Kitchen/Dining to Living -->
  <line x1="120" y1="420" x2="520" y2="420" stroke="#1e293b" stroke-width="12" />
  <!-- Hallway & Powder Room -->
  <line x1="680" y1="420" x2="1080" y2="420" stroke="#1e293b" stroke-width="12" />
  <line x1="880" y1="100" x2="880" y2="420" stroke="#1e293b" stroke-width="10" />

  <!-- Windows (Triple lines) -->
  <!-- North Windows -->
  <line x1="240" y1="100" x2="440" y2="100" stroke="#0284c7" stroke-width="6" />
  <line x1="720" y1="100" x2="840" y2="100" stroke="#0284c7" stroke-width="6" />
  <!-- South Sliding Glass Doors (Terrace) -->
  <line x1="240" y1="800" x2="560" y2="800" stroke="#0284c7" stroke-width="8" />

  <!-- Doors with Arcs -->
  <line x1="120" y1="620" x2="190" y2="620" stroke="#10b981" stroke-width="4" />
  <path d="M 190 620 A 70 70 0 0 1 120 690" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="4,4" />

  <!-- Room Labels -->
  <g fill="#1e293b" text-anchor="middle">
    <text x="320" y="260" font-size="18" font-weight="bold">Kitchen &amp; Dining Atelier</text>
    <text x="320" y="285" font-size="13" fill="#64748b">A: 36.80 m²</text>

    <text x="320" y="620" font-size="20" font-weight="bold">Double-Height Living Salon</text>
    <text x="320" y="645" font-size="14" fill="#64748b">A: 48.20 m² (Open to Above)</text>

    <text x="880" y="620" font-size="18" font-weight="bold">Guest Bedroom Suite</text>
    <text x="880" y="645" font-size="13" fill="#64748b">A: 24.60 m²</text>

    <text x="980" y="260" font-size="16" font-weight="bold">Executive Study</text>
    <text x="980" y="285" font-size="12" fill="#64748b">A: 18.40 m²</text>
  </g>

  <!-- Metric Dimension Chains -->
  <g stroke="#dc2626" stroke-width="1.8" fill="#dc2626" font-size="12" text-anchor="middle">
    <!-- Top Horizontal -->
    <line x1="120" y1="88" x2="1080" y2="88" />
    <line x1="120" y1="80" x2="120" y2="96" />
    <line x1="1080" y1="80" x2="1080" y2="96" />
    <text x="600" y="84" stroke="none">12 000 mm</text>

    <!-- Right Vertical -->
    <line x1="1100" y1="100" x2="1100" y2="800" />
    <line x1="1092" y1="100" x2="1108" y2="100" />
    <line x1="1092" y1="800" x2="1108" y2="800" />
    <text x="1125" y="450" stroke="none" transform="rotate(90 1125 450)">9 000 mm</text>
  </g>
</svg>`;

// Write to both demo-blueprints and public/demo-blueprints
const dirs = [path.join(rootDir, 'demo-blueprints'), path.join(rootDir, 'public', 'demo-blueprints')];

for (const d of dirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'urban-loft-10x7m.svg'), urbanLoftSVG, 'utf8');
  fs.writeFileSync(path.join(d, 'eco-cabin-8x5m.svg'), ecoCabinSVG, 'utf8');
  fs.writeFileSync(path.join(d, 'two-story-residence-12x9m.svg'), twoStoryResidenceSVG, 'utf8');
}

console.log('✅ Generated 3 architectural vector SVG blueprints successfully.');
