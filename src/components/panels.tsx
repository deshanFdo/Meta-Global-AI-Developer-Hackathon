"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisSource, EditTool, GeneratedTextures, HouseAnalysis, SamMatch } from "@/types";
import { estimateCost, type CostTier } from "@/lib/cost";
import { SAM_CONCEPTS } from "@/lib/sam";
import { deleteProject, listProjects, loadProject, saveProject } from "@/lib/project-store";
import { FURNITURE_CATALOG, type CatalogEntry } from "@/lib/furnish";
import type { CameraPreset, LightingMode } from "./Viewer3D";

// ---------------------------------------------------------------------------
// Build tab: editor tools, undo/redo, element lists
// ---------------------------------------------------------------------------

const TOOLS: Array<{ id: EditTool; label: string; hint: string }> = [
  { id: "select", label: "Select", hint: "Orbit, open doors and windows by clicking them." },
  { id: "move", label: "Move", hint: "Drag walls (openings ride along) or furniture." },
  { id: "add-wall", label: "Add wall", hint: "Click two floor points. Snaps to grid, 15° angles and existing endpoints." },
  { id: "add-door", label: "Add door", hint: "Click a wall where the door should go." },
  { id: "add-window", label: "Add window", hint: "Click a wall where the window should go." },
  { id: "add-furniture", label: "Add decor", hint: "Pick a piece below, then click the floor. R rotates." },
  { id: "measure", label: "Measure", hint: "Click two points for the distance. Right-click clears." },
];

export function BuildTab({
  analysis,
  tool,
  setTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  pendingFurniture,
  onPickFurniture,
}: {
  analysis: HouseAnalysis;
  tool: EditTool;
  setTool: (t: EditTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (kind: "wall" | "door" | "window" | "furniture", id: string) => void;
  pendingFurniture: CatalogEntry | null;
  onPickFurniture: (entry: CatalogEntry | null) => void;
}): React.JSX.Element {
  const active = TOOLS.find((t) => t.id === tool);
  const categories = Array.from(new Set(FURNITURE_CATALOG.map((c) => c.category)));
  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-2">
        <button type="button" disabled={!canUndo} onClick={onUndo} className="btn-ghost flex-1 px-3 py-1.5 text-xs">
          Undo
        </button>
        <button type="button" disabled={!canRedo} onClick={onRedo} className="btn-ghost flex-1 px-3 py-1.5 text-xs">
          Redo
        </button>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Tool</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={`btn-ghost px-2 py-1.5 text-xs ${tool === t.id ? "tab-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">{active?.hint}</p>
        {tool === "add-furniture" && (
          <div className="mt-2 space-y-2">
            {pendingFurniture && (
              <div className="flex items-center justify-between rounded-lg border border-[var(--accent)] bg-blue-500/10 px-2.5 py-1.5 text-xs">
                <span>Placing: {pendingFurniture.label}</span>
                <button type="button" onClick={() => onPickFurniture(null)} className="btn-ghost px-2 py-0.5 text-[11px]">
                  Done
                </button>
              </div>
            )}
            {categories.map((cat) => (
              <details key={cat} className="rounded-lg border border-[var(--border)]" open={cat === "Living"}>
                <summary className="cursor-pointer px-2.5 py-1.5 text-xs">{cat}</summary>
                <div className="grid grid-cols-2 gap-1.5 px-2.5 pb-2">
                  {FURNITURE_CATALOG.filter((c) => c.category === cat).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onPickFurniture(c)}
                      className={`btn-ghost px-2 py-1.5 text-left text-[11px] ${pendingFurniture?.id === c.id ? "tab-active" : ""}`}
                    >
                      <span className="block font-medium">{c.label}</span>
                      <span className="block text-[10px] text-[var(--muted)]">
                        {c.w.toFixed(1)}×{c.d.toFixed(1)} m
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Elements</h3>
        <div className="space-y-1.5 text-xs">
          <details className="rounded-lg border border-[var(--border)]">
            <summary className="cursor-pointer px-2.5 py-2">Walls ({analysis.walls.length})</summary>
            <div className="max-h-40 space-y-1 overflow-y-auto px-2.5 pb-2">
              {analysis.walls.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[var(--muted)]">
                    {w.id} · {Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y).toFixed(1)} m
                  </span>
                  <button type="button" onClick={() => onDelete("wall", w.id)} className="btn-ghost px-2 py-0.5 text-[11px] text-red-300" aria-label={`Delete ${w.id}`}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </details>
          <details className="rounded-lg border border-[var(--border)]">
            <summary className="cursor-pointer px-2.5 py-2">Doors ({analysis.doors.length})</summary>
            <div className="max-h-40 space-y-1 overflow-y-auto px-2.5 pb-2">
              {analysis.doors.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[var(--muted)]">
                    {d.id} · {d.style} · {d.width.toFixed(2)} m
                  </span>
                  <button type="button" onClick={() => onDelete("door", d.id)} className="btn-ghost px-2 py-0.5 text-[11px] text-red-300" aria-label={`Delete ${d.id}`}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </details>
          <details className="rounded-lg border border-[var(--border)]">
            <summary className="cursor-pointer px-2.5 py-2">Windows ({analysis.windows.length})</summary>
            <div className="max-h-40 space-y-1 overflow-y-auto px-2.5 pb-2">
              {analysis.windows.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[var(--muted)]">
                    {w.id} · {w.style} · {w.width.toFixed(2)} m
                  </span>
                  <button type="button" onClick={() => onDelete("window", w.id)} className="btn-ghost px-2 py-0.5 text-[11px] text-red-300" aria-label={`Delete ${w.id}`}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </details>
          <details className="rounded-lg border border-[var(--border)]">
            <summary className="cursor-pointer px-2.5 py-2">Furniture ({(analysis.furniture ?? []).length})</summary>
            <div className="max-h-40 space-y-1 overflow-y-auto px-2.5 pb-2">
              {(analysis.furniture ?? []).map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[var(--muted)]">
                    {f.type.replace(/_/g, " ")} · {f.width.toFixed(1)}×{f.depth.toFixed(1)} m
                  </span>
                  <button type="button" onClick={() => onDelete("furniture", f.id)} className="btn-ghost px-2 py-0.5 text-[11px] text-red-300" aria-label={`Delete ${f.id}`}>
                    Delete
                  </button>
                </div>
              ))}
              {(analysis.furniture ?? []).length === 0 && (
                <p className="text-[11px] text-[var(--muted)]">None yet — use Add decor above.</p>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan tab: measurements, rooms, assumptions, rough cost
// ---------------------------------------------------------------------------

export function PlanTab({
  analysis,
  source,
  model,
}: {
  analysis: HouseAnalysis;
  source: AnalysisSource;
  model: string;
}): React.JSX.Element {
  const [tier, setTier] = useState<CostTier>("standard");
  const { total, lines } = estimateCost(analysis, tier);
  const m = analysis.metadata;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1">
          Source:{" "}
          {source === "live"
            ? "live Muse inference"
            : source === "file"
              ? "project file / save"
              : source === "blank"
                ? "blank canvas"
                : "prebuilt sample (no inference)"}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1">Model: {model}</span>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1">
          Confidence: {(analysis.confidence * 100).toFixed(0)}% (model self-estimate)
        </span>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Overview</h3>
        <p>
          {m.style} · {m.floors} floor{m.floors === 1 ? "" : "s"} · {m.totalArea.toFixed(1)} m² · {m.overallWidth.toFixed(2)} ×{" "}
          {m.overallDepth.toFixed(2)} m · ceilings {m.wallHeight.toFixed(2)} m
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {analysis.walls.length} walls · {analysis.doors.length} doors · {analysis.windows.length} windows ·{" "}
          {analysis.rooms.length} rooms · {(analysis.furniture ?? []).length} furniture items · {analysis.staircases.length}{" "}
          stairs
        </p>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Rooms</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="py-1 pr-2 font-medium">Name</th>
              <th className="py-1 pr-2 font-medium">Type</th>
              <th className="py-1 text-right font-medium">Area</th>
            </tr>
          </thead>
          <tbody>
            {analysis.rooms.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="py-1 pr-2">{r.name}</td>
                <td className="py-1 pr-2 text-[var(--muted)]">{r.type.replace(/_/g, " ")}</td>
                <td className="py-1 text-right">{r.area.toFixed(1)} m²</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {analysis.notes.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Model notes</h3>
          <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
            {analysis.notes.map((n, i) => (
              // Notes come from the model; index keys are fine for a static list.
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Rough cost</h3>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as CostTier)}
            className="rounded-md border border-[var(--border)] bg-black/30 px-2 py-1 text-xs"
            aria-label="Finish tier"
          >
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {lines.map((l) => (
              <tr key={l.label} className="border-t border-[var(--border)]">
                <td className="py-1 pr-2">
                  {l.label} <span className="text-[var(--muted)]">({l.detail})</span>
                </td>
                <td className="py-1 text-right">${l.amount.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="border-t border-[var(--border)] font-semibold">
              <td className="py-1 pr-2">Planning total</td>
              <td className="py-1 text-right">${total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Placeholder rates for demo only. Not a quote.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ask tab: plan Q&A
// ---------------------------------------------------------------------------

export interface QaMessage {
  question: string;
  answer: string;
  source: string;
  model: string;
}

export function AskTab({
  messages,
  busy,
  onAsk,
}: {
  messages: QaMessage[];
  busy: boolean;
  onAsk: (question: string) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState("");
  const suggestions = [
    "What is the total area and room breakdown?",
    "Are the bedroom windows large enough for egress?",
    "Can I remove the wall between kitchen and living room?",
    "Will a king bed fit in the main bedroom?",
  ];

  return (
    <div className="space-y-3 text-sm">
      {messages.length === 0 && (
        <p className="text-xs text-[var(--muted)]">
          Ask about the extracted plan. Answers use Muse when the API key is configured, otherwise a labeled on-device
          geometry summary.
        </p>
      )}
      {messages.map((m, i) => (
        <div key={i} className="space-y-1 rounded-lg border border-[var(--border)] p-2.5">
          <p className="text-xs font-semibold">{m.question}</p>
          <p className="whitespace-pre-wrap text-xs text-[var(--muted)]">{m.answer}</p>
          <p className="text-[10px] text-[var(--muted)]">
            via {m.source} · {m.model}
          </p>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim() && !busy) {
              onAsk(draft.trim());
              setDraft("");
            }
          }}
          placeholder="Ask about this plan…"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => {
            onAsk(draft.trim());
            setDraft("");
          }}
          className="btn-primary px-4 py-2 text-sm"
        >
          {busy ? "…" : "Ask"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => onAsk(s)} className="btn-ghost px-2 py-1 text-[11px]">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Look tab: textures, lighting, view toggles
// ---------------------------------------------------------------------------

export function LookTab(props: {
  textures: GeneratedTextures;
  texBusy: string | null;
  onTexture: (kind: "facade" | "floor" | "roof") => void;
  onAllTextures: () => void;
  lighting: LightingMode;
  setLighting: (v: LightingMode) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (v: CameraPreset) => void;
  autoRotate: boolean;
  setAutoRotate: (v: boolean) => void;
  showRoof: boolean;
  setShowRoof: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showDimensions: boolean;
  setShowDimensions: (v: boolean) => void;
  sunHour: number | null;
  setSunHour: (v: number | null) => void;
  showScaleFigure: boolean;
  setShowScaleFigure: (v: boolean) => void;
}): React.JSX.Element {
  const {
    textures,
    texBusy,
    onTexture,
    onAllTextures,
    lighting,
    setLighting,
    cameraPreset,
    setCameraPreset,
    autoRotate,
    setAutoRotate,
    showRoof,
    setShowRoof,
    showLabels,
    setShowLabels,
    showDimensions,
    setShowDimensions,
    sunHour,
    setSunHour,
    showScaleFigure,
    setShowScaleFigure,
  } = props;

  const texRow = (kind: "facade" | "floor" | "roof", label: string): React.JSX.Element => (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs">
      <span>
        {label}{" "}
        <span className={textures[kind] ? "text-[var(--success)]" : "text-[var(--muted)]"}>
          {textures[kind] ? "· applied" : "· procedural color"}
        </span>
      </span>
      <button type="button" disabled={texBusy !== null} onClick={() => onTexture(kind)} className="btn-ghost px-2.5 py-1">
        {texBusy === kind ? "Working…" : "Generate"}
      </button>
    </div>
  );

  const toggle = (label: string, value: boolean, set: (v: boolean) => void): React.JSX.Element => (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs">
      {label}
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
    </label>
  );

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Muse Image textures</h3>
          <button type="button" disabled={texBusy !== null} onClick={onAllTextures} className="btn-ghost px-2 py-1 text-[11px]">
            {texBusy ? "Working…" : "Generate all three"}
          </button>
        </div>
        <div className="space-y-1.5">
          {texRow("facade", "Exterior walls")}
          {texRow("floor", "Floors")}
          {texRow("roof", "Roof")}
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Needs META_API_KEY. Textures tile across the 3D model.</p>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Lighting</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(["day", "golden", "night"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setLighting(m);
                setSunHour(null);
              }}
              className={`btn-ghost px-2 py-1.5 text-xs capitalize ${lighting === m && sunHour === null ? "tab-active" : ""}`}
            >
              {m === "golden" ? "Golden hour" : m}
            </button>
          ))}
        </div>
        <div className="mt-1.5 rounded-lg border border-[var(--border)] px-2.5 py-2">
          <div className="flex items-center justify-between text-xs">
            <span>Sun time {sunHour === null ? "" : `· ${String(Math.floor(sunHour)).padStart(2, "0")}:${sunHour % 1 === 0 ? "00" : "30"}`}</span>
            {sunHour !== null && (
              <button type="button" onClick={() => setSunHour(null)} className="btn-ghost px-2 py-0.5 text-[11px]">
                Back to preset
              </button>
            )}
          </div>
          <input
            type="range"
            min={6}
            max={20}
            step={0.5}
            value={sunHour ?? 13}
            onChange={(e) => setSunHour(Number(e.target.value))}
            className="mt-1 w-full"
            aria-label="Sun time of day"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Camera</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(["orbit", "top", "front"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setCameraPreset(m)}
              className={`btn-ghost px-2 py-1.5 text-xs capitalize ${cameraPreset === m ? "tab-active" : ""}`}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="mt-1.5 flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs">
          Cinematic auto-orbit
          <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
        </label>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Layers</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {toggle("Roof", showRoof, setShowRoof)}
          {toggle("Room labels", showLabels, setShowLabels)}
          {toggle("Dimensions", showDimensions, setShowDimensions)}
          {toggle("Scale figure", showScaleFigure, setShowScaleFigure)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verify tab: SAM 3.1 symbol grounding vs Spark extraction
// ---------------------------------------------------------------------------

export interface SparkCounts {
  bed: number;
  sofa: number;
  diningTable: number;
  bathtub: number;
  toilet: number;
  staircase: number;
}

export function VerifyTab({
  concepts,
  setConcepts,
  onRun,
  busy,
  matches,
  spark,
  canRun,
}: {
  concepts: string[];
  setConcepts: (v: string[]) => void;
  onRun: () => void;
  busy: boolean;
  matches: SamMatch[];
  spark: SparkCounts;
  canRun: boolean;
}): React.JSX.Element {
  const toggleConcept = (c: string): void => {
    setConcepts(concepts.includes(c) ? concepts.filter((x) => x !== c) : [...concepts, c]);
  };
  const samCount = (c: string): number => matches.filter((m) => m.concept === c).length;
  const sparkFor: Record<string, number> = {
    bed: spark.bed,
    sofa: spark.sofa,
    "dining table": spark.diningTable,
    bathtub: spark.bathtub,
    toilet: spark.toilet,
    staircase: spark.staircase,
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-[var(--muted)]">
        SAM 3.1 segments furniture symbols directly on the source image (one concept per request). Compare its counts
        with what Muse Spark extracted. Agreement raises confidence; disagreement flags a plan worth re-checking.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SAM_CONCEPTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => toggleConcept(c)}
            className={`btn-ghost px-2.5 py-1.5 text-xs ${concepts.includes(c) ? "tab-active" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>
      <button type="button" disabled={busy || !canRun || concepts.length === 0} onClick={onRun} className="btn-primary w-full px-4 py-2 text-sm">
        {busy ? "Segmenting…" : `Run SAM verification (${concepts.length} concept${concepts.length === 1 ? "" : "s"})`}
      </button>
      {!canRun && (
        <p className="text-[11px] text-[var(--muted)]">SAM verification needs META_API_KEY on the server.</p>
      )}
      {matches.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="py-1 pr-2 font-medium">Concept</th>
              <th className="py-1 pr-2 text-right font-medium">SAM boxes</th>
              <th className="py-1 text-right font-medium">Spark items</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(matches.map((m) => m.concept))).map((c) => (
              <tr key={c} className="border-t border-[var(--border)]">
                <td className="py-1 pr-2">{c}</td>
                <td className="py-1 pr-2 text-right">{samCount(c)}</td>
                <td className="py-1 text-right">{sparkFor[c] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export tab: model files, view snapshot, project save/load
// ---------------------------------------------------------------------------

export function ExportTab({
  onGLB,
  onDXF,
  onCSV,
  busy,
  project,
  onImportProject,
}: {
  onGLB: () => void;
  onDXF: () => void;
  onCSV: () => void;
  busy: boolean;
  project: { analysis: HouseAnalysis; open: Record<string, boolean>; source: AnalysisSource };
  onImportProject: (data: { analysis: HouseAnalysis; open: Record<string, boolean>; source: AnalysisSource }) => void;
}): React.JSX.Element {
  const [saveName, setSaveName] = useState("");
  const [saves, setSaves] = useState<Array<{ name: string; savedAt: number }>>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setSaves(listProjects()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const snapshot = (): void => {
    const canvas = document.querySelector("#orbit-view canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setMsg("Open the orbit view first.");
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "blueprint3d-view.png";
      link.click();
      setMsg(null);
    } catch {
      setMsg("Snapshot failed in this browser.");
    }
  };

  const exportProject = (): void => {
    const blob = new Blob(
      [JSON.stringify({ version: 1, savedAt: Date.now(), analysis: project.analysis, open: project.open, source: project.source })],
      { type: "application/json" }
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "blueprint3d-project.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  };

  const importProjectFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as {
          analysis?: HouseAnalysis;
          open?: Record<string, boolean>;
          source?: AnalysisSource;
        };
        if (!data.analysis || !Array.isArray(data.analysis.walls) || !data.analysis.metadata) {
          throw new Error("bad file");
        }
        onImportProject({
          analysis: data.analysis,
          open: data.open && typeof data.open === "object" ? data.open : {},
          source: data.source === "live" || data.source === "sample" || data.source === "file" ? data.source : "file",
        });
        setMsg(null);
      } catch {
        setMsg("That file is not a BlueprintTo3D project.");
      }
    };
    reader.onerror = () => setMsg("Could not read that file.");
    reader.readAsText(file);
  };

  const saveNamed = (): void => {
    const name = saveName.trim() || `Project ${saves.length + 1}`;
    const ok = saveProject(name, { analysis: project.analysis, open: project.open, source: project.source });
    setMsg(ok ? `Saved “${name}” in this browser.` : "Browser storage is full — export a file instead.");
    if (ok) {
      setSaveName("");
      refresh();
    }
  };

  return (
    <div className="space-y-2 text-sm">
      <button type="button" disabled={busy} onClick={onGLB} className="btn-primary w-full px-4 py-2">
        {busy ? "Exporting…" : "Download 3D model (.glb)"}
      </button>
      <button type="button" disabled={busy} onClick={onDXF} className="btn-ghost w-full px-4 py-2">
        Download CAD plan (.dxf)
      </button>
      <button type="button" disabled={busy} onClick={onCSV} className="btn-ghost w-full px-4 py-2">
        Download schedules (.csv)
      </button>
      <button type="button" onClick={snapshot} className="btn-ghost w-full px-4 py-2">
        Snapshot current view (.png)
      </button>
      <div className="border-t border-[var(--border)] pt-2">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Project file</h3>
        <div className="flex gap-2">
          <button type="button" onClick={exportProject} className="btn-ghost flex-1 px-3 py-1.5 text-xs">
            Export .json
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost flex-1 px-3 py-1.5 text-xs">
            Import .json
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importProjectFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className="border-t border-[var(--border)] pt-2">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Browser saves</h3>
        <div className="flex gap-2">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={`Project ${saves.length + 1}`}
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-1.5 text-xs"
          />
          <button type="button" onClick={saveNamed} className="btn-ghost px-3 py-1.5 text-xs">
            Save
          </button>
        </div>
        {saves.length > 0 ? (
          <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">
            {saves.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-[var(--muted)]">
                  {s.name} · {new Date(s.savedAt).toLocaleString()}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const loaded = loadProject(s.name);
                      if (loaded) {
                        onImportProject({ analysis: loaded.analysis, open: loaded.open, source: loaded.source });
                        setMsg(null);
                      } else setMsg("That save is corrupted.");
                    }}
                    className="btn-ghost px-2 py-0.5 text-[11px]"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteProject(s.name);
                      refresh();
                    }}
                    className="btn-ghost px-2 py-0.5 text-[11px] text-red-300"
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-[var(--muted)]">No saves yet. Your work also autosaves continuously.</p>
        )}
      </div>
      {msg && <p className="text-[11px] text-[var(--muted)]">{msg}</p>}
      <p className="text-[11px] text-[var(--muted)]">
        GLB opens in Blender, Windows 3D Viewer and most AR tools. DXF R12 opens in AutoCAD and free CAD viewers. All
        exports are generated locally in your browser.
      </p>
    </div>
  );
}
