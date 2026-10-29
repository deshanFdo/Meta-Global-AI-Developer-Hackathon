'use client';

import React from 'react';
import type { ViewerState, FlooringPreset } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = ViewerState['viewMode'];

interface ViewControlsProps {
  viewMode: ViewMode;
  lightingMode?: 'day' | 'golden_hour' | 'night';
  flooringPreset?: FlooringPreset;
  isSolarStudyOpen?: boolean;
  showWireframe: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  currentFloor: number;
  totalFloors: number;
  onViewModeChange: (mode: ViewMode) => void;
  onLightingChange?: (mode: 'day' | 'golden_hour' | 'night') => void;
  onFlooringChange?: (preset: FlooringPreset) => void;
  onToggleSolarStudy?: () => void;
  onToggleWireframe: () => void;
  onToggleLabels: () => void;
  onToggleDimensions: () => void;
  onToggleRoof: () => void;
  onToggleFurniture: () => void;
  onFloorChange: (floor: number) => void;
  onExportGLB?: () => void;
  onExportDXF?: () => void;
  onExportCSV?: () => void;
  onOpenAR?: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToggleButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`
        flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-200
        ${
          active
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViewControls({
  viewMode,
  lightingMode = 'day',
  flooringPreset = 'scandinavian_oak',
  isSolarStudyOpen = false,
  showWireframe,
  showLabels,
  showDimensions,
  showRoof,
  showFurniture,
  currentFloor,
  totalFloors,
  onViewModeChange,
  onLightingChange,
  onFlooringChange,
  onToggleSolarStudy,
  onToggleWireframe,
  onToggleLabels,
  onToggleDimensions,
  onToggleRoof,
  onToggleFurniture,
  onFloorChange,
  onExportGLB,
  onExportDXF,
  onExportCSV,
  onOpenAR,
}: ViewControlsProps) {
  const viewModes: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: 'perspective',
      label: '3D Orbit',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5" />
          <path d="M12 12v9" />
          <path d="M12 12L4 7.5" />
        </svg>
      ),
    },
    {
      mode: 'first-person',
      label: 'Walk (WASD)',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21v-4a7 7 0 0 1 13 0v4" />
        </svg>
      ),
    },
    {
      mode: 'top',
      label: 'Top CAD',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 3v18" />
        </svg>
      ),
    },
  ];

  const flooringOptions: { preset: FlooringPreset; label: string; icon: string }[] = [
    { preset: 'scandinavian_oak', label: 'Scand. Oak', icon: '🪵' },
    { preset: 'dark_walnut', label: 'Dark Walnut', icon: '🌰' },
    { preset: 'carrara_marble', label: 'Carrara Marble', icon: '🏛️' },
    { preset: 'industrial_concrete', label: 'Concrete Screed', icon: '🏢' },
  ];

  return (
    <div className="space-y-4 text-xs">
      {/* View mode selector */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Camera Perspective
        </p>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {viewModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200
                ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lighting atmosphere selector */}
      {onLightingChange && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Lighting Atmosphere
          </p>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            <button
              type="button"
              onClick={() => onLightingChange('day')}
              className={`
                flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200
                ${
                  lightingMode === 'day'
                    ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              ☀️ Day
            </button>
            <button
              type="button"
              onClick={() => onLightingChange('golden_hour')}
              className={`
                flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200
                ${
                  lightingMode === 'golden_hour'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              🌅 Golden
            </button>
            <button
              type="button"
              onClick={() => onLightingChange('night')}
              className={`
                flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200
                ${
                  lightingMode === 'night'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              🌙 Night
            </button>
          </div>
        </div>
      )}

      {/* Interior Flooring Finish Swapper */}
      {onFlooringChange && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            PBR Floor Finish Palette
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {flooringOptions.map((opt) => (
              <button
                key={opt.preset}
                type="button"
                onClick={() => onFlooringChange(opt.preset)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border text-left transition-all
                  ${
                    flooringPreset === opt.preset
                      ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm'
                      : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                  }
                `}
              >
                <span>{opt.icon}</span>
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Display toggles */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Architectural Layers
        </p>
        <div className="flex flex-wrap gap-1.5">
          <ToggleButton
            active={showRoof}
            onClick={onToggleRoof}
            label={showRoof ? 'Roof: Solid' : 'Roof: Cutaway'}
            icon={<span>🏠</span>}
          />
          <ToggleButton
            active={showFurniture}
            onClick={onToggleFurniture}
            label={showFurniture ? 'Fixtures: On' : 'Fixtures: Off'}
            icon={<span>🛋️</span>}
          />
          <ToggleButton
            active={showDimensions}
            onClick={onToggleDimensions}
            label="CAD Dimensions"
            icon={<span>📐</span>}
          />
          <ToggleButton
            active={showLabels}
            onClick={onToggleLabels}
            label="Room Tags"
            icon={<span>🏷️</span>}
          />
          <ToggleButton
            active={showWireframe}
            onClick={onToggleWireframe}
            label="Wireframe"
            icon={<span>🕸️</span>}
          />
          {onToggleSolarStudy && (
            <ToggleButton
              active={isSolarStudyOpen}
              onClick={onToggleSolarStudy}
              label="Solar Study"
              icon={<span>☀️</span>}
            />
          )}
        </div>
      </div>

      {/* Floor selector */}
      {totalFloors > 1 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Floor Level
          </p>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {Array.from({ length: totalFloors }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onFloorChange(i)}
                className={`
                  flex-1 rounded-lg py-1.5 text-xs font-medium transition-all duration-200
                  ${
                    currentFloor === i
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {i === 0 ? 'Ground' : `Floor ${i}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions: Export Hub & AR/VR */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          BIM & CAD Export Hub
        </p>

        {onExportGLB && (
          <button
            type="button"
            onClick={onExportGLB}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all"
          >
            <span>📥</span>
            <span>Download 3D Model (.GLB)</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {onExportDXF && (
            <button
              type="button"
              onClick={onExportDXF}
              className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-200 hover:text-white transition-all"
            >
              <span>📐</span>
              <span>2D CAD (.DXF)</span>
            </button>
          )}

          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-200 hover:text-white transition-all"
            >
              <span>📊</span>
              <span>Schedule (.CSV)</span>
            </button>
          )}
        </div>

        {/* Spatial WebXR / AR Mode Button */}
        {onOpenAR && (
          <button
            type="button"
            onClick={onOpenAR}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold text-purple-200 transition-all shadow-md shadow-purple-500/10"
          >
            <span>🥽</span>
            <span>Launch WebXR & Mobile AR</span>
          </button>
        )}
      </div>
    </div>
  );
}
