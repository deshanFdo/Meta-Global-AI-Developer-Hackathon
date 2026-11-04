"use client";

import React from "react";

/** Full-viewer scanning animation shown over the source plan while AI analyzes it. */
export default function ScanOverlay({
  image,
  deep,
  elapsed,
}: {
  image: string;
  deep: boolean;
  elapsed: number;
}): React.JSX.Element {
  const stage = !deep
    ? "Reading plan with Muse Spark"
    : elapsed < 35
      ? "Pass 1/2 · tracing walls, doors and rooms"
      : "Pass 2/2 · auditing every symbol";
  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="Scanning floor plan" className="h-full w-full object-contain opacity-80" />
      <div className="scan-line" />
      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/80 to-transparent p-6 pb-5">
        <div className="rounded-xl border border-blue-500/30 bg-black/70 px-5 py-3 text-center">
          <p className="text-sm font-semibold text-white">{stage}</p>
          <p className="mt-0.5 text-[11px] text-white/60">
            {elapsed}s elapsed · complex plans take up to 3 minutes · results appear automatically
          </p>
        </div>
      </div>
    </div>
  );
}
