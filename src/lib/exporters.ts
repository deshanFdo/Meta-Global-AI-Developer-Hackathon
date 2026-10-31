import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { HouseAnalysis } from "@/types";

// ---------------------------------------------------------------------------
// GLB export (three.js GLTFExporter, binary)
// ---------------------------------------------------------------------------

export function groupToGLBBlob(group: THREE.Group): Promise<Blob> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          reject(new Error("GLB export returned JSON instead of binary."));
        }
      },
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
      { binary: true }
    );
  });
}

export async function exportGroupToGLB(group: THREE.Group, filename: string): Promise<void> {
  const blob = await groupToGLBBlob(group);
  downloadBlob(blob, filename);
}

// ---------------------------------------------------------------------------
// DXF R12 export (centerlines + openings + room labels; opens in AutoCAD)
// ---------------------------------------------------------------------------

function dxfLine(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  // Flip plan Y (down) to CAD Y (up).
  return [
    "0", "LINE", "8", layer,
    "10", x1.toFixed(3), "20", (-y1).toFixed(3), "30", "0.0",
    "11", x2.toFixed(3), "21", (-y2).toFixed(3), "31", "0.0",
  ].join("\n");
}

function dxfText(layer: string, x: number, y: number, height: number, value: string): string {
  const safe = value.replace(/\n/g, " ").slice(0, 64);
  return [
    "0", "TEXT", "8", layer,
    "10", x.toFixed(3), "20", (-y).toFixed(3), "30", "0.0",
    "40", height.toFixed(3), "1", safe,
  ].join("\n");
}

function dxfCircle(layer: string, x: number, y: number, r: number): string {
  return [
    "0", "CIRCLE", "8", layer,
    "10", x.toFixed(3), "20", (-y).toFixed(3), "30", "0.0",
    "40", r.toFixed(3),
  ].join("\n");
}

export function houseToDXF(a: HouseAnalysis): string {
  const parts: string[] = [];
  for (const w of a.walls) {
    parts.push(dxfLine(w.isExterior ? "WALLS_EXT" : "WALLS_INT", w.start.x, w.start.y, w.end.x, w.end.y));
  }
  for (const d of a.doors) {
    parts.push(dxfCircle("DOORS", d.position.x, d.position.y, d.width / 2));
    parts.push(dxfText("DOORS", d.position.x + 0.1, d.position.y + 0.1, 0.12, d.id));
  }
  for (const win of a.windows) {
    parts.push(dxfLine("WINDOWS", win.position.x - win.width / 2, win.position.y, win.position.x + win.width / 2, win.position.y));
    parts.push(dxfText("WINDOWS", win.position.x + 0.1, win.position.y - 0.15, 0.1, win.id));
  }
  for (const r of a.rooms) {
    const cx = r.vertices.reduce((s, v) => s + v.x, 0) / r.vertices.length;
    const cy = r.vertices.reduce((s, v) => s + v.y, 0) / r.vertices.length;
    parts.push(dxfText("ROOMS", cx, cy, 0.25, `${r.name} ${r.area.toFixed(1)}m2`));
  }
  return ["0", "SECTION", "2", "ENTITIES", ...parts, "0", "ENDSEC", "0", "EOF"].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// CSV schedules
// ---------------------------------------------------------------------------

export function houseToCSV(a: HouseAnalysis): string {
  const rows: string[][] = [["schedule", "id", "detail", "value"]];
  for (const r of a.rooms) rows.push(["room", r.id, `${r.name} (${r.type})`, `${r.area.toFixed(2)} m2`]);
  for (const d of a.doors) rows.push(["door", d.id, `${d.style} ${d.width.toFixed(2)}x${d.height.toFixed(2)}m`, d.wallId]);
  for (const w of a.windows) rows.push(["window", w.id, `${w.style} ${w.width.toFixed(2)}x${w.height.toFixed(2)}m`, w.wallId]);
  const q = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(q).join(",")).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadText(text: string, filename: string, mime: string): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}
