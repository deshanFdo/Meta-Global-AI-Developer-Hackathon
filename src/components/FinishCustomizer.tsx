'use client';

import React, { useState } from 'react';
import type { HouseAnalysis } from '@/types';
import {
  WALL_FINISHES,
  FLOOR_FINISHES,
  TRIM_FINISHES,
  type WallFinishKey,
  type FloorFinishKey,
  type TrimFinishKey,
} from '@/lib/finish-library';
import {
  calculateProjectCost,
  exportCostEstimateCSV,
  type FinishSelectionState,
} from '@/lib/cost-engine';

interface FinishCustomizerProps {
  analysis: HouseAnalysis;
  finishes: FinishSelectionState;
  onChangeFinishes: (updated: FinishSelectionState) => void;
  isOpen: boolean;
  onClose: () => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export default function FinishCustomizer({
  analysis,
  finishes,
  onChangeFinishes,
  isOpen,
  onClose,
  selectedRoomId,
  onSelectRoom,
}: FinishCustomizerProps) {
  const [activeTab, setActiveTab] = useState<'materials' | 'cost_schedule'>('materials');

  if (!isOpen) return null;

  const costEstimate = calculateProjectCost(analysis, finishes);
  const activeRoom = analysis.rooms.find((r) => r.id === selectedRoomId);

  // Active finishes for currently selected room (or global default)
  const currentWall = (selectedRoomId ? finishes.roomOverrides[selectedRoomId]?.wall : null) || finishes.globalWall;
  const currentFloor = (selectedRoomId ? finishes.roomOverrides[selectedRoomId]?.floor : null) || finishes.globalFloor;
  const currentTrim = (selectedRoomId ? finishes.roomOverrides[selectedRoomId]?.trim : null) || finishes.globalTrim;

  const handleSelectWall = (key: WallFinishKey) => {
    if (selectedRoomId) {
      onChangeFinishes({
        ...finishes,
        roomOverrides: {
          ...finishes.roomOverrides,
          [selectedRoomId]: {
            ...finishes.roomOverrides[selectedRoomId],
            wall: key,
          },
        },
      });
    } else {
      onChangeFinishes({
        ...finishes,
        globalWall: key,
      });
    }
  };

  const handleSelectFloor = (key: FloorFinishKey) => {
    if (selectedRoomId) {
      onChangeFinishes({
        ...finishes,
        roomOverrides: {
          ...finishes.roomOverrides,
          [selectedRoomId]: {
            ...finishes.roomOverrides[selectedRoomId],
            floor: key,
          },
        },
      });
    } else {
      onChangeFinishes({
        ...finishes,
        globalFloor: key,
      });
    }
  };

  const handleSelectTrim = (key: TrimFinishKey) => {
    if (selectedRoomId) {
      onChangeFinishes({
        ...finishes,
        roomOverrides: {
          ...finishes.roomOverrides,
          [selectedRoomId]: {
            ...finishes.roomOverrides[selectedRoomId],
            trim: key,
          },
        },
      });
    } else {
      onChangeFinishes({
        ...finishes,
        globalTrim: key,
      });
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-slate-950/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-slide-left select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h2 className="text-sm font-bold text-white">BIM Finish Studio & Estimator</h2>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            PBR Material Swapper • Real-time Cost Estimation
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-slate-900/50 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('materials')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'materials'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎨 Material Palette
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cost_schedule')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'cost_schedule'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Cost Schedule (${Math.round(costEstimate.totalCostUSD).toLocaleString()})
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'materials' ? (
          <>
            {/* Target Scope: Entire House vs Specific Room */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Scope / Target Room
              </label>
              <select
                value={selectedRoomId || ''}
                onChange={(e) => onSelectRoom(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Entire House (Global Preset)</option>
                {analysis.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.area.toFixed(1)} m²)
                  </option>
                ))}
              </select>
              {activeRoom && (
                <p className="text-[10px] text-blue-400 mt-1">
                  Customizing finishes specifically for <strong>{activeRoom.name}</strong>
                </p>
              )}
            </div>

            {/* 1. Flooring Materials */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  1. Flooring Finish
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  ${FLOOR_FINISHES[currentFloor].unitCostUSD}/m²
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(FLOOR_FINISHES) as FloorFinishKey[]).map((key) => {
                  const opt = FLOOR_FINISHES[key];
                  const isSelected = currentFloor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectFloor(key)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/20 text-white shadow-md'
                          : 'border-white/5 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-lg border border-white/20 shadow-inner flex-shrink-0"
                          style={{ backgroundColor: opt.colorHex }}
                        />
                        <div>
                          <p className="text-xs font-semibold">{opt.name}</p>
                          <p className="text-[10px] text-gray-400">{opt.description}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-gray-300 font-medium">
                        ${opt.unitCostUSD}/m²
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Wall Pigment / Coverings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  2. Wall Color & Paint
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  ${WALL_FINISHES[currentWall].unitCostUSD}/m²
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(WALL_FINISHES) as WallFinishKey[]).map((key) => {
                  const opt = WALL_FINISHES[key];
                  const isSelected = currentWall === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectWall(key)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/20 text-white shadow-md'
                          : 'border-white/5 bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 shadow-inner flex-shrink-0"
                        style={{ backgroundColor: opt.colorHex }}
                      />
                      <div className="truncate">
                        <p className="text-[11px] font-semibold truncate">{opt.name}</p>
                        <p className="text-[9px] text-gray-400">${opt.unitCostUSD}/m²</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Trim, Door & Millwork Hardware */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  3. Hardware & Millwork Trim
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  ${TRIM_FINISHES[currentTrim].unitCostUSD}/m
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TRIM_FINISHES) as TrimFinishKey[]).map((key) => {
                  const opt = TRIM_FINISHES[key];
                  const isSelected = currentTrim === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectTrim(key)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/20 text-white shadow-md'
                          : 'border-white/5 bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-md border border-white/20 shadow-inner flex-shrink-0"
                        style={{ backgroundColor: opt.colorHex }}
                      />
                      <div className="truncate">
                        <p className="text-[11px] font-semibold truncate">{opt.name}</p>
                        <p className="text-[9px] text-gray-400">${opt.unitCostUSD}/m</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Cost Schedule & Quantity Takeoff */
          <div className="space-y-4">
            {/* Big summary card */}
            <div className="glass-strong rounded-2xl p-4 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Total Estimated Construction & Finish Cost
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">
                  ${Math.round(costEstimate.totalCostUSD).toLocaleString('en-US')}
                </span>
                <span className="text-xs text-gray-400">
                  (${costEstimate.costPerSquareMeterUSD.toFixed(1)}/m²)
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Based on {costEstimate.totalPremisesArea.toFixed(1)} m² conditioned area with selected PBR materials, framing, glazing, and MEP rough-ins.
              </p>
            </div>

            {/* Trade breakdown bars */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Cost Breakdown by Trade
              </p>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: 'Flooring Materials', val: costEstimate.flooringTotal, icon: '🪵' },
                  { label: 'Wall Paint & Surface', val: costEstimate.wallFinishTotal, icon: '🎨' },
                  { label: 'Trims, Doors & Hardware', val: costEstimate.trimTotal, icon: '🚪' },
                  { label: 'Fenestration & Glazing', val: costEstimate.glazingTotal, icon: '🪟' },
                  { label: 'MEP (Plumbing & Electrical)', val: costEstimate.mepTotal, icon: '⚡' },
                  { label: 'Framing & Drywall', val: costEstimate.framingTotal, icon: '🏗️' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-gray-300 flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono text-white font-semibold">
                      ${Math.round(item.val).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room by Room Table */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Room-by-Room Breakdown
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 text-xs font-mono">
                {costEstimate.rooms.map((r) => (
                  <div key={r.roomId} className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-sans font-semibold text-white text-[11px]">{r.roomName}</p>
                      <p className="text-[9px] text-gray-400 font-sans">
                        {r.floorArea.toFixed(1)} m² floor • {r.wallAreaNet.toFixed(1)} m² wall
                      </p>
                    </div>
                    <span className="text-emerald-400 font-bold text-xs">
                      ${Math.round(r.roomTotal).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={() => exportCostEstimateCSV(costEstimate, analysis.metadata.style)}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>📥</span>
              <span>Download Bill of Materials (.CSV)</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

