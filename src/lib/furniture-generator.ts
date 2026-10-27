import * as THREE from 'three';
import type { FurnitureItem, FurnitureType } from '@/types';

// ============================================
// Furniture Material Palette
// ============================================

const WOOD_OAK = new THREE.MeshStandardMaterial({
  color: 0x8b5a2b,
  roughness: 0.55,
  metalness: 0.05,
});

const WOOD_DARK = new THREE.MeshStandardMaterial({
  color: 0x4a3728,
  roughness: 0.5,
  metalness: 0.05,
});

const FABRIC_LIGHT = new THREE.MeshStandardMaterial({
  color: 0xf0ede6,
  roughness: 0.85,
  metalness: 0.0,
});

const FABRIC_CHARCOAL = new THREE.MeshStandardMaterial({
  color: 0x3d414a,
  roughness: 0.8,
  metalness: 0.0,
});

const FABRIC_PILLOW = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.7,
  metalness: 0.0,
});

const CERAMIC_WHITE = new THREE.MeshStandardMaterial({
  color: 0xfcfcfc,
  roughness: 0.15,
  metalness: 0.05,
});

const CHROME_METAL = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.1,
  metalness: 0.9,
});

const COOKTOP_GLASS = new THREE.MeshStandardMaterial({
  color: 0x111115,
  roughness: 0.05,
  metalness: 0.8,
});

const COUNTERTOP_QUARTZ = new THREE.MeshStandardMaterial({
  color: 0xdedede,
  roughness: 0.25,
  metalness: 0.05,
});

const LEAF_GREEN = new THREE.MeshStandardMaterial({
  color: 0x2e6f40,
  roughness: 0.7,
  metalness: 0.0,
});

// ============================================
// Procedural Furniture Generator
// ============================================

export class FurnitureGenerator {
  private centerOffsetX: number;
  private centerOffsetZ: number;

  constructor(centerOffsetX = 0, centerOffsetZ = 0) {
    this.centerOffsetX = centerOffsetX;
    this.centerOffsetZ = centerOffsetZ;
  }

  public setOffsets(offsetX: number, offsetZ: number) {
    this.centerOffsetX = offsetX;
    this.centerOffsetZ = offsetZ;
  }

  /**
   * Generates a realistic 3D group for a single furniture item.
   */
  public generateItem(item: FurnitureItem): THREE.Group {
    const group = new THREE.Group();
    group.name = `furniture_${item.type}_${item.id}`;

    switch (item.type) {
      case 'bed_double':
        this.buildDoubleBed(group, item);
        break;
      case 'bed_single':
        this.buildSingleBed(group, item);
        break;
      case 'sofa':
        this.buildSofa(group, item);
        break;
      case 'dining_table':
        this.buildDiningSet(group, item);
        break;
      case 'chair':
        this.buildChair(group, item);
        break;
      case 'kitchen_counter':
        this.buildKitchenCounter(group, item);
        break;
      case 'toilet':
        this.buildToilet(group, item);
        break;
      case 'bathtub':
        this.buildBathtub(group, item);
        break;
      case 'sink':
        this.buildVanitySink(group, item);
        break;
      case 'wardrobe':
        this.buildWardrobe(group, item);
        break;
      case 'desk':
        this.buildDesk(group, item);
        break;
      case 'coffee_table':
        this.buildCoffeeTable(group, item);
        break;
      case 'plant':
        this.buildPlant(group, item);
        break;
      case 'furnace':
        this.buildFurnace(group, item);
        break;
      default:
        this.buildGenericCabinet(group, item);
        break;
    }

    // Set position and rotation in world coordinates
    const posX = item.position.x - this.centerOffsetX;
    const posZ = item.position.y - this.centerOffsetZ; // 2D Y maps to 3D Z
    group.position.set(posX, 0, posZ);

    if (item.rotation) {
      group.rotation.y = (item.rotation * Math.PI) / 180;
    }

    // Enable cast and receive shadows for all furniture components
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  // ----------------------------------------------------
  // Double Bed (Master / Bedroom)
  // ----------------------------------------------------
  private buildDoubleBed(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 1.8;
    const d = item.depth || 2.1;
    const h = 0.55;

    // 1. Bed Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), WOOD_OAK);
    frame.position.y = 0.125;
    group.add(frame);

    // 2. Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 1.1, 0.1), WOOD_DARK);
    headboard.position.set(0, 0.55, -d / 2 + 0.05);
    group.add(headboard);

    // 3. Mattress
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.24, d - 0.12), FABRIC_LIGHT);
    mattress.position.set(0, 0.37, 0.02);
    group.add(mattress);

    // 4. Pillows (Two side-by-side)
    const pillowW = (w - 0.25) / 2;
    const pillowGeom = new THREE.BoxGeometry(pillowW, 0.12, 0.4);

    const pillowLeft = new THREE.Mesh(pillowGeom, FABRIC_PILLOW);
    pillowLeft.position.set(-pillowW / 2 - 0.03, 0.52, -d / 2 + 0.35);
    pillowLeft.rotation.x = 0.15; // slight comfortable incline
    group.add(pillowLeft);

    const pillowRight = new THREE.Mesh(pillowGeom, FABRIC_PILLOW);
    pillowRight.position.set(pillowW / 2 + 0.03, 0.52, -d / 2 + 0.35);
    pillowRight.rotation.x = 0.15;
    group.add(pillowRight);

    // 5. Folded Duvet / Blanket on lower bed
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.08, d * 0.55), FABRIC_CHARCOAL);
    duvet.position.set(0, 0.48, d * 0.2);
    group.add(duvet);

    // 6. Flanking Nightstands
    const standGeom = new THREE.BoxGeometry(0.45, 0.42, 0.4);
    const leftStand = new THREE.Mesh(standGeom, WOOD_OAK);
    leftStand.position.set(-w / 2 - 0.26, 0.21, -d / 2 + 0.3);
    group.add(leftStand);

    const rightStand = new THREE.Mesh(standGeom, WOOD_OAK);
    rightStand.position.set(w / 2 + 0.26, 0.21, -d / 2 + 0.3);
    group.add(rightStand);
  }

  // ----------------------------------------------------
  // Single Bed (Guest / Study)
  // ----------------------------------------------------
  private buildSingleBed(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 1.0;
    const d = item.depth || 2.0;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), WOOD_OAK);
    frame.position.y = 0.125;
    group.add(frame);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 1.0, 0.08), WOOD_DARK);
    headboard.position.set(0, 0.5, -d / 2 + 0.04);
    group.add(headboard);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.22, d - 0.1), FABRIC_LIGHT);
    mattress.position.set(0, 0.36, 0.02);
    group.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.12, 0.38), FABRIC_PILLOW);
    pillow.position.set(0, 0.5, -d / 2 + 0.32);
    pillow.rotation.x = 0.15;
    group.add(pillow);

    const duvet = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.07, d * 0.55), FABRIC_CHARCOAL);
    duvet.position.set(0, 0.47, d * 0.2);
    group.add(duvet);
  }

  // ----------------------------------------------------
  // Sofa (Living Room Lounge)
  // ----------------------------------------------------
  private buildSofa(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 2.4;
    const d = item.depth || 1.0;
    const h = 0.85;

    // 1. Base seating platform
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), FABRIC_CHARCOAL);
    base.position.y = 0.2;
    group.add(base);

    // 2. Thick Seat Cushions
    const seat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.18, d - 0.2), FABRIC_LIGHT);
    seat.position.set(0, 0.4, 0.05);
    group.add(seat);

    // 3. Backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.22), FABRIC_CHARCOAL);
    backrest.position.set(0, 0.6, -d / 2 + 0.11);
    group.add(backrest);

    // 4. Armrests
    const armGeom = new THREE.BoxGeometry(0.18, 0.45, d);
    const leftArm = new THREE.Mesh(armGeom, FABRIC_CHARCOAL);
    leftArm.position.set(-w / 2 + 0.09, 0.45, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, FABRIC_CHARCOAL);
    rightArm.position.set(w / 2 - 0.09, 0.45, 0);
    group.add(rightArm);
  }

  // ----------------------------------------------------
  // Dining Set (6-person Dining Table + Chairs)
  // ----------------------------------------------------
  private buildDiningSet(group: THREE.Group, item: FurnitureItem): void {
    const tableW = item.width || 1.8;
    const tableD = item.depth || 0.95;
    const tableH = 0.76;

    // Tabletop
    const tabletop = new THREE.Mesh(new THREE.BoxGeometry(tableW, 0.05, tableD), WOOD_OAK);
    tabletop.position.y = tableH - 0.025;
    group.add(tabletop);

    // 4 Table Legs
    const legGeom = new THREE.CylinderGeometry(0.03, 0.025, tableH - 0.05, 8);
    const legPositions = [
      [-tableW / 2 + 0.08, -tableD / 2 + 0.08],
      [tableW / 2 - 0.08, -tableD / 2 + 0.08],
      [-tableW / 2 + 0.08, tableD / 2 - 0.08],
      [tableW / 2 - 0.08, tableD / 2 - 0.08],
    ];

    for (const [lx, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeom, WOOD_DARK);
      leg.position.set(lx, (tableH - 0.05) / 2, lz);
      group.add(leg);
    }

    // 6 Chairs (3 on top side, 3 on bottom side)
    const chairSpacing = (tableW - 0.3) / 2;
    for (let i = -1; i <= 1; i++) {
      // Top side chair (facing +Z)
      const chair1 = this.createChairMesh();
      chair1.position.set(i * chairSpacing, 0, -tableD / 2 - 0.35);
      chair1.rotation.y = 0;
      group.add(chair1);

      // Bottom side chair (facing -Z)
      const chair2 = this.createChairMesh();
      chair2.position.set(i * chairSpacing, 0, tableD / 2 + 0.35);
      chair2.rotation.y = Math.PI;
      group.add(chair2);
    }
  }

  // Helper: Single Chair
  private createChairMesh(): THREE.Group {
    const chair = new THREE.Group();
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), FABRIC_CHARCOAL);
    seat.position.y = 0.44;
    chair.add(seat);

    // Legs
    const legGeom = new THREE.CylinderGeometry(0.015, 0.012, 0.44, 6);
    const legOffsets = [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]];
    for (const [cx, cz] of legOffsets) {
      const leg = new THREE.Mesh(legGeom, WOOD_DARK);
      leg.position.set(cx, 0.22, cz);
      chair.add(leg);
    }

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.03), WOOD_OAK);
    back.position.set(0, 0.65, -0.19);
    chair.add(back);

    return chair;
  }

  private buildChair(group: THREE.Group, _item: FurnitureItem): void {
    group.add(this.createChairMesh());
  }

  // ----------------------------------------------------
  // Kitchen Counter & Cooktop
  // ----------------------------------------------------
  private buildKitchenCounter(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 3.0;
    const d = item.depth || 0.65;
    const h = 0.9;

    // 1. Base Cabinets
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.05, d), WOOD_DARK);
    base.position.y = (h - 0.05) / 2;
    group.add(base);

    // 2. Quartz Countertop
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.05, d + 0.04), COUNTERTOP_QUARTZ);
    top.position.y = h - 0.025;
    group.add(top);

    // 3. Induction 4-burner cooktop
    const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.01, 0.5), COOKTOP_GLASS);
    cooktop.position.set(-w / 4, h + 0.005, 0);
    group.add(cooktop);

    // 4. Stainless steel sink basin & faucet
    const sink = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.02, 0.45), CHROME_METAL);
    sink.position.set(w / 4, h + 0.01, 0);
    group.add(sink);

    const faucetGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
    const faucet = new THREE.Mesh(faucetGeom, CHROME_METAL);
    faucet.position.set(w / 4, h + 0.18, -0.18);
    group.add(faucet);
  }

  // ----------------------------------------------------
  // Bathroom Fixtures: Toilet, Bathtub, Vanity
  // ----------------------------------------------------
  private buildToilet(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 0.45;
    const d = item.depth || 0.7;

    // Pedestal
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.4, d * 0.7), CERAMIC_WHITE);
    base.position.set(0, 0.2, 0.05);
    group.add(base);

    // Oval Bowl
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.35, 0.18, 16), CERAMIC_WHITE);
    bowl.position.set(0, 0.38, 0.12);
    group.add(bowl);

    // Tank / Cistern
    const tank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.22), CERAMIC_WHITE);
    tank.position.set(0, 0.55, -d / 2 + 0.11);
    group.add(tank);

    // Flush button
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 12), CHROME_METAL);
    btn.position.set(0, 0.805, -d / 2 + 0.11);
    group.add(btn);
  }

  private buildBathtub(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 1.7;
    const d = item.depth || 0.75;
    const h = 0.58;

    const tubOuter = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), CERAMIC_WHITE);
    tubOuter.position.y = h / 2;
    group.add(tubOuter);

    // Tub inner rim
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.02, d - 0.12), CERAMIC_WHITE);
    rim.position.y = h + 0.01;
    group.add(rim);

    // Chrome faucet
    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), CHROME_METAL);
    faucet.position.set(-w / 2 + 0.15, h + 0.1, 0);
    group.add(faucet);
  }

  private buildVanitySink(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 0.8;
    const d = item.depth || 0.5;
    const h = 0.85;

    // Cabinet
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.05, d), WOOD_OAK);
    cabinet.position.y = (h - 0.05) / 2;
    group.add(cabinet);

    // Basin
    const basin = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.12, d - 0.08), CERAMIC_WHITE);
    basin.position.y = h + 0.06;
    group.add(basin);

    // Faucet
    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), CHROME_METAL);
    faucet.position.set(0, h + 0.2, -d / 2 + 0.1);
    group.add(faucet);
  }

  // ----------------------------------------------------
  // Wardrobe / Closet
  // ----------------------------------------------------
  private buildWardrobe(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 1.8;
    const d = item.depth || 0.6;
    const h = item.height || 2.3;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), WOOD_DARK);
    body.position.y = h / 2;
    group.add(body);

    // Vertical seam divider
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.01, h - 0.1, 0.01), WOOD_OAK);
    seam.position.set(0, h / 2, d / 2 + 0.005);
    group.add(seam);

    // Handles
    const handleGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.25, 8);
    const leftHandle = new THREE.Mesh(handleGeom, CHROME_METAL);
    leftHandle.position.set(-0.06, 1.1, d / 2 + 0.02);
    group.add(leftHandle);

    const rightHandle = new THREE.Mesh(handleGeom, CHROME_METAL);
    rightHandle.position.set(0.06, 1.1, d / 2 + 0.02);
    group.add(rightHandle);
  }

  // ----------------------------------------------------
  // Study / Work Desk
  // ----------------------------------------------------
  private buildDesk(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 1.4;
    const d = item.depth || 0.7;
    const h = 0.75;

    // Desktop
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), WOOD_OAK);
    top.position.y = h;
    group.add(top);

    // Legs / Pedestal
    const legGeom = new THREE.CylinderGeometry(0.025, 0.025, h, 8);
    const leftFront = new THREE.Mesh(legGeom, CHROME_METAL);
    leftFront.position.set(-w / 2 + 0.06, h / 2, -d / 2 + 0.06);
    group.add(leftFront);

    const leftBack = new THREE.Mesh(legGeom, CHROME_METAL);
    leftBack.position.set(-w / 2 + 0.06, h / 2, d / 2 - 0.06);
    group.add(leftBack);

    // Side Drawer Block
    const drawerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.4, h - 0.06, d - 0.1), WOOD_DARK);
    drawerBlock.position.set(w / 2 - 0.24, (h - 0.06) / 2, 0);
    group.add(drawerBlock);

    // Matching Office Chair
    const chair = this.createChairMesh();
    chair.position.set(-0.1, 0, d / 2 + 0.35);
    chair.rotation.y = Math.PI;
    group.add(chair);
  }

  // ----------------------------------------------------
  // Coffee Table & Misc
  // ----------------------------------------------------
  private buildCoffeeTable(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 1.1;
    const d = item.depth || 0.6;
    const h = 0.42;

    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), WOOD_OAK);
    top.position.y = h;
    group.add(top);

    const legGeom = new THREE.CylinderGeometry(0.02, 0.015, h, 8);
    for (const [lx, lz] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) {
      const leg = new THREE.Mesh(legGeom, WOOD_DARK);
      leg.position.set(lx, h / 2, lz);
      group.add(leg);
    }
  }

  private buildPlant(group: THREE.Group, _item: FurnitureItem): void {
    // Ceramic Pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.45, 16), CERAMIC_WHITE);
    pot.position.y = 0.225;
    group.add(pot);

    // Green Foliage Spheres
    const plantSphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), LEAF_GREEN);
    plantSphere1.position.set(0, 0.65, 0);
    group.add(plantSphere1);

    const plantSphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), LEAF_GREEN);
    plantSphere2.position.set(0.12, 0.8, -0.05);
    group.add(plantSphere2);
  }

  private buildFurnace(group: THREE.Group, _item: FurnitureItem): void {
    // Water heater boiler cylinder
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.8, 16), CHROME_METAL);
    boiler.position.y = 0.9;
    group.add(boiler);

    // HVAC control box
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.5), WOOD_DARK);
    hvac.position.set(0.55, 0.6, 0);
    group.add(hvac);
  }

  private buildGenericCabinet(group: THREE.Group, item: FurnitureItem): void {
    const w = item.width || 0.8;
    const d = item.depth || 0.4;
    const h = item.height || 0.9;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), WOOD_OAK);
    cab.position.y = h / 2;
    group.add(cab);
  }
}

