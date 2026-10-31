"use client";

import React, { useState } from "react";
import type { HouseAnalysis, SamMatch } from "@/types";

interface Props {
  /** Raster image the reconstruction (and SAM boxes) are compared against. */
  displayImage: string | null;
  analysis: HouseAnalysis | null;
  matches: SamMatch[];
}

function Reconstruction({ analysis, idPrefix }: { analysis: HouseAnalysis; idPrefix: string }): React.JSX.Element {
  const { overallWidth: w, overallDepth: d } = analysis.metadata;
  return (
    <svg viewBox={`0 0 ${w} ${d}`} className="h-auto w-full bg-[#f4f1ea]" role="img" aria-label="Reconstructed 2D plan">
      {analysis.rooms.map((r, i) => (
        <polygon
          key={`${idPrefix}-room-${r.id}`}
          points={r.vertices.map((v) => `${v.x},${v.y}`).join(" ")}
          fill={i % 2 === 0 ? "#e7e0d0" : "#ded6c4"}
          stroke="#8a8578"
          strokeWidth={0.03}
        />
      ))}
      {analysis.walls.map((wl) => (
        <line
          key={`${idPrefix}-${wl.id}`}
          x1={wl.start.x}
          y1={wl.start.y}
          x2={wl.end.x}
          y2={wl.end.y}
          stroke={wl.isExterior ? "#1f2937" : "#6b7280"}
          strokeWidth={Math.max(wl.thickness, 0.07)}
          strokeLinecap="round"
        />
      ))}
      {analysis.doors.map((dr) => (
        <circle key={`${idPrefix}-${dr.id}`} cx={dr.position.x} cy={dr.position.y} r={Math.max(dr.width / 2, 0.18)} fill="#16a34a" opacity={0.85} />
      ))}
      {analysis.windows.map((wn) => (
        <line
          key={`${idPrefix}-${wn.id}`}
          x1={wn.position.x - wn.width / 2}
          y1={wn.position.y}
          x2={wn.position.x + wn.width / 2}
          y2={wn.position.y}
          stroke="#2563eb"
          strokeWidth={0.14}
          strokeLinecap="round"
        />
      ))}
      {(analysis.furniture ?? []).map((f) => (
        <rect
          key={`${idPrefix}-${f.id}`}
          x={f.position.x - f.width / 2}
          y={f.position.y - f.depth / 2}
          width={f.width}
          height={f.depth}
          fill="none"
          stroke="#b45309"
          strokeWidth={0.05}
        />
      ))}
      {analysis.rooms.map((r) => {
        const cx = r.vertices.reduce((s, v) => s + v.x, 0) / r.vertices.length;
        const cy = r.vertices.reduce((s, v) => s + v.y, 0) / r.vertices.length;
        return (
          <text key={`${idPrefix}-label-${r.id}`} x={cx} y={cy} textAnchor="middle" fontSize={0.34} fill="#44403c">
            {r.name}
          </text>
        );
      })}
    </svg>
  );
}

const CONCEPT_COLORS = ["#f43f5e", "#22d3ee", "#a3e635", "#fbbf24", "#c084fc", "#fb923c"];

export default function PlanCompare({ displayImage, analysis, matches }: Props): React.JSX.Element {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [showSam, setShowSam] = useState(true);

  if (!analysis || !displayImage) {
    return (
      <div className="panel flex h-full min-h-[220px] items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
        Upload a plan or load a sample to compare the source image against the extracted 2D reconstruction.
      </div>
    );
  }

  const byConcept = new Map<string, number>();
  matches.forEach((m, i) => {
    if (!byConcept.has(m.concept)) byConcept.set(m.concept, byConcept.size % CONCEPT_COLORS.length);
    void i;
  });
  const colorFor = (concept: string): string => CONCEPT_COLORS[byConcept.get(concept) ?? 0];

  return (
    <div className="panel p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Source vs extracted 2D plan</h3>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm bg-[#1f2937]" /> exterior
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#16a34a]" /> door
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm bg-[#2563eb]" /> window
          </span>
          {matches.length > 0 && (
            <label className="flex cursor-pointer items-center gap-1">
              <input type="checkbox" checked={showSam} onChange={(e) => setShowSam(e.target.checked)} />
              SAM boxes ({matches.length})
            </label>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-[var(--muted)]">Source image{matches.length > 0 ? " with SAM 3.1 boxes" : ""}</p>
          <div className="relative overflow-hidden rounded-lg border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImage}
              alt="Source floor plan"
              className="block h-auto w-full bg-white"
              onLoad={(e) => {
                const img = e.currentTarget;
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
            {showSam && matches.length > 0 && natural && (
              <svg
                viewBox={`0 0 ${matches[0].box.w} ${matches[0].box.h}`}
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
                aria-label="SAM segmentation boxes"
              >
                {matches.map((m, i) => (
                  <g key={`${m.concept}-${m.ordinal}-${i}`}>
                    <rect
                      x={m.box.x1}
                      y={m.box.y1}
                      width={Math.max(1, m.box.x2 - m.box.x1)}
                      height={Math.max(1, m.box.y2 - m.box.y1)}
                      fill="none"
                      stroke={colorFor(m.concept)}
                      strokeWidth={Math.max(2, matches[0].box.w / 400)}
                    />
                    <text x={m.box.x1 + 4} y={Math.max(12, m.box.y1 - 4)} fontSize={Math.max(11, matches[0].box.w / 70)} fill={colorFor(m.concept)}>
                      {m.concept}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-[var(--muted)]">Reconstructed from Muse extraction (same scale both axes)</p>
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <Reconstruction analysis={analysis} idPrefix="cmp" />
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        The reconstruction is drawn from extracted meters, not aligned pixel-to-pixel with the source. SAM boxes are in
        source-image pixels; if the source was an SVG sample it was rasterized first.
      </p>
    </div>
  );
}
