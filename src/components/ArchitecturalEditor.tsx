'use client';

import React, { useState, useId } from 'react';
import type {
  HouseAnalysis,
  Wall,
  Door,
  Window,
  Roof,
  Room,
  WallMaterial,
  RoomType,
  FurnitureType,
  FurnitureItem,
} from '@/types';

interface ArchitecturalEditorProps {
  analysis: HouseAnalysis;
  selectedElementId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectElement: (id: string | null) => void;
  onUpdateAnalysis: (updated: HouseAnalysis) => void;
}

export default function ArchitecturalEditor({
  analysis,
  selectedElementId,
  isOpen,
  onClose,
  onSelectElement,
  onUpdateAnalysis,
}: ArchitecturalEditorProps) {
  const [activeTab, setActiveTab] = useState<'customize' | 'build' | 'global'>('customize');
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  if (!isOpen) return null;

  // Resolve currently selected element
  const selectedWall = analysis.walls.find((w) => w.id === selectedElementId || `wall_${w.id}` === selectedElementId);
  const selectedDoor = analysis.doors.find((d) => d.id === selectedElementId || `door_${d.id}` === selectedElementId);
  const selectedWindow = analysis.windows.find((w) => w.id === selectedElementId || `window_${w.id}` === selectedElementId);
  const selectedRoom = analysis.rooms.find((r) => r.id === selectedElementId || `floor_${r.id}` === selectedElementId);
  const isRoofSelected = selectedElementId === 'Roof' || selectedElementId === 'roof' || selectedElementId?.startsWith('roof_');

  // --- Handlers for Wall Updates ---
  const handleUpdateWall = (updates: Partial<Wall>) => {
    if (!selectedWall) return;
    const updatedWalls = analysis.walls.map((w) => (w.id === selectedWall.id ? { ...w, ...updates } : w));
    onUpdateAnalysis({ ...analysis, walls: updatedWalls });
    notify(`Updated Wall ${selectedWall.id}`);
  };

  const handleDeleteWall = () => {
    if (!selectedWall) return;
    const updatedWalls = analysis.walls.filter((w) => w.id !== selectedWall.id);
    // Also remove orphaned doors and windows on this wall
    const updatedDoors = analysis.doors.filter((d) => d.wallId !== selectedWall.id);
    const updatedWindows = analysis.windows.filter((w) => w.wallId !== selectedWall.id);
    onUpdateAnalysis({
      ...analysis,
      walls: updatedWalls,
      doors: updatedDoors,
      windows: updatedWindows,
    });
    onSelectElement(null);
    notify(`Removed Wall ${selectedWall.id}`);
  };

  // --- Handlers for Door Updates ---
  const handleUpdateDoor = (updates: Partial<Door>) => {
    if (!selectedDoor) return;
    const updatedDoors = analysis.doors.map((d) => (d.id === selectedDoor.id ? { ...d, ...updates } : d));
    onUpdateAnalysis({ ...analysis, doors: updatedDoors });
    notify(`Updated Door ${selectedDoor.id}`);
  };

  const handleDeleteDoor = () => {
    if (!selectedDoor) return;
    const updatedDoors = analysis.doors.filter((d) => d.id !== selectedDoor.id);
    onUpdateAnalysis({ ...analysis, doors: updatedDoors });
    onSelectElement(null);
    notify(`Removed Door ${selectedDoor.id}`);
  };

  // --- Handlers for Window Updates ---
  const handleUpdateWindow = (updates: Partial<Window>) => {
    if (!selectedWindow) return;
    const updatedWindows = analysis.windows.map((w) => (w.id === selectedWindow.id ? { ...w, ...updates } : w));
    onUpdateAnalysis({ ...analysis, windows: updatedWindows });
    notify(`Updated Window ${selectedWindow.id}`);
  };

  const handleDeleteWindow = () => {
    if (!selectedWindow) return;
    const updatedWindows = analysis.windows.filter((w) => w.id !== selectedWindow.id);
    onUpdateAnalysis({ ...analysis, windows: updatedWindows });
    onSelectElement(null);
    notify(`Removed Window ${selectedWindow.id}`);
  };

  // --- Handlers for Roof Updates ---
  const handleUpdateRoof = (updates: Partial<Roof>) => {
    onUpdateAnalysis({
      ...analysis,
      roof: { ...analysis.roof, ...updates },
    });
    notify(`Updated Roof properties`);
  };

  // --- Handlers for Room Updates ---
  const handleUpdateRoom = (updates: Partial<Room>) => {
    if (!selectedRoom) return;
    const updatedRooms = analysis.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, ...updates } : r));
    onUpdateAnalysis({ ...analysis, rooms: updatedRooms });
    notify(`Updated Room ${selectedRoom.name}`);
  };

  // --- Build Mode: Add New Elements ---
  const handleAddWall = () => {
    const newId = `wall-${Date.now().toString(36)}`;
    const centerX = analysis.metadata.overallWidth / 2;
    const centerZ = analysis.metadata.overallDepth / 2;

    const newWall: Wall = {
      id: newId,
      start: { x: Math.max(1, centerX - 2), y: centerZ },
      end: { x: Math.min(analysis.metadata.overallWidth - 1, centerX + 2), y: centerZ },
      thickness: 0.15,
      height: analysis.metadata.wallHeight || 2.8,
      material: 'drywall',
      color: '#F5F5F0',
      isExterior: false,
    };

    onUpdateAnalysis({
      ...analysis,
      walls: [...analysis.walls, newWall],
    });
    onSelectElement(newId);
    notify('Added new interior partition wall');
  };

  const handleAddDoorToWall = (targetWallId: string) => {
    const wall = analysis.walls.find((w) => w.id === targetWallId);
    if (!wall) return;

    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    const newDoorId = `door-${Date.now().toString(36)}`;

    const newDoor: Door = {
      id: newDoorId,
      position: { x: midX, y: midY },
      width: 0.9,
      height: 2.1,
      wallId: wall.id,
      style: 'single',
      swingDirection: 'inward',
      material: 'wood',
      color: '#8B6914',
    };

    onUpdateAnalysis({
      ...analysis,
      doors: [...analysis.doors, newDoor],
    });
    onSelectElement(newDoorId);
    notify(`Added Door to ${wall.id}`);
  };

  const handleAddWindowToWall = (targetWallId: string) => {
    const wall = analysis.walls.find((w) => w.id === targetWallId);
    if (!wall) return;

    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    const newWinId = `win-${Date.now().toString(36)}`;

    const newWindow: Window = {
      id: newWinId,
      position: { x: midX, y: midY },
      width: 1.4,
      height: 1.4,
      sillHeight: 0.9,
      wallId: wall.id,
      style: 'double-hung',
      panes: 2,
      material: 'vinyl',
      color: '#FFFFFF',
    };

    onUpdateAnalysis({
      ...analysis,
      windows: [...analysis.windows, newWindow],
    });
    onSelectElement(newWinId);
    notify(`Added Window to ${wall.id}`);
  };

  const handleAddFurniture = (type: FurnitureType) => {
    const newId = `furn-${Date.now().toString(36)}`;
    const posX = analysis.metadata.overallWidth / 2;
    const posY = analysis.metadata.overallDepth / 2;

    const dimensions: Record<FurnitureType, { w: number; d: number; h: number }> = {
      bed_double: { w: 1.8, d: 2.1, h: 0.9 },
      bed_single: { w: 1.0, d: 2.0, h: 0.8 },
      sofa: { w: 2.4, d: 0.95, h: 0.8 },
      dining_table: { w: 1.8, d: 0.9, h: 0.75 },
      chair: { w: 0.55, d: 0.55, h: 0.85 },
      kitchen_counter: { w: 2.4, d: 0.7, h: 0.9 },
      toilet: { w: 0.45, d: 0.7, h: 0.75 },
      bathtub: { w: 0.8, d: 1.7, h: 0.6 },
      sink: { w: 0.8, d: 0.55, h: 0.85 },
      desk: { w: 1.4, d: 0.7, h: 0.75 },
      wardrobe: { w: 1.6, d: 0.6, h: 2.1 },
      coffee_table: { w: 1.1, d: 0.6, h: 0.45 },
      nightstand: { w: 0.5, d: 0.45, h: 0.55 },
      plant: { w: 0.5, d: 0.5, h: 1.2 },
      tv_unit: { w: 1.8, d: 0.45, h: 0.5 },
      furnace: { w: 0.7, d: 0.7, h: 1.5 },
      washing_machine: { w: 0.65, d: 0.65, h: 0.85 },
      column: { w: 0.35, d: 0.35, h: 2.8 },
    };

    const dim = dimensions[type] || { w: 1.0, d: 1.0, h: 1.0 };
    const newItem: FurnitureItem = {
      id: newId,
      type,
      position: { x: posX, y: posY },
      rotation: 0,
      width: dim.w,
      depth: dim.d,
      height: dim.h,
    };

    const currentFurniture = analysis.furniture || [];
    onUpdateAnalysis({
      ...analysis,
      furniture: [...currentFurniture, newItem],
    });
    onSelectElement(`furniture_${type}_${newId}`);
    notify(`Placed ${type.replace('_', ' ')} in 3D scene`);
  };

  const handleGlobalHeightChange = (height: number) => {
    const updatedWalls = analysis.walls.map((w) => ({ ...w, height }));
    onUpdateAnalysis({
      ...analysis,
      metadata: { ...analysis.metadata, wallHeight: height },
      walls: updatedWalls,
    });
    notify(`Set ceiling height to ${height.toFixed(2)}m`);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0c101c]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col text-xs text-gray-200 animate-fade-in select-none">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-base shadow-lg shadow-orange-500/25">
            ✏️
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">
              3D CAD Customizer &amp; Builder
            </h2>
            <p className="text-[10px] text-amber-400 font-mono">
              Live Parametric Architecture Engine
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          title="Close Customizer"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 gap-2 pt-2 bg-black/20 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('customize')}
          className={`pb-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'customize'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🎯 Edit Element</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('build')}
          className={`pb-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'build'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🔨 Build Mode</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('global')}
          className={`pb-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'global'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🌐 House Properties</span>
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 px-4 py-2 text-[11px] flex items-center gap-2 animate-fade-in">
          <span>✨</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ============================================================ */}
        {/* TAB 1: CUSTOMIZE SELECTED ELEMENT */}
        {/* ============================================================ */}
        {activeTab === 'customize' && (
          <div className="space-y-4">
            {/* Element Selector Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Select Architectural Element
              </label>
              <select
                aria-label="Select Architectural Element"
                value={
                  selectedWall
                    ? selectedWall.id
                    : selectedDoor
                    ? selectedDoor.id
                    : selectedWindow
                    ? selectedWindow.id
                    : selectedRoom
                    ? selectedRoom.id
                    : isRoofSelected
                    ? 'roof'
                    : ''
                }
                onChange={(e) => onSelectElement(e.target.value || null)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-sans"
              >
                <option value="" className="bg-[#121624] text-gray-400">
                  -- Click element in 3D or pick here --
                </option>
                <option value="roof" className="bg-[#121624] text-amber-300 font-semibold">
                  🏠 Roof System ({analysis.roof.type.toUpperCase()})
                </option>
                <optgroup label="🚪 Doors" className="bg-[#121624] text-gray-300">
                  {analysis.doors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Door {d.id} ({d.style}, {d.width.toFixed(2)}m)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🪟 Windows" className="bg-[#121624] text-gray-300">
                  {analysis.windows.map((w) => (
                    <option key={w.id} value={w.id}>
                      Window {w.id} ({w.style}, {w.width.toFixed(2)}m × {w.height.toFixed(2)}m)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🧱 Walls" className="bg-[#121624] text-gray-300">
                  {analysis.walls.map((w) => (
                    <option key={w.id} value={w.id}>
                      Wall {w.id} ({w.isExterior ? 'Exterior' : 'Interior'}, {w.material})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🛋️ Rooms" className="bg-[#121624] text-gray-300">
                  {analysis.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room: {r.name} ({r.area.toFixed(1)} m²)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* --- WALL EDITOR --- */}
            {selectedWall && (
              <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧱</span>
                    <span className="font-bold text-white">Wall: {selectedWall.id}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        selectedWall.isExterior
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {selectedWall.isExterior ? 'Load-Bearing Envelope' : 'Interior Partition'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteWall}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                    title="Knock Down Wall"
                  >
                    🗑️ Remove
                  </button>
                </div>

                {/* Wall Thickness */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Thickness (meters):</span>
                    <span className="font-mono text-amber-300 font-bold">{selectedWall.thickness.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.45"
                    step="0.01"
                    value={selectedWall.thickness}
                    onChange={(e) => handleUpdateWall({ thickness: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                    <span>0.10m (Partition)</span>
                    <span>0.28m (Masonry)</span>
                    <span>0.45m (Insulated)</span>
                  </div>
                </div>

                {/* Wall Height */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Wall Height (meters):</span>
                    <span className="font-mono text-amber-300 font-bold">{selectedWall.height.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="2.2"
                    max="4.5"
                    step="0.05"
                    value={selectedWall.height}
                    onChange={(e) => handleUpdateWall({ height: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Material */}
                <div>
                  <label className="block text-gray-400 mb-1 text-[11px]">Material:</label>
                  <select
                    aria-label="Material"
                    value={selectedWall.material}
                    onChange={(e) => handleUpdateWall({ material: e.target.value as WallMaterial })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 font-sans"
                  >
                    <option value="drywall" className="bg-[#121624]">Drywall / Gypsum Board</option>
                    <option value="concrete" className="bg-[#121624]">Reinforced Concrete</option>
                    <option value="brick" className="bg-[#121624]">Architectural Brick</option>
                    <option value="wood" className="bg-[#121624]">Timber Stud / Timber Frame</option>
                    <option value="stone" className="bg-[#121624]">Natural Limestone / Granite</option>
                    <option value="glass" className="bg-[#121624]">Curtain Wall Glass</option>
                    <option value="stucco" className="bg-[#121624]">Smooth Exterior Stucco</option>
                  </select>
                </div>

                {/* Quick Actions for this wall */}
                <div className="pt-2 border-t border-white/10 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddDoorToWall(selectedWall.id)}
                    className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl font-medium transition-colors"
                  >
                    ➕ Add Door
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddWindowToWall(selectedWall.id)}
                    className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-medium transition-colors"
                  >
                    ➕ Add Window
                  </button>
                </div>
              </div>
            )}

            {/* --- DOOR EDITOR --- */}
            {selectedDoor && (
              <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚪</span>
                    <span className="font-bold text-white">Door: {selectedDoor.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteDoor}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors text-[11px]"
                  >
                    🗑️ Remove
                  </button>
                </div>

                {/* Door Style */}
                <div>
                  <label className="block text-gray-400 mb-1 text-[11px]">Door Style:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['single', 'double', 'sliding', 'french', 'pocket', 'garage'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateDoor({ style: st })}
                        className={`py-1.5 rounded-xl border font-medium capitalize text-[10px] transition-all ${
                          selectedDoor.style === st
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Door Width */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Clear Width:</span>
                    <span className="font-mono text-amber-300 font-bold">{selectedDoor.width.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.70"
                    max="2.40"
                    step="0.05"
                    value={selectedDoor.width}
                    onChange={(e) => handleUpdateDoor({ width: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Door Height */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Head Height:</span>
                    <span className="font-mono text-amber-300 font-bold">{selectedDoor.height.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="1.90"
                    max="2.70"
                    step="0.05"
                    value={selectedDoor.height}
                    onChange={(e) => handleUpdateDoor({ height: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Swing Direction */}
                <div>
                  <label className="block text-gray-400 mb-1 text-[11px]">Swing Direction:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateDoor({ swingDirection: 'inward' })}
                      className={`py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                        selectedDoor.swingDirection === 'inward'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-white/5 border-white/10 text-gray-300'
                      }`}
                    >
                      Inward Swing
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateDoor({ swingDirection: 'outward' })}
                      className={`py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                        selectedDoor.swingDirection === 'outward'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-white/5 border-white/10 text-gray-300'
                      }`}
                    >
                      Outward Swing
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- WINDOW EDITOR --- */}
            {selectedWindow && (
              <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🪟</span>
                    <span className="font-bold text-white">Window: {selectedWindow.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteWindow}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors text-[11px]"
                  >
                    🗑️ Remove
                  </button>
                </div>

                {/* Width & Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Width (m):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="4.0"
                      value={selectedWindow.width}
                      onChange={(e) => handleUpdateWindow({ width: parseFloat(e.target.value) || 1.0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Height (m):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="3.0"
                      value={selectedWindow.height}
                      onChange={(e) => handleUpdateWindow({ height: parseFloat(e.target.value) || 1.0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                {/* Sill Height */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Sill Height above finished floor:</span>
                    <span className="font-mono text-amber-300 font-bold">{selectedWindow.sillHeight.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.50"
                    step="0.05"
                    value={selectedWindow.sillHeight}
                    onChange={(e) => handleUpdateWindow({ sillHeight: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                    <span>0.00m (Picture / Patio)</span>
                    <span>0.90m (Standard IRC)</span>
                    <span>1.40m (High Privacy)</span>
                  </div>
                </div>

                {/* Panes */}
                <div>
                  <label className="block text-gray-400 mb-1 text-[11px]">Glazing Division Panes:</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 6].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleUpdateWindow({ panes: p })}
                        className={`flex-1 py-1 rounded-xl border text-xs font-mono transition-all ${
                          selectedWindow.panes === p
                            ? 'bg-blue-600 text-white border-blue-500 font-bold'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        {p}P
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- ROOF EDITOR --- */}
            {isRoofSelected && (
              <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="text-base">🏠</span>
                  <span className="font-bold text-white">Roof Architecture</span>
                </div>

                {/* Roof Type */}
                <div>
                  <label className="block text-gray-400 mb-1 text-[11px]">Roof Geometry:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['gable', 'hip', 'flat', 'shed'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleUpdateRoof({ type: t })}
                        className={`py-2 rounded-xl border font-medium capitalize text-xs transition-all ${
                          analysis.roof.type === t
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {t === 'gable' && '🏡 Gable Pitch'}
                        {t === 'hip' && '🏛️ Nordic Hip'}
                        {t === 'flat' && '🏢 Modern Flat'}
                        {t === 'shed' && '🏔️ Alpine Shed'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pitch Angle */}
                {analysis.roof.type !== 'flat' && (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-400">Pitch Angle:</span>
                      <span className="font-mono text-amber-300 font-bold">{analysis.roof.pitch}°</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      step="1"
                      value={analysis.roof.pitch}
                      onChange={(e) => handleUpdateRoof({ pitch: parseInt(e.target.value, 10) })}
                      className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* Overhang */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Eaves Overhang:</span>
                    <span className="font-mono text-amber-300 font-bold">{analysis.roof.overhang.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.2"
                    step="0.05"
                    value={analysis.roof.overhang}
                    onChange={(e) => handleUpdateRoof({ overhang: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Material */}
                <div>
                  <label className="block text-gray-400 mb-1 text-[11px]">Shingle / Tile Material:</label>
                  <select
                    aria-label="Shingle / Tile Material"
                    value={analysis.roof.material}
                    onChange={(e) => handleUpdateRoof({ material: e.target.value as Roof['material'] })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                  >
                    <option value="tile" className="bg-[#121624]">Spanish Terracotta S-Tile</option>
                    <option value="slate" className="bg-[#121624]">Nordic Charcoal Slate Shingles</option>
                    <option value="asphalt_shingle" className="bg-[#121624]">Architectural Asphalt Shingle</option>
                    <option value="metal" className="bg-[#121624]">Standing Seam Metal Roof</option>
                  </select>
                </div>
              </div>
            )}

            {/* --- ROOM EDITOR --- */}
            {selectedRoom && (
              <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="text-base">🛋️</span>
                  <span className="font-bold text-white">Room: {selectedRoom.name}</span>
                </div>

                <div>
                  <label className="block text-gray-400 text-[11px] mb-1">Room Label:</label>
                  <input
                    type="text"
                    value={selectedRoom.name}
                    onChange={(e) => handleUpdateRoom({ name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-[11px] mb-1">Typology / Room Purpose:</label>
                  <select
                    aria-label="Typology / Room Purpose"
                    value={selectedRoom.type}
                    onChange={(e) => handleUpdateRoom({ type: e.target.value as RoomType })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white capitalize"
                  >
                    {(
                      [
                        'living_room',
                        'bedroom',
                        'kitchen',
                        'bathroom',
                        'dining_room',
                        'office',
                        'hallway',
                        'closet',
                        'laundry',
                        'garage',
                        'patio',
                        'porch',
                      ] as const
                    ).map((rt) => (
                      <option key={rt} value={rt} className="bg-[#121624]">
                        {rt.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-gray-400 text-[10px]">Calculated Floor Area</p>
                  <p className="text-lg font-bold text-white font-mono mt-0.5">{selectedRoom.area.toFixed(2)} m²</p>
                </div>
              </div>
            )}

            {/* No selection prompt */}
            {!selectedWall && !selectedDoor && !selectedWindow && !selectedRoom && !isRoofSelected && (
              <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-2xl">
                <span className="text-3xl block mb-2">👆</span>
                <p className="font-semibold text-white">Click any element in the 3D model</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Or select a Wall, Door, Window, Roof, or Room from the dropdown above to edit its dimensions, materials, and styles!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: BUILD MODE (ADD ELEMENTS) */}
        {/* ============================================================ */}
        {activeTab === 'build' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3.5">
              <h3 className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                <span>🔨</span> Add Architecture &amp; Interior Fixtures
              </h3>
              <p className="text-[10px] text-gray-300 mt-1">
                Construct new interior rooms, add doors, windows, and furnishings to build or remodel the house.
              </p>
            </div>

            {/* Add Wall */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">🧱 Add Interior Partition Wall</h4>
                  <p className="text-[10px] text-gray-400">Creates a 4-meter drywall partition at center.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddWall}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-md transition-colors"
                >
                  ➕ Add Wall
                </button>
              </div>
            </div>

            {/* Add Door to Wall */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-bold text-white text-xs">🚪 Add Door to Existing Wall</h4>
              <p className="text-[10px] text-gray-400">Select which wall to insert an opening into:</p>
              <div className="flex gap-2">
                <select
                  aria-label="Select wall to insert door"
                  id="target-door-wall-select"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                >
                  {analysis.walls.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#121624]">
                      Wall {w.id} ({w.isExterior ? 'Exterior' : 'Interior'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('target-door-wall-select') as HTMLSelectElement;
                    if (el?.value) handleAddDoorToWall(el.value);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                >
                  Insert Door
                </button>
              </div>
            </div>

            {/* Add Window to Wall */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-bold text-white text-xs">🪟 Add Window to Existing Wall</h4>
              <p className="text-[10px] text-gray-400">Select which wall to insert a window into:</p>
              <div className="flex gap-2">
                <select
                  aria-label="Select wall to insert window"
                  id="target-win-wall-select"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
                >
                  {analysis.walls.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#121624]">
                      Wall {w.id} ({w.isExterior ? 'Exterior' : 'Interior'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('target-win-wall-select') as HTMLSelectElement;
                    if (el?.value) handleAddWindowToWall(el.value);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
                >
                  Insert Window
                </button>
              </div>
            </div>

            {/* Add Furniture */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
              <h4 className="font-bold text-white text-xs">🛋️ Insert Furniture &amp; Fixtures</h4>
              <p className="text-[10px] text-gray-400">Click to place procedural 3D model into layout:</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddFurniture('bed_double')}
                  className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left flex items-center gap-2"
                >
                  <span>🛏️</span> <span>King Bed</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFurniture('sofa')}
                  className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left flex items-center gap-2"
                >
                  <span>🛋️</span> <span>Sectional Sofa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFurniture('dining_table')}
                  className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left flex items-center gap-2"
                >
                  <span>🍽️</span> <span>Dining Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFurniture('kitchen_counter')}
                  className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left flex items-center gap-2"
                >
                  <span>🍳</span> <span>Kitchen Island</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFurniture('desk')}
                  className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left flex items-center gap-2"
                >
                  <span>💻</span> <span>Work Desk</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFurniture('bathtub')}
                  className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-left flex items-center gap-2"
                >
                  <span>🛁</span> <span>Soaking Tub</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: GLOBAL PARAMETRIC CONTROLS */}
        {/* ============================================================ */}
        {activeTab === 'global' && (
          <div className="space-y-4">
            {/* Global Ceiling Height */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Ceiling Clear Height</span>
                <span className="font-mono text-emerald-400 font-bold">{analysis.metadata.wallHeight.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="2.40"
                max="4.00"
                step="0.05"
                value={analysis.metadata.wallHeight}
                onChange={(e) => handleGlobalHeightChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>2.40m (Standard)</span>
                <span>2.80m (High Ceiling)</span>
                <span>4.00m (Loft / Salon)</span>
              </div>
            </div>

            {/* Building Footprint Schedule */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
              <h4 className="font-bold text-white text-xs">Architectural Footprint Schedule</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px]">Overall Width</span>
                  <span className="text-white font-mono font-bold">{analysis.metadata.overallWidth.toFixed(2)} m</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px]">Overall Depth</span>
                  <span className="text-white font-mono font-bold">{analysis.metadata.overallDepth.toFixed(2)} m</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px]">Net Area</span>
                  <span className="text-white font-mono font-bold">{analysis.metadata.totalArea.toFixed(1)} m²</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[9px]">Wall Count</span>
                  <span className="text-white font-mono font-bold">{analysis.walls.length} segments</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
