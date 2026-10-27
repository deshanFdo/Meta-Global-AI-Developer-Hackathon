import * as THREE from 'three';
import type {
  HouseAnalysis,
  Wall,
  Door,
  Window,
  Room,
  Roof,
  RoomType,
  WallMaterial,
} from '@/types';
import { FurnitureGenerator } from './furniture-generator';

// ============================================
// Material palette keyed by semantic type
// ============================================

const ROOM_FLOOR_COLORS: Record<RoomType, string> = {
  living_room: '#c4a882',
  bedroom: '#d4b896',
  kitchen: '#e8dcc8',
  bathroom: '#d6e5e3',
  dining_room: '#c9b99a',
  garage: '#a0a0a0',
  hallway: '#d1c4b0',
  closet: '#c8bfb0',
  laundry: '#b8c4c8',
  office: '#bfae94',
  basement: '#989898',
  attic: '#c8b898',
  porch: '#a89880',
  balcony: '#b0a088',
  utility_room: '#b8c4c8',
  patio: '#a89880',
  unknown: '#c0b8a8',
};

const WALL_MATERIAL_COLORS: Record<WallMaterial, string> = {
  brick: '#b85c38',
  concrete: '#c8c8c8',
  drywall: '#f5f0e8',
  wood: '#a0784c',
  stone: '#a0a098',
  glass: '#c8e8f8',
  stucco: '#e8e0d0',
  vinyl_siding: '#d8d0c0',
};

const ROOF_COLORS: Record<string, string> = {
  asphalt_shingle: '#505050',
  tile: '#b84828',
  metal: '#888888',
  slate: '#606068',
  wood_shake: '#8b7355',
};

// ============================================
// Geometry Engine
// ============================================

/**
 * Procedural 3D geometry generator.
 *
 * Coordinate system:
 *   X = width (left-right)
 *   Y = height (up)
 *   Z = depth (front-back)
 *
 * Floor plan 2D coordinates map as: Point2D.x → X, Point2D.y → Z.
 */
export class GeometryEngine {
  // ---------- cached state for door/window subtraction ----------
  private wallMeshes: Map<string, THREE.Mesh> = new Map();
  private centerOffsetX = 0;
  private centerOffsetZ = 0;

  // ==================================================
  // Public entry point
  // ==================================================

  /** Orchestrates full house geometry generation. */
  generateHouseGeometry(
    analysis: HouseAnalysis,
    options?: { showRoof?: boolean; showFurniture?: boolean },
  ): THREE.Group {
    const house = new THREE.Group();
    house.name = 'House';

    // Compute centering offset so the house sits at origin
    this.centerOffsetX = analysis.metadata.overallWidth / 2;
    this.centerOffsetZ = analysis.metadata.overallDepth / 2;

    // Reset caches
    this.wallMeshes.clear();

    // --- Layers ---
    const wallGroup = this.generateWalls(
      analysis.walls,
      analysis.metadata.wallHeight,
    );
    house.add(wallGroup);

    // Doors & windows mutate the wall group in-place
    this.generateDoorOpenings(analysis.doors, analysis.walls);
    this.generateWindowOpenings(analysis.windows, analysis.walls);

    const floorGroup = this.generateFloor(analysis.rooms);
    house.add(floorGroup);

    // Furniture generation (when furniture items exist and not disabled)
    if (analysis.furniture && analysis.furniture.length > 0 && options?.showFurniture !== false) {
      const furnGen = new FurnitureGenerator(this.centerOffsetX, this.centerOffsetZ);
      const furnGroup = new THREE.Group();
      furnGroup.name = 'Furniture';
      for (const item of analysis.furniture) {
        furnGroup.add(furnGen.generateItem(item));
      }
      house.add(furnGroup);
    }

    // Removable Roof (dollhouse cutaway mode when showRoof is false)
    if (options?.showRoof !== false) {
      const roofGroup = this.generateRoof(analysis);
      house.add(roofGroup);
    }

    const ground = this.generateGround();
    house.add(ground);

    // Enable shadow casting on all meshes
    house.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return house;
  }

  // ==================================================
  // Walls
  // ==================================================

  generateWalls(walls: Wall[], wallHeight: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Walls';

    for (const wall of walls) {
      const mesh = this.wallToMesh(wall, wallHeight);
      group.add(mesh);
      this.wallMeshes.set(wall.id, mesh);
    }

    return group;
  }

  wallToMesh(wall: Wall, height: number): THREE.Mesh {
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.y - wall.start.y;
    const length = Math.sqrt(dx * dx + dz * dz);
    const safeLength = Math.max(length, 0.05);

    // Exterior walls rendered slightly thicker for visual distinction
    const thickness = wall.isExterior
      ? Math.max(wall.thickness || 0.25, 0.2)
      : Math.max(wall.thickness || 0.12, 0.12);

    const wallHeight = wall.height > 0 ? wall.height : (height || 2.7);

    const geom = new THREE.BoxGeometry(safeLength, wallHeight, thickness);

    const color = wall.color || WALL_MATERIAL_COLORS[wall.material] || '#f0ece0';
    const mat = this.createMaterial('wall', color) as THREE.MeshStandardMaterial;

    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = `wall_${wall.id}`;
    mesh.userData = { elementType: 'wall', elementId: wall.id, wall };

    // Position at midpoint, elevated so base sits on Y=0
    const mx = (wall.start.x + wall.end.x) / 2 - this.centerOffsetX;
    const mz = (wall.start.y + wall.end.y) / 2 - this.centerOffsetZ;
    mesh.position.set(mx, wallHeight / 2, mz);

    // Rotate around Y so the long axis aligns with the wall segment direction
    const angle = Math.atan2(dz, dx);
    mesh.rotation.y = -angle;

    return mesh;
  }

  // ==================================================
  // Doors
  // ==================================================

  generateDoorOpenings(doors: Door[], walls: Wall[]): void {
    for (const door of doors) {
      const wallMesh = this.wallMeshes.get(door.wallId);
      const wall = walls.find((w) => w.id === door.wallId);
      if (!wallMesh || !wall) continue;

      // Build a door-frame group attached at the door's world position
      const doorGroup = new THREE.Group();
      doorGroup.name = `door_${door.id}`;

      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.y - wall.start.y;
      const wallAngle = Math.atan2(dz, dx);
      const thickness = wall.isExterior
        ? Math.max(wall.thickness, 0.2)
        : Math.max(wall.thickness, 0.12);

      // Door panel (slightly recessed)
      const panelGeom = new THREE.BoxGeometry(
        door.width - 0.06,
        door.height - 0.06,
        thickness * 0.3,
      );
      const panelColor = door.color || '#6b4226';
      const panelMat = this.createMaterial('door', panelColor);
      const panel = new THREE.Mesh(panelGeom, panelMat);
      panel.name = `door_panel_${door.id}`;
      panel.userData = { elementType: 'door', elementId: door.id, door };
      panel.position.y = door.height / 2;
      doorGroup.add(panel);

      // Door frame (four thin boxes around the opening)
      const frameMat = this.createMaterial('doorFrame', '#4a3520');
      const frameWidth = 0.04;

      // Top bar
      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(door.width, frameWidth, thickness + 0.02),
        frameMat,
      );
      topBar.position.y = door.height;
      doorGroup.add(topBar);

      // Left jamb
      const leftJamb = new THREE.Mesh(
        new THREE.BoxGeometry(frameWidth, door.height, thickness + 0.02),
        frameMat,
      );
      leftJamb.position.set(-door.width / 2, door.height / 2, 0);
      doorGroup.add(leftJamb);

      // Right jamb
      const rightJamb = leftJamb.clone();
      rightJamb.position.set(door.width / 2, door.height / 2, 0);
      doorGroup.add(rightJamb);

      // Metallic Lever Handle & Escutcheon Plate (Brass / Chrome)
      const leverMat = new THREE.MeshStandardMaterial({
        color: 0xcca86e,
        roughness: 0.2,
        metalness: 0.85,
      });
      const plateGeom = new THREE.BoxGeometry(0.035, 0.14, 0.008);
      const handlePlate = new THREE.Mesh(plateGeom, leverMat);
      handlePlate.position.set(-door.width / 2 + 0.12, 0.95, thickness * 0.16);
      doorGroup.add(handlePlate);

      const leverGeom = new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8);
      const lever = new THREE.Mesh(leverGeom, leverMat);
      lever.rotation.z = Math.PI / 2;
      lever.position.set(-door.width / 2 + 0.16, 0.97, thickness * 0.19);
      doorGroup.add(lever);

      // Position in world
      const px = door.position.x - this.centerOffsetX;
      const pz = door.position.y - this.centerOffsetZ;
      doorGroup.position.set(px, 0, pz);
      doorGroup.rotation.y = -wallAngle;

      // Add door to the wall mesh's parent (the Walls group)
      wallMesh.parent?.add(doorGroup);
    }
  }

  // ==================================================
  // Windows
  // ==================================================

  generateWindowOpenings(windows: Window[], walls: Wall[]): void {
    for (const win of windows) {
      const wallMesh = this.wallMeshes.get(win.wallId);
      const wall = walls.find((w) => w.id === win.wallId);
      if (!wallMesh || !wall) continue;

      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.y - wall.start.y;
      const wallAngle = Math.atan2(dz, dx);
      const thickness = wall.isExterior
        ? Math.max(wall.thickness, 0.2)
        : Math.max(wall.thickness, 0.12);

      const winGroup = new THREE.Group();
      winGroup.name = `window_${win.id}`;

      // Glass pane (transparent)
      const glassGeom = new THREE.BoxGeometry(
        win.width - 0.06,
        win.height - 0.06,
        0.01,
      );
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.6,
        side: THREE.DoubleSide,
      });
      const glass = new THREE.Mesh(glassGeom, glassMat);
      glass.name = `window_glass_${win.id}`;
      glass.userData = { elementType: 'window', elementId: win.id, window: win };
      glass.position.y = win.sillHeight + win.height / 2;
      winGroup.add(glass);

      // Window frame
      const frameMat = this.createMaterial(
        'windowFrame',
        win.color || '#f0f0f0',
      );
      const fw = 0.04;

      // Top
      const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(win.width, fw, thickness + 0.02),
        frameMat,
      );
      topFrame.position.y = win.sillHeight + win.height;
      winGroup.add(topFrame);

      // Bottom (sill)
      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(win.width + 0.06, fw, thickness + 0.06),
        frameMat,
      );
      sill.position.y = win.sillHeight;
      winGroup.add(sill);

      // Left
      const leftFrame = new THREE.Mesh(
        new THREE.BoxGeometry(fw, win.height, thickness + 0.02),
        frameMat,
      );
      leftFrame.position.set(-win.width / 2, win.sillHeight + win.height / 2, 0);
      winGroup.add(leftFrame);

      // Right
      const rightFrame = leftFrame.clone();
      rightFrame.position.set(win.width / 2, win.sillHeight + win.height / 2, 0);
      winGroup.add(rightFrame);

      // Mullion bars for multi-pane windows
      if (win.panes > 1) {
        const divisions = Math.min(win.panes, 4);
        for (let i = 1; i < divisions; i++) {
          const frac = i / divisions;
          const isVertical = i % 2 === 1 && divisions <= 2;
          if (isVertical || divisions > 2) {
            const mullion = new THREE.Mesh(
              new THREE.BoxGeometry(fw * 0.7, win.height - 0.06, 0.015),
              frameMat,
            );
            mullion.position.set(
              -win.width / 2 + win.width * frac,
              win.sillHeight + win.height / 2,
              0,
            );
            winGroup.add(mullion);
          }
          if (!isVertical || divisions > 2) {
            const hMullion = new THREE.Mesh(
              new THREE.BoxGeometry(win.width - 0.06, fw * 0.7, 0.015),
              frameMat,
            );
            hMullion.position.set(
              0,
              win.sillHeight + win.height * frac,
              0,
            );
            winGroup.add(hMullion);
          }
        }
      }

      // Position in world
      const px = win.position.x - this.centerOffsetX;
      const pz = win.position.y - this.centerOffsetZ;
      winGroup.position.set(px, 0, pz);
      winGroup.rotation.y = -wallAngle;

      wallMesh.parent?.add(winGroup);
    }
  }

  // ==================================================
  // Floors
  // ==================================================

  generateFloor(rooms: Room[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Floors';

    for (const room of rooms) {
      if (room.vertices.length < 3) continue;

      const shape = new THREE.Shape();
      const v0 = room.vertices[0];
      shape.moveTo(v0.x - this.centerOffsetX, v0.y - this.centerOffsetZ);

      for (let i = 1; i < room.vertices.length; i++) {
        const v = room.vertices[i];
        shape.lineTo(v.x - this.centerOffsetX, v.y - this.centerOffsetZ);
      }
      shape.closePath();

      const geom = new THREE.ShapeGeometry(shape);
      // ShapeGeometry produces geometry in XY plane; rotate to XZ (floor)
      geom.rotateX(-Math.PI / 2);

      const color = ROOM_FLOOR_COLORS[room.type] ?? ROOM_FLOOR_COLORS.unknown;
      const mat = this.createMaterial('floor', color);

      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = `floor_${room.id}`;
      mesh.userData = { elementType: 'room', elementId: room.id, room };
      mesh.position.y = 0.001; // tiny offset to prevent z-fighting with ground
      mesh.receiveShadow = true;

      group.add(mesh);
    }

    return group;
  }

  // ==================================================
  // Roof
  // ==================================================

  generateRoof(analysis: HouseAnalysis): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Roof';

    const { roof, metadata } = analysis;
    const w = metadata.overallWidth + roof.overhang * 2;
    const d = metadata.overallDepth + roof.overhang * 2;
    const baseY = metadata.wallHeight * metadata.floors;
    const color = roof.color || ROOF_COLORS[roof.material] || '#606060';
    const mat = this.createMaterial('roof', color);

    switch (roof.type) {
      case 'flat':
        this.buildFlatRoof(group, w, d, baseY, mat);
        break;
      case 'gable':
        this.buildGableRoof(group, w, d, baseY, roof, mat);
        break;
      case 'hip':
        this.buildHipRoof(group, w, d, baseY, roof, mat);
        break;
      case 'shed':
        this.buildShedRoof(group, w, d, baseY, roof, mat);
        break;
      default:
        // Fallback to gable for unsupported types
        this.buildGableRoof(group, w, d, baseY, roof, mat);
        break;
    }

    return group;
  }

  // ---- Roof builders ----

  private buildFlatRoof(
    group: THREE.Group,
    w: number,
    d: number,
    baseY: number,
    mat: THREE.Material,
  ): void {
    const geom = new THREE.BoxGeometry(w, 0.12, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = baseY + 0.06;
    mesh.name = 'roof_flat';
    group.add(mesh);
  }

  private buildGableRoof(
    group: THREE.Group,
    w: number,
    d: number,
    baseY: number,
    roof: Roof,
    mat: THREE.Material,
  ): void {
    const pitch = THREE.MathUtils.degToRad(roof.pitch || 30);
    const ridgeHeight = (d / 2) * Math.tan(pitch);

    // Two inclined planes along Z axis meeting at the ridge
    const slopeLength = (d / 2) / Math.cos(pitch);

    const planeGeom = new THREE.PlaneGeometry(w, slopeLength);

    // Left slope (negative Z side looking from above)
    const left = new THREE.Mesh(planeGeom, mat);
    left.rotation.x = Math.PI / 2 - pitch;
    left.position.set(0, baseY + ridgeHeight / 2, -d / 4 * Math.cos(pitch));
    left.position.y = baseY + ridgeHeight / 2;
    left.position.z = -d / 4;
    // Re-orient: rotate around X so the plane tilts
    left.rotation.set(Math.PI / 2 - pitch, 0, 0);
    left.position.set(0, baseY + ridgeHeight / 2, -d / 4);
    left.name = 'roof_gable_left';
    group.add(left);

    // Right slope (positive Z side)
    const right = new THREE.Mesh(planeGeom, mat);
    right.rotation.set(-(Math.PI / 2 - pitch), 0, 0);
    right.position.set(0, baseY + ridgeHeight / 2, d / 4);
    right.name = 'roof_gable_right';
    group.add(right);

    // Gable end triangles (front and back)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-w / 2, 0);
    gableShape.lineTo(w / 2, 0);
    gableShape.lineTo(w / 2, 0);
    gableShape.lineTo(0, ridgeHeight);
    gableShape.lineTo(-w / 2, 0);

    // Actually the gable ends are perpendicular — along the X axis
    // We need triangles at front (Z = -d/2) and back (Z = d/2)
    const gableEndShape = new THREE.Shape();
    gableEndShape.moveTo(-w / 2, 0);
    gableEndShape.lineTo(w / 2, 0);
    gableEndShape.lineTo(0, ridgeHeight);
    gableEndShape.closePath();

    const gableGeom = new THREE.ShapeGeometry(gableEndShape);
    const wallMat = this.createMaterial('wall', '#f0ece0');

    const frontGable = new THREE.Mesh(gableGeom, wallMat);
    frontGable.position.set(0, baseY, -d / 2);
    frontGable.name = 'roof_gable_front_end';
    group.add(frontGable);

    const backGable = new THREE.Mesh(gableGeom, wallMat);
    backGable.rotation.y = Math.PI;
    backGable.position.set(0, baseY, d / 2);
    backGable.name = 'roof_gable_back_end';
    group.add(backGable);
  }

  private buildHipRoof(
    group: THREE.Group,
    w: number,
    d: number,
    baseY: number,
    roof: Roof,
    mat: THREE.Material,
  ): void {
    const pitch = THREE.MathUtils.degToRad(roof.pitch || 30);
    const inset = Math.min(w, d) / 2;
    const ridgeHeight = inset * Math.tan(pitch);
    const ridgeLength = Math.abs(w - d);

    // Build the four triangular / trapezoidal faces using BufferGeometry
    // Front face (along -Z)
    const frontVerts = new Float32Array([
      -w / 2, 0, -d / 2,
      w / 2, 0, -d / 2,
      ridgeLength > 0 ? ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? -d / 2 + inset : 0,
      ridgeLength > 0 ? -ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? -d / 2 + inset : 0,
    ]);
    const frontIdx = [0, 1, 2, 0, 2, 3];
    this.addHipFace(group, frontVerts, frontIdx, baseY, mat, 'roof_hip_front');

    // Back face (along +Z)
    const backVerts = new Float32Array([
      w / 2, 0, d / 2,
      -w / 2, 0, d / 2,
      ridgeLength > 0 ? -ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? d / 2 - inset : 0,
      ridgeLength > 0 ? ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? d / 2 - inset : 0,
    ]);
    this.addHipFace(group, backVerts, backIdx(frontIdx), baseY, mat, 'roof_hip_back');

    // Left face (along -X)
    const leftVerts = new Float32Array([
      -w / 2, 0, d / 2,
      -w / 2, 0, -d / 2,
      ridgeLength > 0 ? -ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? -d / 2 + inset : 0,
      ridgeLength > 0 ? -ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? d / 2 - inset : 0,
    ]);
    this.addHipFace(group, leftVerts, frontIdx, baseY, mat, 'roof_hip_left');

    // Right face (along +X)
    const rightVerts = new Float32Array([
      w / 2, 0, -d / 2,
      w / 2, 0, d / 2,
      ridgeLength > 0 ? ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? d / 2 - inset : 0,
      ridgeLength > 0 ? ridgeLength / 2 : 0, ridgeHeight, ridgeLength > 0 ? -d / 2 + inset : 0,
    ]);
    this.addHipFace(group, rightVerts, frontIdx, baseY, mat, 'roof_hip_right');
  }

  private addHipFace(
    group: THREE.Group,
    verts: Float32Array,
    indices: number[],
    baseY: number,
    mat: THREE.Material,
    name: string,
  ): void {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = baseY;
    mesh.name = name;
    group.add(mesh);
  }

  private buildShedRoof(
    group: THREE.Group,
    w: number,
    d: number,
    baseY: number,
    roof: Roof,
    mat: THREE.Material,
  ): void {
    const pitch = THREE.MathUtils.degToRad(roof.pitch || 15);
    const rise = d * Math.tan(pitch);
    const slopeLength = d / Math.cos(pitch);

    const geom = new THREE.PlaneGeometry(w, slopeLength);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = Math.PI / 2 - pitch;
    mesh.position.set(0, baseY + rise / 2, 0);
    mesh.name = 'roof_shed';
    group.add(mesh);
  }

  // ==================================================
  // Ground
  // ==================================================

  generateGround(): THREE.Mesh {
    const size = 60;
    const geom = new THREE.PlaneGeometry(size, size);
    geom.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = -0.01;
    mesh.receiveShadow = true;
    mesh.name = 'ground';
    return mesh;
  }

  // ==================================================
  // Material factory
  // ==================================================

  createMaterial(type: string, color: string): THREE.Material {
    const c = new THREE.Color(color);

    switch (type) {
      case 'wall':
        return new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.85,
          metalness: 0.02,
          side: THREE.DoubleSide,
        });

      case 'floor':
        return new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.7,
          metalness: 0.0,
          side: THREE.DoubleSide,
        });

      case 'roof':
        return new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.6,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });

      case 'door':
        return new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.55,
          metalness: 0.05,
        });

      case 'doorFrame':
      case 'windowFrame':
        return new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.4,
          metalness: 0.1,
        });

      case 'glass':
        return new THREE.MeshPhysicalMaterial({
          color: 0xf5faff,
          transparent: true,
          opacity: 0.85,
          roughness: 0.02,
          metalness: 0.0,
          transmission: 0.95,
          ior: 1.52,
          thickness: 0.06,
          side: THREE.DoubleSide,
        });

      default:
        return new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
    }
  }
}

// ---- tiny helper for hip-roof index reuse ----
function backIdx(idx: number[]): number[] {
  return idx; // same winding — normals computed from positions
}
