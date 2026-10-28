'use client';

import React, { useState } from 'react';
import type { ViewerState } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = ViewerState['viewMode'];

interface ViewControlsProps {
  viewMode: ViewMode;
  lightingMode?: 'day' | 'golden_hour' | 'night';
  showWireframe: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  currentFloor: number;
  totalFloors: number;
  onViewModeChange: (mode: ViewMode) => void;
  onLightingChange?: (mode: 'day' | 'golden_hour' | 'night') => void;
  onToggleWireframe: () => void;
  onToggleLabels: () => void;
  onToggleDimensions: () => void;
  onToggleRoof: () => void;
  onToggleFurniture: () => void;
  onFloorChange: (floor: number) => void;
  onExportGLB?: () => void;
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
        flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200
        ${
          active
            ? 'bg-[var(--accent)] text-white shadow-md shadow-blue-500/20'
            : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViewControls({
  viewMode,
  lightingMode = 'day',
  showWireframe,
  showLabels,
  showDimensions,
  showRoof,
  showFurniture,
  currentFloor,
  totalFloors,
  onViewModeChange,
  onLightingChange,
  onToggleWireframe,
  onToggleLabels,
  onToggleDimensions,
  onToggleRoof,
  onToggleFurniture,
  onFloorChange,
  onExportGLB,
}: ViewControlsProps) {
  const [showComingSoon, setShowComingSoon] = useState(false);

  const viewModes: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: 'perspective',
      label: '3D',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5" />
          <path d="M12 12v9" />
          <path d="M12 12L4 7.5" />
        </svg>
      ),
    },
    {
      mode: 'first-person',
      label: 'Walk',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21v-4a7 7 0 0 1 13 0v4" />
        </svg>
      ),
    },
    {
      mode: 'top',
      label: 'Top',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 3v18" />
        </svg>
      ),
    },
    {
      mode: 'front',
      label: 'Front',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 15h18" />
        </svg>
      ),
    },
    {
      mode: 'side',
      label: 'Side',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M15 3v18" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        View Controls
      </h3>

      {/* View mode selector */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-2">Camera Perspective</p>
        <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1">
          {viewModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`
                flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-all duration-200
                ${
                  viewMode === mode
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-blue-500/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                }
              `}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lighting atmosphere selector */}
      {onLightingChange && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">Lighting & Atmosphere</p>
          <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1">
            <button
              type="button"
              onClick={() => onLightingChange('day')}
              className={`
                flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all duration-200
                ${
                  lightingMode === 'day'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
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
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
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
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                }
              `}
            >
              🌙 Night
            </button>
          </div>
        </div>
      )}

      {/* Display toggles */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-2">Display Options</p>
        <div className="flex flex-wrap gap-2">
          <ToggleButton
            active={showRoof}
            onClick={onToggleRoof}
            label={showRoof ? "Roof: On" : "Roof: Cutaway"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
          />
          <ToggleButton
            active={showFurniture}
            onClick={onToggleFurniture}
            label="Furniture"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="8" rx="2" />
                <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
                <path d="M5 19v2" />
                <path d="M19 19v2" />
              </svg>
            }
          />
          <ToggleButton
            active={showDimensions}
            onClick={onToggleDimensions}
            label="CAD Dimensions"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                <path d="m14.5 12.5 2-2" />
                <path d="m11.5 9.5 2-2" />
                <path d="m8.5 6.5 2-2" />
                <path d="m17.5 15.5 2-2" />
              </svg>
            }
          />
          <ToggleButton
            active={showLabels}
            onClick={onToggleLabels}
            label="Room Badges"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
              </svg>
            }
          />
          <ToggleButton
            active={showWireframe}
            onClick={onToggleWireframe}
            label="Wireframe"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12l10-7 10 7-10 7-10-7z" />
                <path d="M12 5v14" />
                <path d="M2 12h20" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Floor selector */}
      {totalFloors > 1 && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">Floor</p>
          <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1">
            {Array.from({ length: totalFloors }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onFloorChange(i)}
                className={`
                  flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-200
                  ${
                    currentFloor === i
                      ? 'bg-[var(--accent)] text-white shadow-md shadow-blue-500/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                  }
                `}
              >
                {i === 0 ? 'Ground' : `Floor ${i}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions: Export 3D Model & AR/VR */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        {onExportGLB && (
          <button
            type="button"
            onClick={onExportGLB}
            className="
              w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5
              bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
              text-xs font-semibold text-white shadow-lg shadow-blue-500/25
              transition-all duration-200
            "
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download 3D Model (.GLB)
          </button>
        )}

        {/* AR / VR button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowComingSoon((p) => !p)}
            className="
              w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5
              bg-purple-500/15 hover:bg-purple-500/25
              border border-purple-500/30 hover:border-purple-400/50
              text-xs font-medium text-purple-300 hover:text-purple-200
              transition-all duration-200
            "
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
              <path d="M6 12h.01" />
              <path d="M18 12h.01" />
              <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              <path d="M9 16c0-2 1.5-3 3-3s3 1 3 3" />
            </svg>
            AR / VR Mode
            <span className="bg-purple-500/30 text-purple-200 text-[9px] px-1.5 py-0.2 rounded-full font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Coming Soon tooltip */}
          {showComingSoon && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
              <div className="glass-strong rounded-xl px-4 py-3 shadow-xl max-w-[220px] text-center">
                <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                  🥽 AR/VR Meta Quest Ready
                </p>
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  Export the .GLB model or view directly in Meta Quest Browser for immersive spatial walkthrough!
                </p>
              </div>
              <div className="w-3 h-3 bg-[var(--surface-raised)] border-r border-b border-[var(--border)] rotate-45 mx-auto -mt-1.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
