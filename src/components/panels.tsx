"use client";

import React, { useState } from "react";
import type { AnalysisSource, GeneratedTextures, HouseAnalysis, SamMatch } from "@/types";
import { estimateCost, type CostTier } from "@/lib/cost";
import { SAM_CONCEPTS } from "@/lib/sam";
import type { CameraPreset, LightingMode } from "./Viewer3D";

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
          Source: {source === "live" ? "live Muse inference" : "prebuilt sample (no inference)"}
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
  showRoof: boolean;
  setShowRoof: (v: boolean) => void;
  showFurniture: boolean;
  setShowFurniture: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showDimensions: boolean;
  setShowDimensions: (v: boolean) => void;
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
    showRoof,
    setShowRoof,
    showFurniture,
    setShowFurniture,
    showLabels,
    setShowLabels,
    showDimensions,
    setShowDimensions,
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
              onClick={() => setLighting(m)}
              className={`btn-ghost px-2 py-1.5 text-xs capitalize ${lighting === m ? "tab-active" : ""}`}
            >
              {m === "golden" ? "Golden hour" : m}
            </button>
          ))}
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
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Layers</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {toggle("Roof", showRoof, setShowRoof)}
          {toggle("Furniture", showFurniture, setShowFurniture)}
          {toggle("Room labels", showLabels, setShowLabels)}
          {toggle("Dimensions", showDimensions, setShowDimensions)}
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
// Export tab
// ---------------------------------------------------------------------------

export function ExportTab({
  onGLB,
  onDXF,
  onCSV,
  busy,
}: {
  onGLB: () => void;
  onDXF: () => void;
  onCSV: () => void;
  busy: boolean;
}): React.JSX.Element {
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
      <p className="text-[11px] text-[var(--muted)]">
        GLB opens in Blender, Windows 3D Viewer and most AR tools. DXF R12 opens in AutoCAD and free CAD viewers. All
        exports are generated locally in your browser.
      </p>
    </div>
  );
}
