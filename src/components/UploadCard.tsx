"use client";

import React, { useRef, useState } from "react";

export type ArchetypeKind = "villa" | "loft" | "eco_cabin";

interface Props {
  onFile: (file: File) => void;
  onSample: (kind: ArchetypeKind) => void;
  onBlank: () => void;
  busy: boolean;
  deep: boolean;
  setDeep: (v: boolean) => void;
}

const SAMPLES: Array<{ kind: ArchetypeKind; title: string; detail: string }> = [
  { kind: "villa", title: "Nordic Villa", detail: "122.4 m² · 4 bed · 2 bath" },
  { kind: "loft", title: "Urban Loft", detail: "74.0 m² · open plan · island" },
  { kind: "eco_cabin", title: "Eco Cabin", detail: "42.0 m² · timber · deck" },
];

export default function UploadCard({ onFile, onSample, onBlank, busy, deep, setDeep }: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="panel p-4">
      <h2 className="mb-1 text-sm font-semibold">Floor plan input</h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Upload a PNG, JPEG or WebP plan (max 10 MB) for live Muse analysis, or load a labeled sample.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) onFile(file);
        }}
        className={`block w-full rounded-lg border border-dashed px-4 py-6 text-center text-sm transition-colors ${
          dragging ? "border-[var(--accent)] bg-blue-500/10" : "border-[var(--border)] bg-white/[0.02]"
        }`}
      >
        {busy ? "Working…" : "Drop a plan image here, or click to browse"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
        <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} disabled={busy} />
        Deep furniture pass (second Muse audit — slower, catches missed/hallucinated items)
      </label>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {SAMPLES.map((s) => (
          <button key={s.kind} type="button" disabled={busy} onClick={() => onSample(s.kind)} className="btn-ghost px-2 py-2 text-left">
            <span className="block text-xs font-semibold">{s.title}</span>
            <span className="block text-[10px] text-[var(--muted)]">{s.detail}</span>
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={onBlank} className="btn-ghost mt-2 w-full px-2 py-2 text-xs">
        Start from a blank canvas instead
      </button>
    </div>
  );
}
