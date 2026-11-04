"use client";

import React, { useState } from "react";
import type { SamMatch } from "@/types";

const CONCEPT_COLORS = ["#f43f5e", "#22d3ee", "#a3e635", "#fbbf24", "#c084fc", "#fb923c"];

/** Source plan image with SAM 3.1 segmentation boxes overlaid (verification view). */
export default function SamOverlay({ image, matches }: { image: string | null; matches: SamMatch[] }): React.JSX.Element {
  const [showBoxes, setShowBoxes] = useState(true);

  if (!image) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
        Upload a plan or load a sample, then run verification to see what SAM segments.
      </div>
    );
  }

  const byConcept = new Map<string, number>();
  for (const m of matches) {
    if (!byConcept.has(m.concept)) byConcept.set(m.concept, byConcept.size % CONCEPT_COLORS.length);
  }
  const colorFor = (concept: string): string => CONCEPT_COLORS[byConcept.get(concept) ?? 0];
  const viewW = matches.length > 0 ? matches[0].box.w : 100;
  const viewH = matches.length > 0 ? matches[0].box.h : 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">Source plan{matches.length > 0 ? " with SAM 3.1 boxes" : ""}</p>
        {matches.length > 0 && (
          <label className="flex cursor-pointer items-center gap-1 text-xs text-[var(--muted)]">
            <input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} />
            Boxes ({matches.length})
          </label>
        )}
      </div>
      <div className="relative overflow-hidden rounded-lg border border-[var(--border)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Source floor plan" className="block h-auto w-full bg-white" />
        {showBoxes && matches.length > 0 && (
          <svg
            viewBox={`0 0 ${viewW} ${viewH}`}
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
                  strokeWidth={Math.max(2, viewW / 400)}
                />
                <text x={m.box.x1 + 4} y={Math.max(12, m.box.y1 - 4)} fontSize={Math.max(11, viewW / 70)} fill={colorFor(m.concept)}>
                  {m.concept}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        Boxes are in source-image pixels. SVG samples are rasterized before segmenting.
      </p>
    </div>
  );
}
