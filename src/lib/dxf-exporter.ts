import type { HouseAnalysis } from '@/types';

/**
 * Generates an AutoCAD-compatible ASCII DXF (R12 / AC1009) string
 * from a structured HouseAnalysis object.
 *
 * Layers generated:
 *  - WALLS_EXT (Exterior masonry / load-bearing perimeter)
 *  - WALLS_INT (Interior partitions & shear cheeks)
 *  - DOORS (Door leaves & swing paths)
 *  - WINDOWS (Window openings, sills, and glazing lines)
 *  - FURNITURE (Interior fixtures & equipment outlines)
 *  - ROOM_LABELS (Room names and metric areas in m²)
 *  - DIMENSIONS (Metric CAD dimension strings)
 */
export function generateDXF(analysis: HouseAnalysis): string {
  const lines: string[] = [];

  const add = (...tokens: (string | number)[]) => {
    for (const token of tokens) {
      lines.push(String(token));
    }
  };

  // 1. HEADER SECTION
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1009'); // AutoCAD R12 standard (maximum cross-software compatibility)
  add(9, '$INSUNITS');
  add(70, 6); // 6 = Meters
  add(0, 'ENDSEC');

  // 2. TABLES SECTION (Layer definitions)
  add(0, 'SECTION');
  add(2, 'TABLES');
  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, 7);

  const layerDefs = [
    { name: 'WALLS_EXT', color: 7 }, // White / Black
    { name: 'WALLS_INT', color: 8 }, // Gray
    { name: 'DOORS', color: 4 }, // Cyan
    { name: 'WINDOWS', color: 3 }, // Green
    { name: 'FURNITURE', color: 1 }, // Red
    { name: 'ROOM_LABELS', color: 2 }, // Yellow
    { name: 'DIMENSIONS', color: 5 }, // Blue
  ];

  for (const lyr of layerDefs) {
    add(0, 'LAYER');
    add(2, lyr.name);
    add(70, 0);
    add(62, lyr.color);
    add(6, 'CONTINUOUS');
  }

  add(0, 'ENDTAB');
  add(0, 'ENDSEC');

  // 3. ENTITIES SECTION
  add(0, 'SECTION');
  add(2, 'ENTITIES');

  // In DXF, positive Y goes upward. Blueprint coordinate Y goes downward.
  // We flip Y: cadY = -blueprintY so orientation is upright.
  const toCADY = (y: number) => -y;

  // --- WALLS ---
  for (const wall of analysis.walls) {
    const layer = wall.isExterior ? 'WALLS_EXT' : 'WALLS_INT';
    add(0, 'LINE');
    add(8, layer);
    add(10, wall.start.x.toFixed(4));
    add(20, toCADY(wall.start.y).toFixed(4));
    add(30, 0.0);
    add(11, wall.end.x.toFixed(4));
    add(21, toCADY(wall.end.y).toFixed(4));
    add(31, 0.0);
  }

  // --- DOORS ---
  for (const door of analysis.doors) {
    const r = door.width;
    const cx = door.position.x;
    const cy = toCADY(door.position.y);

    // Draw door opening tick / leaf line
    add(0, 'LINE');
    add(8, 'DOORS');
    add(10, (cx - r / 2).toFixed(4));
    add(20, cy.toFixed(4));
    add(30, 0.0);
    add(11, (cx + r / 2).toFixed(4));
    add(21, cy.toFixed(4));
    add(31, 0.0);

    // Swing circle / quarter-arc indication
    add(0, 'ARC');
    add(8, 'DOORS');
    add(10, (cx - r / 2).toFixed(4));
    add(20, cy.toFixed(4));
    add(30, 0.0);
    add(40, r.toFixed(4)); // radius
    add(50, 0.0); // start angle
    add(51, 90.0); // end angle
  }

  // --- WINDOWS ---
  for (const win of analysis.windows) {
    const w = win.width;
    const cx = win.position.x;
    const cy = toCADY(win.position.y);

    // Three parallel lines representing architectural window sill & glazing
    for (const offset of [-0.08, 0, 0.08]) {
      add(0, 'LINE');
      add(8, 'WINDOWS');
      add(10, (cx - w / 2).toFixed(4));
      add(20, (cy + offset).toFixed(4));
      add(30, 0.0);
      add(11, (cx + w / 2).toFixed(4));
      add(21, (cy + offset).toFixed(4));
      add(31, 0.0);
    }
  }

  // --- FURNITURE ---
  if (analysis.furniture) {
    for (const f of analysis.furniture) {
      const w = f.width || 1.0;
      const d = f.depth || 1.0;
      const x1 = f.position.x - w / 2;
      const x2 = f.position.x + w / 2;
      const y1 = toCADY(f.position.y - d / 2);
      const y2 = toCADY(f.position.y + d / 2);

      // 4-sided bounding box rectangle
      const pts = [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1],
      ];

      for (let i = 0; i < 4; i++) {
        add(0, 'LINE');
        add(8, 'FURNITURE');
        add(10, pts[i][0].toFixed(4));
        add(20, pts[i][1].toFixed(4));
        add(30, 0.0);
        add(11, pts[i + 1][0].toFixed(4));
        add(21, pts[i + 1][1].toFixed(4));
        add(31, 0.0);
      }
    }
  }

  // --- ROOM LABELS ---
  for (const room of analysis.rooms) {
    if (room.vertices.length === 0) continue;
    let sumX = 0;
    let sumY = 0;
    for (const v of room.vertices) {
      sumX += v.x;
      sumY += v.y;
    }
    const cx = sumX / room.vertices.length;
    const cy = toCADY(sumY / room.vertices.length);

    // Text: Room Name
    add(0, 'TEXT');
    add(8, 'ROOM_LABELS');
    add(10, cx.toFixed(4));
    add(20, (cy + 0.2).toFixed(4));
    add(30, 0.0);
    add(40, 0.28); // text height in meters
    add(1, room.name);

    // Text: Area annotation
    if (room.area) {
      add(0, 'TEXT');
      add(8, 'ROOM_LABELS');
      add(10, cx.toFixed(4));
      add(20, (cy - 0.2).toFixed(4));
      add(30, 0.0);
      add(40, 0.22);
      add(1, `${room.area.toFixed(2)} m2`);
    }
  }

  // --- DIMENSIONS ---
  const width = analysis.metadata.overallWidth;
  const depth = analysis.metadata.overallDepth;

  // Horizontal overall dimension string (top)
  add(0, 'LINE');
  add(8, 'DIMENSIONS');
  add(10, 0.0);
  add(20, 1.2);
  add(30, 0.0);
  add(11, width.toFixed(4));
  add(21, 1.2);
  add(31, 0.0);

  add(0, 'TEXT');
  add(8, 'DIMENSIONS');
  add(10, (width / 2).toFixed(4));
  add(20, 1.45);
  add(30, 0.0);
  add(40, 0.3);
  add(1, `${(width * 1000).toFixed(0)} mm (${width.toFixed(2)}m)`);

  // Vertical overall dimension string (left)
  add(0, 'LINE');
  add(8, 'DIMENSIONS');
  add(10, -1.2);
  add(20, 0.0);
  add(30, 0.0);
  add(11, -1.2);
  add(21, toCADY(depth).toFixed(4));
  add(31, 0.0);

  add(0, 'TEXT');
  add(8, 'DIMENSIONS');
  add(10, -2.2);
  add(20, toCADY(depth / 2).toFixed(4));
  add(30, 0.0);
  add(40, 0.3);
  add(1, `${(depth * 1000).toFixed(0)} mm (${depth.toFixed(2)}m)`);

  add(0, 'ENDSEC');
  add(0, 'EOF');

  return lines.join('\n');
}

/**
 * Downloads a DXF file to the client's browser.
 */
export function exportHouseToDXF(
  analysis: HouseAnalysis,
  filename = 'architectural-blueprint.dxf',
): void {
  if (typeof window === 'undefined') return;

  const dxfString = generateDXF(analysis);
  const blob = new Blob([dxfString], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an architectural schedule in CSV format.
 */
export function exportHouseScheduleCSV(
  analysis: HouseAnalysis,
  filename = 'architectural-schedules.csv',
): void {
  if (typeof window === 'undefined') return;

  const rows: string[] = [];

  rows.push('--- ROOM FINISH & AREA SCHEDULE ---');
  rows.push('Room Name,Zone Type,Area (m2),Ratio of Total (%)');
  const total = analysis.metadata.totalArea || 1;
  for (const r of analysis.rooms) {
    const pct = ((r.area / total) * 100).toFixed(1);
    rows.push(`"${r.name}","${r.type}",${r.area.toFixed(2)},${pct}%`);
  }

  rows.push('');
  rows.push('--- WINDOW SCHEDULE ---');
  rows.push('ID,Width (m),Height (m),Sill Height (m),Glazing Area (m2),Style,Panes');
  for (const w of analysis.windows) {
    const area = (w.width * w.height).toFixed(2);
    rows.push(`"${w.id}",${w.width},${w.height},${w.sillHeight},${area},"${w.style}",${w.panes}`);
  }

  rows.push('');
  rows.push('--- DOOR SCHEDULE ---');
  rows.push('ID,Width (m),Height (m),Style,Swing Direction,Material');
  for (const d of analysis.doors) {
    rows.push(`"${d.id}",${d.width},${d.height},"${d.style}","${d.swingDirection}","${d.material}"`);
  }

  rows.push('');
  rows.push('--- FURNITURE & FIXTURE COUNT ---');
  rows.push('Type,Room,Position X (m),Position Y (m),Facing Rotation (deg)');
  for (const f of analysis.furniture || []) {
    rows.push(`"${f.type}","${f.room || ''}",${f.position.x},${f.position.y},${f.rotation}`);
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
