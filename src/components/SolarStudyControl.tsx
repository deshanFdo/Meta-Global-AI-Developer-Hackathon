'use client';

import React from 'react';
import type { SolarStudySettings } from '@/types';
import { calculateSolarPosition } from '@/lib/solar-calculator';

interface SolarStudyControlProps {
  settings: SolarStudySettings;
  onChange: (settings: SolarStudySettings) => void;
  onClose?: () => void;
}

export default function SolarStudyControl({
  settings,
  onChange,
  onClose,
}: SolarStudyControlProps) {
  const solar = calculateSolarPosition(settings);

  // Format hour number (e.g. 14.5 -> "14:30")
  const hours = Math.floor(settings.timeOfDay);
  const minutes = Math.round((settings.timeOfDay - hours) * 60);
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return (
    <div className="glass-strong rounded-2xl p-4 border border-white/10 shadow-2xl backdrop-blur-xl text-white max-w-sm w-full space-y-3.5 select-none animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">☀️</span>
          <div>
            <h4 className="text-xs font-bold tracking-wide uppercase text-amber-400">
              Solar Study & Heliodon
            </h4>
            <p className="text-[10px] text-gray-400">Passive Daylighting & Shading</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Season Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-gray-300">Seasonal Solstice</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['summer', 'equinox', 'winter'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...settings, season: s })}
              className={`
                py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all capitalize
                ${
                  settings.season === s
                    ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/25'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }
              `}
            >
              {s === 'summer' ? '☀️ Summer' : s === 'winter' ? '❄️ Winter' : '🍂 Equinox'}
            </button>
          ))}
        </div>
      </div>

      {/* Time of Day Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-300 font-medium">Solar Time:</span>
          <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {timeFormatted}
          </span>
        </div>
        <input
          type="range"
          min={6.0}
          max={20.0}
          step={0.25}
          value={settings.timeOfDay}
          onChange={(e) => onChange({ ...settings, timeOfDay: parseFloat(e.target.value) })}
          className="w-full accent-amber-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
          <span>06:00 Dawn</span>
          <span>12:00 Noon</span>
          <span>20:00 Dusk</span>
        </div>
      </div>

      {/* Real-time Solar Angle Readouts */}
      <div className="grid grid-cols-2 gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5 text-[11px]">
        <div>
          <span className="text-gray-400 text-[10px] block">Sun Altitude</span>
          <span className="font-mono font-semibold text-white">
            {solar.altitude.toFixed(1)}°
          </span>
        </div>
        <div>
          <span className="text-gray-400 text-[10px] block">Sun Azimuth</span>
          <span className="font-mono font-semibold text-white">
            {solar.azimuth.toFixed(1)}° ({solar.azimuth < 90 ? 'NE' : solar.azimuth < 180 ? 'SE' : solar.azimuth < 270 ? 'SW' : 'NW'})
          </span>
        </div>
      </div>

      {/* Passive Shading Status Indicator */}
      {solar.shadingActive ? (
        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-2 text-center text-emerald-300 text-[10px] font-medium flex items-center justify-center gap-1.5">
          <span>🌿</span>
          <span>Terrace Roof Overhang Actively Blocks Summer Noon Glare</span>
        </div>
      ) : settings.season === 'winter' && solar.altitude > 10 ? (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-2 text-center text-amber-300 text-[10px] font-medium flex items-center justify-center gap-1.5">
          <span>🔥</span>
          <span>Low Winter Sun Penetrates Glazing for Passive Heating</span>
        </div>
      ) : null}
    </div>
  );
}

