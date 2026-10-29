import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator for Architectural Rendering.
 * Creates seamless CanvasTexture instances for flooring, walls, and pavers
 * with zero external asset dependencies.
 */
export class ProceduralTextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Generates a realistic Oak Parquet / Hardwood flooring texture.
   */
  public static getParquetTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const key = 'parquet_oak';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base warm oak tone
    ctx.fillStyle = '#C89D6A';
    ctx.fillRect(0, 0, size, size);

    // Draw horizontal wood planks (8 planks high)
    const plankH = size / 8;
    const plankTones = ['#BE9360', '#CBA372', '#B98B57', '#D1AA7A', '#C39867', '#CA9F6E'];

    for (let i = 0; i < 8; i++) {
      const y = i * plankH;
      // Staggered plank joints
      const xOffset = (i % 2) * (size / 2);
      ctx.fillStyle = plankTones[i % plankTones.length];
      ctx.fillRect(0, y, size, plankH);

      // Fine wood grain lines inside each plank
      ctx.strokeStyle = 'rgba(70, 40, 15, 0.08)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 12; g++) {
        const gy = y + (g / 12) * plankH;
        ctx.beginPath();
        ctx.moveTo(0, gy + Math.sin(g) * 2);
        ctx.bezierCurveTo(size * 0.3, gy + Math.sin(g + 1) * 3, size * 0.7, gy + Math.sin(g - 1) * 2, size, gy);
        ctx.stroke();
      }

      // Vertical plank seam
      ctx.strokeStyle = 'rgba(40, 20, 10, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xOffset, y);
      ctx.lineTo(xOffset, y + plankH);
      ctx.stroke();

      // Horizontal bevel seam between planks
      ctx.strokeStyle = 'rgba(40, 20, 10, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Generates a modern Large-Format Porcelain Tile texture for Bathrooms & Kitchens.
   */
  public static getTileTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const key = 'tile_porcelain';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Crisp off-white / light silver ceramic
    ctx.fillStyle = '#E5E8EB';
    ctx.fillRect(0, 0, size, size);

    // Subtle stone marbling
    ctx.strokeStyle = 'rgba(160, 175, 190, 0.15)';
    ctx.lineWidth = 2;
    for (let m = 0; m < 6; m++) {
      ctx.beginPath();
      ctx.moveTo(m * 80, 0);
      ctx.bezierCurveTo(m * 80 + 50, size * 0.5, m * 80 - 40, size * 0.8, (m + 1) * 80, size);
      ctx.stroke();
    }

    // Grid of 4x4 tiles with 2px grout
    const step = size / 4;
    ctx.strokeStyle = 'rgba(110, 120, 135, 0.4)';
    ctx.lineWidth = 2.5;

    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Generates an outdoor Sandstone / Slate Paver texture for the Covered Terrace.
   */
  public static getTerracePaverTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const key = 'paver_terrace';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Warm grey limestone base
    ctx.fillStyle = '#B4AFA7';
    ctx.fillRect(0, 0, size, size);

    // Stone texture grain
    for (let p = 0; p < 800; p++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const alpha = Math.random() * 0.15;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(60,55,50,${alpha})`;
      ctx.fillRect(px, py, 2, 2);
    }

    // Paver joints (running bond pattern)
    const rowH = size / 4;
    ctx.strokeStyle = 'rgba(50, 45, 40, 0.45)';
    ctx.lineWidth = 3;

    for (let r = 0; r < 4; r++) {
      const y = r * rowH;
      // Horizontal joint
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();

      // Staggered vertical joints
      const colW = size / 3;
      const offset = (r % 2) * (colW / 2);
      for (let c = 0; c <= 4; c++) {
        const x = (c * colW + offset) % size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Generates a fine architectural stucco bump map for walls.
   */
  public static getStuccoBumpTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const key = 'stucco_bump';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#808080'; // neutral bump midpoint
    ctx.fillRect(0, 0, size, size);

    // Stipple noise
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const val = Math.floor(Math.random() * 60 + 100);
      ctx.fillStyle = `rgb(${val},${val},${val})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Generates an Italian Dark Walnut Herringbone parquet texture.
   */
  public static getDarkWalnutTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const key = 'parquet_walnut';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Rich deep espresso walnut base
    ctx.fillStyle = '#3A281A';
    ctx.fillRect(0, 0, size, size);

    const plankH = size / 8;
    const tones = ['#3E2A1C', '#342316', '#432E1F', '#2E1E13'];

    for (let i = 0; i < 8; i++) {
      const y = i * plankH;
      ctx.fillStyle = tones[i % tones.length];
      ctx.fillRect(0, y, size, plankH);

      // Fine walnut grain
      ctx.strokeStyle = 'rgba(20, 12, 6, 0.35)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 14; g++) {
        const gy = y + (g / 14) * plankH;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.4, gy + 3, size * 0.6, gy - 2, size, gy);
        ctx.stroke();
      }

      // Bevel seam
      ctx.strokeStyle = 'rgba(10, 6, 3, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Generates a Polished Carrara White Marble texture with realistic veining.
   */
  public static getCarraraMarbleTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const key = 'marble_carrara';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Clean luminous white-gray marble slab
    ctx.fillStyle = '#F5F6F8';
    ctx.fillRect(0, 0, size, size);

    // Dynamic diagonal smoke veins
    const veins = [
      { start: [0, 80], cp1: [180, 200], cp2: [320, 140], end: [512, 380], width: 3, alpha: 0.16 },
      { start: [100, 0], cp1: [240, 160], cp2: [380, 340], end: [460, 512], width: 2, alpha: 0.12 },
      { start: [0, 360], cp1: [200, 380], cp2: [340, 420], end: [512, 480], width: 2.5, alpha: 0.14 },
    ];

    for (const v of veins) {
      ctx.strokeStyle = `rgba(120, 130, 145, ${v.alpha})`;
      ctx.lineWidth = v.width;
      ctx.beginPath();
      ctx.moveTo(v.start[0], v.start[1]);
      ctx.bezierCurveTo(v.cp1[0], v.cp1[1], v.cp2[0], v.cp2[1], v.end[0], v.end[1]);
      ctx.stroke();
    }

    // High-gloss subtle tile joints (600x600mm format)
    ctx.strokeStyle = 'rgba(180, 185, 195, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Generates a modern Honed Industrial Concrete screed texture.
   */
  public static getConcreteTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const key = 'concrete_screed';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Neutral architectural concrete grey
    ctx.fillStyle = '#9C9FA5';
    ctx.fillRect(0, 0, size, size);

    // Fine mineral speckling and micro-pores
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const dark = Math.random() > 0.5;
      ctx.fillStyle = dark ? 'rgba(40,42,48,0.1)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Subtle trowel marks
    ctx.strokeStyle = 'rgba(70, 75, 85, 0.08)';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.arc(size * 0.3, size * 0.4, 200, 0, Math.PI * 0.6);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Returns texture based on user's selected finish preset.
   */
  public static getTextureByPreset(preset: string): THREE.CanvasTexture | null {
    switch (preset) {
      case 'dark_walnut':
        return this.getDarkWalnutTexture();
      case 'carrara_marble':
        return this.getCarraraMarbleTexture();
      case 'industrial_concrete':
        return this.getConcreteTexture();
      case 'terracotta_stone':
        return this.getTerracePaverTexture();
      case 'scandinavian_oak':
      default:
        return this.getParquetTexture();
    }
  }
}

