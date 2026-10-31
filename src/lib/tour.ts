import type { HouseAnalysis } from "@/types";
import type { LightingMode } from "@/components/Viewer3D";

// ---------------------------------------------------------------------------
// Scripted demo tour: beats with camera moves, captions and staged actions.
// ---------------------------------------------------------------------------

export interface TourBeat {
  caption: string;
  sub: string;
  dur: number; // seconds
  camPos: [number, number, number];
  camTgt: [number, number, number];
  roof?: boolean;
  lighting?: LightingMode;
  sunFrom?: number;
  sunTo?: number;
  openDoors?: string[];
  openWindows?: string[];
}

function centroid(vertices: Array<{ x: number; y: number }>, w: number, d: number): [number, number] {
  const cx = vertices.reduce((s, v) => s + v.x, 0) / Math.max(1, vertices.length) - w / 2;
  const cz = vertices.reduce((s, v) => s + v.y, 0) / Math.max(1, vertices.length) - d / 2;
  return [cx, cz];
}

function nearestRoomId(analysis: HouseAnalysis, x: number, y: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const room of analysis.rooms) {
    if (room.vertices.length === 0) continue;
    const cx = room.vertices.reduce((s, v) => s + v.x, 0) / room.vertices.length;
    const cy = room.vertices.reduce((s, v) => s + v.y, 0) / room.vertices.length;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = room.id;
    }
  }
  return best;
}

export function buildTour(analysis: HouseAnalysis): TourBeat[] {
  const { overallWidth: w, overallDepth: d } = analysis.metadata;
  const r = Math.max(w, d);
  const wide: { pos: [number, number, number]; tgt: [number, number, number] } = {
    pos: [r * 0.9, r * 0.75 + 4, r * 0.9 + d * 0.25],
    tgt: [0, 0.5, 0],
  };
  const beats: TourBeat[] = [
    {
      caption: `${analysis.metadata.style} — from paper plan to living house`,
      sub: "AI-extracted by Muse Spark, verified by a second pass",
      dur: 8,
      camPos: wide.pos,
      camTgt: wide.tgt,
      roof: true,
      lighting: "day",
    },
    {
      caption: "Lift the roof to see every room",
      sub: `${analysis.rooms.length} rooms · ${analysis.doors.length} doors · ${analysis.windows.length} windows`,
      dur: 6,
      camPos: [r * 0.5, r * 0.9 + 3, r * 0.5 + d * 0.3],
      camTgt: [0, 0.3, 0],
      roof: false,
    },
  ];

  const rooms = [...analysis.rooms]
    .filter((room) => room.vertices.length > 2)
    .sort((a, b) => b.area - a.area)
    .slice(0, 5);
  rooms.forEach((room, i) => {
    const [cx, cz] = centroid(room.vertices, w, d);
    const angle = i * 1.15 + 0.4;
    const dist = r * 0.45 + 4.5;
    const doors = analysis.doors
      .filter((door) => nearestRoomId(analysis, door.position.x, door.position.y) === room.id)
      .map((door) => door.id);
    const windows = analysis.windows
      .filter((win) => nearestRoomId(analysis, win.position.x, win.position.y) === room.id)
      .map((win) => win.id);
    beats.push({
      caption: `${room.name} — ${room.area.toFixed(1)} m²`,
      sub: "Doors and windows open on their own · click anything to customize it",
      dur: 7,
      camPos: [cx + Math.cos(angle) * dist, 6.5, cz + Math.sin(angle) * dist],
      camTgt: [cx, 0.4, cz],
      roof: false,
      openDoors: doors,
      openWindows: windows,
    });
  });

  beats.push(
    {
      caption: "Full sun control, 6 AM to 8 PM",
      sub: "Watch the shadows sweep the house",
      dur: 9,
      camPos: wide.pos,
      camTgt: wide.tgt,
      roof: true,
      sunFrom: 8,
      sunTo: 18,
    },
    {
      caption: "And after dark",
      sub: "Warm interiors glow through every window",
      dur: 7,
      camPos: [r * 0.7, r * 0.5 + 3, r * 0.7 + d * 0.3],
      camTgt: [0, 0.8, 0],
      lighting: "night",
    },
    {
      caption: "Now walk it yourself",
      sub: "First person, AR, VR — then export to GLB, DXF and CSV",
      dur: 7,
      camPos: wide.pos,
      camTgt: wide.tgt,
      lighting: "day",
      roof: true,
    }
  );

  return beats;
}
