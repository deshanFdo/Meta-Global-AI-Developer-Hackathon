"use client";

import React, { useState } from "react";
import type { Door, FurnitureItem, HouseAnalysis, PlanWindow, Wall } from "@/types";
import type { ElementTag } from "@/lib/geometry";
import { isOpenable } from "@/lib/geometry";

interface Props {
  analysis: HouseAnalysis;
  selection: ElementTag;
  /** Current open state for the selected door/window (undefined for walls/furniture). */
  open?: boolean;
  onToggleOpen?: () => void;
  onPatch: (kind: ElementTag["kind"], id: string, patch: Record<string, unknown>) => void;
  onDeleteFurniture: (id: string) => void;
  /** Set every wall (and the default ceiling height) to h meters. */
  onSetAllWallHeight: (h: number) => void;
  /** Shift a door/window along its wall by dir * 0.1 m. */
  onNudge: (kind: "door" | "window", id: string, dir: 1 | -1) => void;
  onClose: () => void;
  onResume?: () => void;
}

export const DOOR_STYLES = ["single", "double", "sliding", "french", "garage", "pocket"];
export const DOOR_MATS = ["wood", "glass", "metal", "composite"];
export const WIN_STYLES = ["single-hung", "double-hung", "casement", "bay", "sliding", "fixed", "skylight"];
export const WIN_MATS = ["wood", "vinyl", "aluminum"];
export const WALL_MATS = ["brick", "concrete", "drywall", "wood", "stone", "glass", "stucco", "vinyl_siding"];
export const FURN_TYPES = [
  "bed_double", "bed_single", "sofa", "dining_table", "chair", "kitchen_counter", "toilet", "bathtub",
  "sink", "desk", "wardrobe", "coffee_table", "nightstand", "plant", "tv_unit", "furnace", "washing_machine", "column",
];
export const ROOF_TYPES = ["gable", "hip", "flat", "mansard", "gambrel", "shed", "butterfly"];
export const ROOF_MATS = ["asphalt_shingle", "tile", "metal", "slate", "wood_shake"];

function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <label className="block text-xs">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-[var(--border)] bg-black/30 px-2 py-1.5 text-xs";

function num(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export default function CustomizePanel({ analysis, selection, open, onToggleOpen, onPatch, onDeleteFurniture, onSetAllWallHeight, onNudge, onClose, onResume }: Props): React.JSX.Element {
  const door: Door | undefined =
    selection.kind === "door" ? analysis.doors.find((d) => d.id === selection.id) : undefined;
  const win: PlanWindow | undefined =
    selection.kind === "window" ? analysis.windows.find((w) => w.id === selection.id) : undefined;
  const wall: Wall | undefined =
    selection.kind === "wall" ? analysis.walls.find((w) => w.id === selection.id) : undefined;
  const furn: FurnitureItem | undefined =
    selection.kind === "furniture" ? (analysis.furniture ?? []).find((f) => f.id === selection.id) : undefined;
  const roof = selection.kind === "roof" ? analysis.roof : undefined;

  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [rec, setRec] = useState<{ patch: Record<string, string | number>; reason: string; model: string } | null>(null);

  if (!door && !win && !wall && !furn && !roof) {
    return (
      <div className="text-xs text-[var(--muted)]">
        <p>This element is no longer in the model.</p>
        <button type="button" onClick={onClose} className="btn-ghost mt-2 px-3 py-1.5">
          Close
        </button>
      </div>
    );
  }

  const title =
    door !== undefined
      ? `Door ${door.id} · ${door.width.toFixed(2)} × ${door.height.toFixed(2)} m`
      : win !== undefined
        ? `Window ${win.id} · ${win.width.toFixed(2)} × ${win.height.toFixed(2)} m`
        : wall !== undefined
          ? `Wall ${wall.id} · ${wall.isExterior ? "exterior" : "interior"}`
          : roof !== undefined
            ? `Roof · ${roof.type} · ${roof.pitch.toFixed(0)}° pitch`
            : `Furniture ${furn?.id} · ${furn?.type.replace(/_/g, " ")}`;

  const runRecommend = async (): Promise<void> => {
    if (door === undefined && win === undefined) return;
    setRecLoading(true);
    setRecError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: selection.kind, id: selection.id, plan: analysis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Recommendation failed.");
      setRec({ patch: data.patch, reason: String(data.reason ?? ""), model: String(data.model ?? "") });
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Recommendation failed.");
    } finally {
      setRecLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-xs" aria-label="Close panel">
          ✕
        </button>
      </div>

      {door !== undefined && (
        <div className="space-y-2">
          <Row label="Style">
            <select value={door.style} onChange={(e) => onPatch("door", door.id, { style: e.target.value })} className={inputCls}>
              {DOOR_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Row>
          <Row label="Material">
            <select value={door.material} onChange={(e) => onPatch("door", door.id, { material: e.target.value })} className={inputCls}>
              {DOOR_MATS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Width (m)">
              <input
                type="number" step="0.05" min={0.5} max={6} defaultValue={door.width.toFixed(2)}
                key={`w-${door.width}`} className={inputCls}
                onBlur={(e) => onPatch("door", door.id, { width: num(e.target.value, door.width, 0.5, 6) })}
              />
            </Row>
            <Row label="Height (m)">
              <input
                type="number" step="0.05" min={1.6} max={3.2} defaultValue={door.height.toFixed(2)}
                key={`h-${door.height}`} className={inputCls}
                onBlur={(e) => onPatch("door", door.id, { height: num(e.target.value, door.height, 1.6, 3.2) })}
              />
            </Row>
          </div>
          <Row label="Color">
            <input
              type="color" value={/^#[0-9a-fA-F]{6}$/.test(door.color) ? door.color : "#7a5c3e"}
              onChange={(e) => onPatch("door", door.id, { color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded-md border border-[var(--border)] bg-black/30"
            />
          </Row>
          <div className="flex gap-2">
            <button type="button" onClick={() => onNudge("door", door.id, -1)} className="btn-ghost flex-1 px-2 py-1.5 text-[11px]">
              ← 0.1 m
            </button>
            <button type="button" onClick={() => onNudge("door", door.id, 1)} className="btn-ghost flex-1 px-2 py-1.5 text-[11px]">
              0.1 m →
            </button>
          </div>
        </div>
      )}

      {win !== undefined && (
        <div className="space-y-2">
          <Row label="Style">
            <select value={win.style} onChange={(e) => onPatch("window", win.id, { style: e.target.value })} className={inputCls}>
              {WIN_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Material">
              <select value={win.material} onChange={(e) => onPatch("window", win.id, { material: e.target.value })} className={inputCls}>
                {WIN_MATS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Row>
            <Row label="Panes">
              <select value={win.panes} onChange={(e) => onPatch("window", win.id, { panes: Number(e.target.value) })} className={inputCls}>
                {[1, 2, 3].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Row>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Row label="Width">
              <input type="number" step="0.05" min={0.3} max={6} defaultValue={win.width.toFixed(2)} key={`w-${win.width}`} className={inputCls}
                onBlur={(e) => onPatch("window", win.id, { width: num(e.target.value, win.width, 0.3, 6) })} />
            </Row>
            <Row label="Height">
              <input type="number" step="0.05" min={0.3} max={3} defaultValue={win.height.toFixed(2)} key={`h-${win.height}`} className={inputCls}
                onBlur={(e) => onPatch("window", win.id, { height: num(e.target.value, win.height, 0.3, 3) })} />
            </Row>
            <Row label="Sill">
              <input type="number" step="0.05" min={0} max={2} defaultValue={win.sillHeight.toFixed(2)} key={`s-${win.sillHeight}`} className={inputCls}
                onBlur={(e) => onPatch("window", win.id, { sillHeight: num(e.target.value, win.sillHeight, 0, 2) })} />
            </Row>
          </div>
          <Row label="Frame color">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(win.color) ? win.color : "#3c414d"}
              onChange={(e) => onPatch("window", win.id, { color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded-md border border-[var(--border)] bg-black/30" />
          </Row>
          <div className="flex gap-2">
            <button type="button" onClick={() => onNudge("window", win.id, -1)} className="btn-ghost flex-1 px-2 py-1.5 text-[11px]">
              ← 0.1 m
            </button>
            <button type="button" onClick={() => onNudge("window", win.id, 1)} className="btn-ghost flex-1 px-2 py-1.5 text-[11px]">
              0.1 m →
            </button>
          </div>
        </div>
      )}

      {wall !== undefined && (
        <div className="space-y-2">
          <Row label="Material">
            <select value={wall.material} onChange={(e) => onPatch("wall", wall.id, { material: e.target.value })} className={inputCls}>
              {WALL_MATS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Row>
          <Row label="Color">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(wall.color) ? wall.color : "#e8e2d6"}
              onChange={(e) => onPatch("wall", wall.id, { color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded-md border border-[var(--border)] bg-black/30" />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Height (m)">
              <input type="number" step="0.05" min={2.0} max={4.5} defaultValue={wall.height.toFixed(2)} key={`wh-${wall.height}`} className={inputCls}
                onBlur={(e) => onPatch("wall", wall.id, { height: num(e.target.value, wall.height, 2.0, 4.5) })} />
            </Row>
            <Row label="Thickness (m)">
              <input type="number" step="0.01" min={0.05} max={0.6} defaultValue={wall.thickness.toFixed(2)} key={`wt-${wall.thickness}`} className={inputCls}
                onBlur={(e) => onPatch("wall", wall.id, { thickness: num(e.target.value, wall.thickness, 0.05, 0.6) })} />
            </Row>
          </div>
          <button type="button" onClick={() => onSetAllWallHeight(wall.height)} className="btn-ghost w-full px-3 py-1.5 text-[11px]">
            Set all {analysis.walls.length} walls to {wall.height.toFixed(2)} m
          </button>
          <p className="text-[11px] text-[var(--muted)]">
            Length {Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y).toFixed(2)} m
          </p>
        </div>
      )}

      {roof !== undefined && (
        <div className="space-y-2">
          <Row label="Type">
            <select value={roof.type} onChange={(e) => onPatch("roof", "roof", { type: e.target.value })} className={inputCls}>
              {ROOF_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Pitch (°)">
              <input type="number" step="1" min={0} max={60} defaultValue={roof.pitch.toFixed(0)} key={`rp-${roof.pitch}`} className={inputCls}
                onBlur={(e) => onPatch("roof", "roof", { pitch: num(e.target.value, roof.pitch, 0, 60) })} />
            </Row>
            <Row label="Overhang (m)">
              <input type="number" step="0.05" min={0} max={2} defaultValue={roof.overhang.toFixed(2)} key={`ro-${roof.overhang}`} className={inputCls}
                onBlur={(e) => onPatch("roof", "roof", { overhang: num(e.target.value, roof.overhang, 0, 2) })} />
            </Row>
          </div>
          <Row label="Material">
            <select value={roof.material} onChange={(e) => onPatch("roof", "roof", { material: e.target.value })} className={inputCls}>
              {ROOF_MATS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Row>
          <Row label="Color">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(roof.color) ? roof.color : "#4a4a4a"}
              onChange={(e) => onPatch("roof", "roof", { color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded-md border border-[var(--border)] bg-black/30" />
          </Row>
        </div>
      )}

      {furn !== undefined && (
        <div className="space-y-2">
          <Row label="Type">
            <select value={furn.type} onChange={(e) => onPatch("furniture", furn.id, { type: e.target.value })} className={inputCls}>
              {FURN_TYPES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Row>
          <Row label="Rotation">
            <select value={furn.rotation} onChange={(e) => onPatch("furniture", furn.id, { rotation: Number(e.target.value) })} className={inputCls}>
              {[0, 90, 180, 270].map((r) => (
                <option key={r} value={r}>{r}°</option>
              ))}
            </select>
          </Row>
          <div className="grid grid-cols-3 gap-2">
            <Row label="W (m)">
              <input type="number" step="0.05" min={0.15} max={5} defaultValue={furn.width.toFixed(2)} key={`fw-${furn.width}`} className={inputCls}
                onBlur={(e) => onPatch("furniture", furn.id, { width: num(e.target.value, furn.width, 0.15, 5) })} />
            </Row>
            <Row label="D (m)">
              <input type="number" step="0.05" min={0.15} max={5} defaultValue={furn.depth.toFixed(2)} key={`fd-${furn.depth}`} className={inputCls}
                onBlur={(e) => onPatch("furniture", furn.id, { depth: num(e.target.value, furn.depth, 0.15, 5) })} />
            </Row>
            <Row label="H (m)">
              <input type="number" step="0.05" min={0.15} max={3} defaultValue={furn.height.toFixed(2)} key={`fh-${furn.height}`} className={inputCls}
                onBlur={(e) => onPatch("furniture", furn.id, { height: num(e.target.value, furn.height, 0.15, 3) })} />
            </Row>
          </div>
          {furn.evidence && <p className="text-[11px] text-[var(--muted)]">Detected as: {furn.evidence}</p>}
          <button type="button" onClick={() => onDeleteFurniture(furn.id)} className="btn-ghost w-full px-3 py-1.5 text-xs text-red-300">
            Remove this item
          </button>
        </div>
      )}

      {(door !== undefined || win !== undefined) && (
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          {((door !== undefined && isOpenable("door", door.style)) || (win !== undefined && isOpenable("window", win.style))) ? (
            <button type="button" onClick={onToggleOpen} className="btn-ghost w-full px-3 py-2 text-xs font-semibold">
              {open ? "Close it" : "Open it"}
            </button>
          ) : (
            <p className="text-[11px] text-[var(--muted)]">This {door !== undefined ? door.style : win?.style} style is fixed and does not open.</p>
          )}
          <button type="button" disabled={recLoading} onClick={runRecommend} className="btn-primary w-full px-3 py-2 text-xs">
            {recLoading ? "Asking Muse…" : `Recommend the right ${door !== undefined ? "door" : "window"} for this opening`}
          </button>
          {recError && <p className="text-[11px] text-red-300">{recError}</p>}
          {rec && (
            <div className="rounded-lg border border-[var(--border)] p-2.5">
              <p className="text-xs text-[var(--muted)]">{rec.reason}</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Suggests: {Object.entries(rec.patch).map(([k, v]) => `${k} ${v}`).join(" · ")} ({rec.model})
              </p>
              <button
                type="button"
                onClick={() => onPatch(selection.kind, selection.id, rec.patch)}
                className="btn-ghost mt-2 w-full px-3 py-1.5 text-xs"
              >
                Apply suggestion
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {onResume && (
          <button type="button" onClick={() => { onClose(); onResume(); }} className="btn-primary flex-1 px-3 py-1.5 text-xs">
            Resume walking
          </button>
        )}
        <button type="button" onClick={onClose} className="btn-ghost flex-1 px-3 py-1.5 text-xs">
          Close
        </button>
      </div>
    </div>
  );
}
