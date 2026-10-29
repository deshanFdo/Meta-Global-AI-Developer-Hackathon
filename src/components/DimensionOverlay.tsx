'use client';

import React from 'react';
import { Html, Line } from '@react-three/drei';
import type { HouseAnalysis } from '@/types';

interface DimensionOverlayProps {
  analysis: HouseAnalysis;
  visible: boolean;
}

export default function DimensionOverlay({ analysis, visible }: DimensionOverlayProps) {
  if (!visible || !analysis) return null;

  const w = analysis.metadata.overallWidth;
  const d = analysis.metadata.overallDepth;
  const halfW = w / 2;
  const halfD = d / 2;
  const elevation = 0.05;

  // CAD Dimension Line Style
  const dimColor = '#38bdf8'; // Sky blue CAD dimension color
  const tickLength = 0.35;

  // Outer dimension offsets
  const southDimZ = halfD + 1.2;
  const westDimX = -halfW - 1.2;

  return (
    <group name="DimensionOverlay">
      {/* ======================================================== */}
      {/* 1. OVERALL WIDTH (14.81m) along South                    */}
      {/* ======================================================== */}
      {/* Dimension Line */}
      <Line
        points={[
          [-halfW, elevation, southDimZ],
          [halfW, elevation, southDimZ],
        ]}
        color={dimColor}
        lineWidth={1.5}
      />
      {/* Left Witness & Tick */}
      <Line
        points={[
          [-halfW, elevation, halfD + 0.1],
          [-halfW, elevation, southDimZ + 0.4],
        ]}
        color={dimColor}
        lineWidth={1}
      />
      <Line
        points={[
          [-halfW - tickLength / 2, elevation, southDimZ - tickLength / 2],
          [-halfW + tickLength / 2, elevation, southDimZ + tickLength / 2],
        ]}
        color={dimColor}
        lineWidth={2}
      />
      {/* Right Witness & Tick */}
      <Line
        points={[
          [halfW, elevation, halfD + 0.1],
          [halfW, elevation, southDimZ + 0.4],
        ]}
        color={dimColor}
        lineWidth={1}
      />
      <Line
        points={[
          [halfW - tickLength / 2, elevation, southDimZ - tickLength / 2],
          [halfW + tickLength / 2, elevation, southDimZ + tickLength / 2],
        ]}
        color={dimColor}
        lineWidth={2}
      />
      {/* Metric Label */}
      <Html position={[0, elevation + 0.2, southDimZ]} center distanceFactor={16}>
        <div className="bg-[#0b1329]/90 border border-sky-400/50 rounded-md px-2 py-0.5 text-center shadow-lg pointer-events-none select-none">
          <p className="text-[10px] font-mono font-bold text-sky-300 whitespace-nowrap">
            {w.toFixed(2)} m (14 810 mm)
          </p>
        </div>
      </Html>

      {/* ======================================================== */}
      {/* 2. OVERALL DEPTH (11.30m) along West                     */}
      {/* ======================================================== */}
      <Line
        points={[
          [westDimX, elevation, -halfD],
          [westDimX, elevation, halfD],
        ]}
        color={dimColor}
        lineWidth={1.5}
      />
      {/* North Witness & Tick */}
      <Line
        points={[
          [-halfW - 0.1, elevation, -halfD],
          [westDimX - 0.4, elevation, -halfD],
        ]}
        color={dimColor}
        lineWidth={1}
      />
      <Line
        points={[
          [westDimX - tickLength / 2, elevation, -halfD - tickLength / 2],
          [westDimX + tickLength / 2, elevation, -halfD + tickLength / 2],
        ]}
        color={dimColor}
        lineWidth={2}
      />
      {/* South Witness & Tick */}
      <Line
        points={[
          [-halfW - 0.1, elevation, halfD],
          [westDimX - 0.4, elevation, halfD],
        ]}
        color={dimColor}
        lineWidth={1}
      />
      <Line
        points={[
          [westDimX - tickLength / 2, elevation, halfD - tickLength / 2],
          [westDimX + tickLength / 2, elevation, halfD + tickLength / 2],
        ]}
        color={dimColor}
        lineWidth={2}
      />
      {/* Metric Label */}
      <Html position={[westDimX, elevation + 0.2, 0]} center distanceFactor={16}>
        <div className="bg-[#0b1329]/90 border border-sky-400/50 rounded-md px-2 py-0.5 text-center shadow-lg pointer-events-none select-none">
          <p className="text-[10px] font-mono font-bold text-sky-300 whitespace-nowrap">
            {d.toFixed(2)} m (11 300 mm)
          </p>
        </div>
      </Html>

      {/* ======================================================== */}
      {/* 3. SEGMENTED FRONT DIMENSIONS (2.98m + 6.64m + 5.19m)    */}
      {/* ======================================================== */}
      {/* Segment 1: Hallway (2.98m) */}
      <Html position={[-halfW + 1.49, elevation + 0.2, southDimZ + 0.8]} center distanceFactor={18}>
        <div className="bg-[#0b1329]/80 border border-sky-400/30 rounded px-1.5 py-0.5 text-center pointer-events-none select-none">
          <p className="text-[9px] font-mono text-sky-200">2.98 m</p>
        </div>
      </Html>
      {/* Segment 2: Living/Terrace (6.64m) */}
      <Html position={[-halfW + 2.98 + 3.32, elevation + 0.2, southDimZ + 0.8]} center distanceFactor={18}>
        <div className="bg-[#0b1329]/80 border border-sky-400/30 rounded px-1.5 py-0.5 text-center pointer-events-none select-none">
          <p className="text-[9px] font-mono text-sky-200">6.64 m</p>
        </div>
      </Html>
      {/* Segment 3: Bedroom Wing (5.19m) */}
      <Html position={[halfW - 2.595, elevation + 0.2, southDimZ + 0.8]} center distanceFactor={18}>
        <div className="bg-[#0b1329]/80 border border-sky-400/30 rounded px-1.5 py-0.5 text-center pointer-events-none select-none">
          <p className="text-[9px] font-mono text-sky-200">5.19 m</p>
        </div>
      </Html>
    </group>
  );
}

