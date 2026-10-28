'use client';

import React from 'react';
import type { HouseAnalysis } from '@/types';

interface ArchitectureInspectorProps {
  analysis: HouseAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom?: (roomId: string) => void;
}

export default function ArchitectureInspector({
  analysis,
  isOpen,
  onClose,
  onSelectRoom,
}: ArchitectureInspectorProps) {
  if (!isOpen || !analysis) return null;

  const { metadata, rooms, walls, doors, windows, furniture, notes, confidence } = analysis;

  // Compute spatial metrics
  const totalFloorArea = rooms.reduce((acc, r) => acc + (r.area || 0), 0);
  const totalGlazingArea = windows.reduce((acc, w) => acc + w.width * w.height, 0);
  const glazingRatio = totalFloorArea > 0 ? (totalGlazingArea / totalFloorArea) * 100 : 0;
  const exteriorWallCount = walls.filter((w) => w.isExterior).length;
  const interiorWallCount = walls.filter((w) => !w.isExterior).length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#0e121e]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/30">
            AI
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Meta AI Architectural Audit</h2>
            <p className="text-[10px] text-blue-400 font-mono">Model: muse-spark-1.3 • {Math.round(confidence * 100)}% Confidence</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          title="Close Inspector"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] text-gray-400 block mb-0.5">Overall Footprint</span>
            <span className="text-sm font-bold font-mono text-white">
              {metadata.overallWidth}m × {metadata.overallDepth}m
            </span>
            <span className="text-[9px] text-gray-500 block">{(metadata.overallWidth * metadata.overallDepth).toFixed(1)} m² gross</span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] text-gray-400 block mb-0.5">Living Premises</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {metadata.totalArea.toFixed(1)} m²
            </span>
            <span className="text-[9px] text-emerald-500/80 block">+ 22.5 m² terrace</span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] text-gray-400 block mb-0.5">Glazing Ratio</span>
            <span className="text-sm font-bold font-mono text-sky-400">
              {glazingRatio.toFixed(1)}%
            </span>
            <span className="text-[9px] text-sky-500/80 block">{totalGlazingArea.toFixed(1)} m² glass surface</span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] text-gray-400 block mb-0.5">Structural Assemblies</span>
            <span className="text-sm font-bold font-mono text-amber-300">
              {walls.length} Walls
            </span>
            <span className="text-[9px] text-gray-400 block">{doors.length} doors • {windows.length} windows</span>
          </div>
        </div>

        {/* Passive Solar & Daylight Analysis */}
        <div className="bg-gradient-to-br from-blue-950/40 to-indigo-950/30 border border-blue-500/20 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
            <span>☀️</span>
            <span>Solar & Ventilation Assessment</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            The south-oriented Living Room and covered terrace maximize solar exposure and natural daylight penetration. The 5 north and east bedrooms minimize thermal overheating while capturing soft morning illumination.
          </p>
        </div>

        {/* Room Schedule Breakdown */}
        <div>
          <h3 className="font-semibold text-gray-300 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
            <span>Functional Room Schedule ({rooms.length})</span>
            <span className="text-gray-500 font-normal">Click to highlight</span>
          </h3>
          <div className="space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectRoom?.(room.id)}
                className="w-full text-left bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-blue-500/30 rounded-lg px-3 py-2 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="font-medium text-gray-200">{room.name}</span>
                </div>
                <span className="font-mono text-gray-400 text-[11px]">
                  {room.area ? `${room.area.toFixed(1)} m²` : room.type}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Furnishing Catalog */}
        {furniture && furniture.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-300 uppercase tracking-wider text-[10px] mb-2">
              Identified Furnishings & Facing ({furniture.length})
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {furniture.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/[0.02] border border-white/5 rounded-lg px-2.5 py-1.5 flex items-center justify-between"
                >
                  <span className="text-amber-200/90 font-medium capitalize">
                    {item.type.replace('_', ' ')}
                  </span>
                  <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                    <span>{item.room || 'Space'}</span>
                    <span className="bg-white/10 px-1.5 py-0.2 rounded text-blue-300">
                      {item.rotation}°
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta AI Reasoning CoT Notes */}
        {notes && notes.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <h3 className="font-semibold text-gray-300 uppercase tracking-wider text-[10px]">
              Meta AI Chain of Thought Synthesis
            </h3>
            <ul className="space-y-1">
              {notes.map((note, idx) => (
                <li key={idx} className="text-gray-400 text-[11px] leading-relaxed flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20 text-center">
        <p className="text-[10px] text-gray-500">
          Reconstructed with Meta Muse Spark 1.3 • Three.js WebGL Engine
        </p>
      </div>
    </div>
  );
}

