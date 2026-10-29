import type { HouseAnalysis, Room } from '@/types';
import {
  WALL_FINISHES,
  FLOOR_FINISHES,
  TRIM_FINISHES,
  type WallFinishKey,
  type FloorFinishKey,
  type TrimFinishKey,
} from './finish-library';

export interface RoomCostBreakdown {
  roomId: string;
  roomName: string;
  floorArea: number; // m²
  wallAreaNet: number; // m²
  trimLength: number; // linear meters
  glazingArea: number; // m²
  flooringCost: number;
  wallFinishCost: number;
  trimCost: number;
  glazingCost: number;
  mepCost: number;
  framingCost: number;
  roomTotal: number;
}

export interface ProjectCostEstimate {
  totalPremisesArea: number;
  totalCostUSD: number;
  costPerSquareMeterUSD: number;
  flooringTotal: number;
  wallFinishTotal: number;
  trimTotal: number;
  glazingTotal: number;
  mepTotal: number;
  framingTotal: number;
  rooms: RoomCostBreakdown[];
}

export interface FinishSelectionState {
  globalWall: WallFinishKey;
  globalFloor: FloorFinishKey;
  globalTrim: TrimFinishKey;
  roomOverrides: Record<string, {
    wall?: WallFinishKey;
    floor?: FloorFinishKey;
    trim?: TrimFinishKey;
  }>;
}

/**
 * Calculates the polygonal perimeter of a room.
 */
function calculateRoomPerimeter(room: Room): number {
  if (!room.vertices || room.vertices.length < 3) return Math.sqrt(room.area || 10) * 4;
  let p = 0;
  for (let i = 0; i < room.vertices.length; i++) {
    const v1 = room.vertices[i];
    const v2 = room.vertices[(i + 1) % room.vertices.length];
    p += Math.hypot(v2.x - v1.x, v2.y - v1.y);
  }
  return p;
}

/**
 * Computes an itemized RSMeans-aligned construction cost estimate
 * driven by the CAD room geometries and active finish selections.
 */
export function calculateProjectCost(
  analysis: HouseAnalysis,
  finishes: FinishSelectionState
): ProjectCostEstimate {
  const wallHeight = analysis.metadata.wallHeight || 2.8;
  const GLAZING_UNIT_COST = 280; // $/m² for high-performance double-glazed fenestration
  const FRAMING_DRYWALL_COST = 42; // $/m² for light-gauge steel/timber studs + insulated drywall

  const roomBreakdowns: RoomCostBreakdown[] = analysis.rooms.map((room) => {
    const floorArea = room.area || 12;
    const perimeter = calculateRoomPerimeter(room);
    const grossWallArea = perimeter * wallHeight;

    // Openings within this room
    const roomDoors = (analysis.doors || []).filter((d) => room.wallIds?.includes(d.wallId));
    const roomWindows = (analysis.windows || []).filter((w) => room.wallIds?.includes(w.wallId));

    const doorOpenings = roomDoors.reduce((acc, d) => acc + (d.width || 0.9) * (d.height || 2.1), 0);
    const windowOpenings = roomWindows.reduce((acc, w) => acc + (w.width || 1.2) * (w.height || 1.4), 0);
    const doorThresholdGaps = roomDoors.reduce((acc, d) => acc + (d.width || 0.9), 0);

    const wallAreaNet = Math.max(0, grossWallArea - doorOpenings - windowOpenings);
    const trimLength = Math.max(0, perimeter - doorThresholdGaps);
    const glazingArea = windowOpenings;

    // Selected finishes for this room
    const overrides = finishes.roomOverrides[room.id] || {};
    const wallKey = overrides.wall || finishes.globalWall;
    const floorKey = overrides.floor || finishes.globalFloor;
    const trimKey = overrides.trim || finishes.globalTrim;

    const floorUnitCost = FLOOR_FINISHES[floorKey]?.unitCostUSD ?? 75;
    const wallUnitCost = WALL_FINISHES[wallKey]?.unitCostUSD ?? 20;
    const trimUnitCost = TRIM_FINISHES[trimKey]?.unitCostUSD ?? 35;

    // MEP Rough-in cost based on functional room type
    let mepCost = 1400; // baseline electrical & lighting
    if (room.type === 'bathroom' || room.name.toLowerCase().includes('bath') || room.name.toLowerCase().includes('wc')) {
      mepCost = 4200; // sanitary plumbing, venting, radiant heat
    } else if (room.type === 'kitchen' || room.name.toLowerCase().includes('kitchen')) {
      mepCost = 5500; // gas/induction 240V, dishwasher line, sink rough-in, range hood
    } else if (room.type === 'utility_room' || room.name.toLowerCase().includes('furnace')) {
      mepCost = 6800; // heat pump / boiler hub, main panel, water distribution manifold
    } else if (room.type === 'porch' || room.type === 'balcony' || room.type === 'patio') {
      mepCost = 800; // outdoor rated GFI & sconces
    }

    const flooringCost = floorArea * floorUnitCost;
    const wallFinishCost = wallAreaNet * wallUnitCost;
    const trimCost = trimLength * trimUnitCost;
    const glazingCost = glazingArea * GLAZING_UNIT_COST;
    const framingCost = wallAreaNet * FRAMING_DRYWALL_COST;

    const roomTotal = flooringCost + wallFinishCost + trimCost + glazingCost + mepCost + framingCost;

    return {
      roomId: room.id,
      roomName: room.name,
      floorArea,
      wallAreaNet,
      trimLength,
      glazingArea,
      flooringCost,
      wallFinishCost,
      trimCost,
      glazingCost,
      mepCost,
      framingCost,
      roomTotal,
    };
  });

  const totalPremisesArea = analysis.metadata.totalArea || 120;
  const flooringTotal = roomBreakdowns.reduce((s, r) => s + r.flooringCost, 0);
  const wallFinishTotal = roomBreakdowns.reduce((s, r) => s + r.wallFinishCost, 0);
  const trimTotal = roomBreakdowns.reduce((s, r) => s + r.trimCost, 0);
  const glazingTotal = roomBreakdowns.reduce((s, r) => s + r.glazingCost, 0);
  const mepTotal = roomBreakdowns.reduce((s, r) => s + r.mepCost, 0);
  const framingTotal = roomBreakdowns.reduce((s, r) => s + r.framingCost, 0);

  const totalCostUSD = flooringTotal + wallFinishTotal + trimTotal + glazingTotal + mepTotal + framingTotal;
  const costPerSquareMeterUSD = totalPremisesArea > 0 ? totalCostUSD / totalPremisesArea : 0;

  return {
    totalPremisesArea,
    totalCostUSD,
    costPerSquareMeterUSD,
    flooringTotal,
    wallFinishTotal,
    trimTotal,
    glazingTotal,
    mepTotal,
    framingTotal,
    rooms: roomBreakdowns,
  };
}

/**
 * Generates an architectural Bill of Materials CSV.
 */
export function exportCostEstimateCSV(estimate: ProjectCostEstimate, styleName: string): void {
  const lines: string[] = [];
  lines.push(`ARCHITECTURAL BILL OF MATERIALS & COST ESTIMATE - ${styleName.toUpperCase()}`);
  lines.push(`Total Area,${estimate.totalPremisesArea.toFixed(2)} m²`);
  lines.push(`Total Estimated Cost,$${estimate.totalCostUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`Cost / m²,$${estimate.costPerSquareMeterUSD.toFixed(2)}/m²`);
  lines.push('');
  lines.push('SUMMARY BY TRADE,AMOUNT (USD),PERCENTAGE');
  lines.push(`Flooring Finishes,$${estimate.flooringTotal.toFixed(2)},${((estimate.flooringTotal / estimate.totalCostUSD) * 100).toFixed(1)}%`);
  lines.push(`Wall Paint & Coverings,$${estimate.wallFinishTotal.toFixed(2)},${((estimate.wallFinishTotal / estimate.totalCostUSD) * 100).toFixed(1)}%`);
  lines.push(`Millwork & Trims,$${estimate.trimTotal.toFixed(2)},${((estimate.trimTotal / estimate.totalCostUSD) * 100).toFixed(1)}%`);
  lines.push(`Glazing & Fenestration,$${estimate.glazingTotal.toFixed(2)},${((estimate.glazingTotal / estimate.totalCostUSD) * 100).toFixed(1)}%`);
  lines.push(`MEP (Plumbing / HVAC / Electrical),$${estimate.mepTotal.toFixed(2)},${((estimate.mepTotal / estimate.totalCostUSD) * 100).toFixed(1)}%`);
  lines.push(`Framing & Drywall Assemblies,$${estimate.framingTotal.toFixed(2)},${((estimate.framingTotal / estimate.totalCostUSD) * 100).toFixed(1)}%`);
  lines.push('');
  lines.push('ROOM,FLOOR AREA (m²),NET WALL (m²),TRIM (m),GLAZING (m²),FLOORING ($),WALLS ($),TRIM ($),GLAZING ($),MEP ($),TOTAL ($)');

  for (const r of estimate.rooms) {
    lines.push(`"${r.roomName}",${r.floorArea.toFixed(2)},${r.wallAreaNet.toFixed(2)},${r.trimLength.toFixed(2)},${r.glazingArea.toFixed(2)},${r.flooringCost.toFixed(2)},${r.wallFinishCost.toFixed(2)},${r.trimCost.toFixed(2)},${r.glazingCost.toFixed(2)},${r.mepCost.toFixed(2)},${r.roomTotal.toFixed(2)}`);
  }

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${styleName.toLowerCase().replace(/\s+/g, '-')}-cost-estimate.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

