import * as THREE from 'three';

// Procedural Canvas Texture Generator for PBR Materials (Quest & Mobile WebXR Safe, 0 External Assets)
const textureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreateCanvasTexture(key: string, drawFn: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 1): THREE.CanvasTexture {
  const cacheKey = `${key}_${repeat}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    // SSR guard
    return new THREE.CanvasTexture({} as unknown as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawFn(ctx, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  textureCache.set(cacheKey, texture);
  return texture;
}

// Procedural texture drawing routines
function drawOakParquet(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#C8A882';
  ctx.fillRect(0, 0, s, s);
  const planks = 8;
  const ph = s / planks;
  for (let i = 0; i < planks; i++) {
    const tone = 58 + ((i * 17) % 14);
    ctx.fillStyle = `hsl(34, 38%, ${tone}%)`;
    ctx.fillRect(0, i * ph, s, ph - 2);
  }
  ctx.strokeStyle = 'rgba(80, 50, 25, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= planks; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * ph);
    ctx.lineTo(s, i * ph);
    ctx.stroke();
  }
}

function drawWalnutHerringbone(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#382618';
  ctx.fillRect(0, 0, s, s);
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(Math.PI / 4);
  const pw = 28;
  const pl = 110;
  for (let x = -s; x < s; x += pw) {
    for (let y = -s; y < s; y += pl) {
      const tone = 16 + ((Math.abs(x + y) * 7) % 8);
      ctx.fillStyle = `hsl(25, 30%, ${tone}%)`;
      ctx.fillRect(x, y, pw - 2, pl - 2);
    }
  }
  ctx.restore();
}

function drawCarraraMarble(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#F4F4F2';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(140, 142, 148, 0.45)';
  const veins = 12;
  for (let i = 0; i < veins; i++) {
    ctx.beginPath();
    let x = (i * 47) % s;
    let y = (i * 73) % s;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 60, y - 40, x - 50, y + 60, x + 90, y + 90);
    ctx.lineWidth = 0.8 + ((i % 3) * 0.6);
    ctx.stroke();
  }
}

function drawPolishedConcrete(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#BCBCBA';
  ctx.fillRect(0, 0, s, s);
  const imgData = ctx.getImageData(0, 0, s, s);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = ((i * 13) % 21) - 10;
    d[i] = Math.min(255, Math.max(0, d[i] + noise));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
}

function drawTerracottaTile(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#C26A4A';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#8E4528';
  ctx.lineWidth = 5;
  const tiles = 4;
  const ts = s / tiles;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * ts, 0);
    ctx.lineTo(i * ts, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * ts);
    ctx.lineTo(s, i * ts);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Finish Catalog Types & Definitions
// ---------------------------------------------------------------------------

export type WallFinishKey = 'warm-alabaster' | 'sage-green' | 'deep-charcoal' | 'nordic-birch';
export type FloorFinishKey = 'oak-parquet' | 'walnut-herringbone' | 'carrara-marble' | 'polished-concrete' | 'terracotta';
export type TrimFinishKey = 'matte-black' | 'brushed-brass' | 'white-oak' | 'aluminum';

export interface FinishOption {
  id: string;
  name: string;
  category: 'wall' | 'floor' | 'trim';
  colorHex: string;
  roughness: number;
  metalness: number;
  unitCostUSD: number; // cost per m² or linear meter
  description: string;
}

export const WALL_FINISHES: Record<WallFinishKey, FinishOption> = {
  'warm-alabaster': { id: 'warm-alabaster', name: 'Warm Alabaster', category: 'wall', colorHex: '#EDE6D6', roughness: 0.94, metalness: 0, unitCostUSD: 18, description: 'Classic neutral matte architectural eggshell finish' },
  'sage-green': { id: 'sage-green', name: 'Nordic Sage', category: 'wall', colorHex: '#9CAF88', roughness: 0.92, metalness: 0, unitCostUSD: 24, description: 'Calming biophilic mineral green pigment' },
  'deep-charcoal': { id: 'deep-charcoal', name: 'Deep Charcoal', category: 'wall', colorHex: '#2B2E33', roughness: 0.88, metalness: 0.05, unitCostUSD: 28, description: 'High-contrast moody modern feature wall' },
  'nordic-birch': { id: 'nordic-birch', name: 'Warm Birch', category: 'wall', colorHex: '#D9CFC0', roughness: 0.90, metalness: 0, unitCostUSD: 20, description: 'Light Scandinavian natural clay wash' },
};

export const FLOOR_FINISHES: Record<FloorFinishKey, FinishOption> = {
  'oak-parquet': { id: 'oak-parquet', name: 'Scandinavian Oak', category: 'floor', colorHex: '#C8A882', roughness: 0.55, metalness: 0, unitCostUSD: 75, description: 'Engineered European white oak strip parquet' },
  'walnut-herringbone': { id: 'walnut-herringbone', name: 'Dark Walnut Herringbone', category: 'floor', colorHex: '#382618', roughness: 0.45, metalness: 0, unitCostUSD: 110, description: 'Artisan walnut chevron hardwood' },
  'carrara-marble': { id: 'carrara-marble', name: 'Carrara Marble Tile', category: 'floor', colorHex: '#F4F4F2', roughness: 0.18, metalness: 0.05, unitCostUSD: 145, description: 'Honed Italian marble slabs with subtle grey veining' },
  'polished-concrete': { id: 'polished-concrete', name: 'Polished Concrete', category: 'floor', colorHex: '#BCBCBA', roughness: 0.32, metalness: 0.08, unitCostUSD: 55, description: 'Seamless industrial micro-cement screed' },
  'terracotta': { id: 'terracotta', name: 'Handmade Terracotta', category: 'floor', colorHex: '#C26A4A', roughness: 0.80, metalness: 0, unitCostUSD: 65, description: 'Traditional Mediterranean clay pavers' },
};

export const TRIM_FINISHES: Record<TrimFinishKey, FinishOption> = {
  'matte-black': { id: 'matte-black', name: 'Matte Black', category: 'trim', colorHex: '#111214', roughness: 0.60, metalness: 0.40, unitCostUSD: 35, description: 'Powder-coated architectural hardware and trim' },
  'brushed-brass': { id: 'brushed-brass', name: 'Brushed Brass', category: 'trim', colorHex: '#C9A86A', roughness: 0.35, metalness: 0.95, unitCostUSD: 65, description: 'Satin brushed warm gold brass' },
  'white-oak': { id: 'white-oak', name: 'Natural White Oak', category: 'trim', colorHex: '#D8CAB8', roughness: 0.50, metalness: 0, unitCostUSD: 40, description: 'Solid European oak millwork and door casings' },
  'aluminum': { id: 'aluminum', name: 'Anodized Aluminum', category: 'trim', colorHex: '#C0C5CE', roughness: 0.30, metalness: 0.90, unitCostUSD: 45, description: 'Precision extruded minimalist architectural metal' },
};

/**
 * Returns a Three.js MeshStandardMaterial for a given finish key.
 */
export function getMaterialForFloorFinish(key: FloorFinishKey): THREE.MeshStandardMaterial {
  switch (key) {
    case 'walnut-herringbone':
      return new THREE.MeshStandardMaterial({
        color: FLOOR_FINISHES[key].colorHex,
        map: getOrCreateCanvasTexture('walnut_herringbone', drawWalnutHerringbone, 3),
        roughness: 0.45,
        metalness: 0,
      });
    case 'carrara-marble':
      return new THREE.MeshStandardMaterial({
        color: FLOOR_FINISHES[key].colorHex,
        map: getOrCreateCanvasTexture('carrara_marble', drawCarraraMarble, 2),
        roughness: 0.18,
        metalness: 0.05,
      });
    case 'polished-concrete':
      return new THREE.MeshStandardMaterial({
        color: FLOOR_FINISHES[key].colorHex,
        map: getOrCreateCanvasTexture('polished_concrete', drawPolishedConcrete, 2),
        roughness: 0.32,
        metalness: 0.08,
      });
    case 'terracotta':
      return new THREE.MeshStandardMaterial({
        color: FLOOR_FINISHES[key].colorHex,
        map: getOrCreateCanvasTexture('terracotta', drawTerracottaTile, 4),
        roughness: 0.80,
        metalness: 0,
      });
    case 'oak-parquet':
    default:
      return new THREE.MeshStandardMaterial({
        color: FLOOR_FINISHES['oak-parquet'].colorHex,
        map: getOrCreateCanvasTexture('oak_parquet', drawOakParquet, 3),
        roughness: 0.55,
        metalness: 0,
      });
  }
}

export function getMaterialForWallFinish(key: WallFinishKey): THREE.MeshStandardMaterial {
  const finish = WALL_FINISHES[key] || WALL_FINISHES['warm-alabaster'];
  return new THREE.MeshStandardMaterial({
    color: finish.colorHex,
    roughness: finish.roughness,
    metalness: finish.metalness,
  });
}

export function getMaterialForTrimFinish(key: TrimFinishKey): THREE.MeshStandardMaterial {
  const finish = TRIM_FINISHES[key] || TRIM_FINISHES['matte-black'];
  return new THREE.MeshStandardMaterial({
    color: finish.colorHex,
    roughness: finish.roughness,
    metalness: finish.metalness,
  });
}
