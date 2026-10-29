'use client';

import React, { useState, useEffect } from 'react';
import type { HouseAnalysis } from '@/types';

interface ARModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: HouseAnalysis | null;
  onExportGLB?: () => void;
}

export default function ARModal({
  isOpen,
  onClose,
  analysis,
  onExportGLB,
}: ARModalProps) {
  const [scaleMode, setScaleMode] = useState<'tabletop' | 'lifesize'>('tabletop');
  const [webXRSupported, setWebXRSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'xr' in navigator) {
      const navXR = (navigator as unknown as { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr;
      navXR?.isSessionSupported?.('immersive-ar')
        ?.then((supported: boolean) => setWebXRSupported(supported))
        ?.catch(() => setWebXRSupported(false));
    } else {
      setWebXRSupported(false);
    }
  }, []);

  if (!isOpen || !analysis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-strong rounded-3xl max-w-lg w-full p-6 border border-white/10 shadow-2xl space-y-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/25">
              🥽
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                WebXR Spatial AR & VR
              </h3>
              <p className="text-xs text-gray-400">
                Immersive Physical Reality Inspection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* WebXR Hardware Status */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs">
          <span className="text-gray-300">Browser WebXR Engine:</span>
          {webXRSupported === true ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Immersive-AR Ready
            </span>
          ) : (
            <span className="text-amber-400 font-medium flex items-center gap-1">
              <span>📱</span> Mobile AR Mode (iOS / Android)
            </span>
          )}
        </div>

        {/* Spatial Scale Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Spatial Projection Scale
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScaleMode('tabletop')}
              className={`
                p-3 rounded-2xl border text-left transition-all
                ${
                  scaleMode === 'tabletop'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                    : 'border-white/5 bg-white/5 hover:bg-white/10 text-gray-400'
                }
              `}
            >
              <div className="font-bold text-xs text-white">📦 Tabletop Hologram</div>
              <div className="text-[11px] text-gray-400 mt-0.5">1:20 Scale (Desk / Tabletop)</div>
            </button>

            <button
              type="button"
              onClick={() => setScaleMode('lifesize')}
              className={`
                p-3 rounded-2xl border text-left transition-all
                ${
                  scaleMode === 'lifesize'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                    : 'border-white/5 bg-white/5 hover:bg-white/10 text-gray-400'
                }
              `}
            >
              <div className="font-bold text-xs text-white">🏡 1:1 True Life Scale</div>
              <div className="text-[11px] text-gray-400 mt-0.5">14.8m Full Walk-In Reality</div>
            </button>
          </div>
        </div>

        {/* Mobile Quick Scan & Launch */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            {/* Visual SVG QR Code Icon for Instant AR */}
            <div className="w-32 h-32 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 100 100" className="w-full h-full text-black" fill="currentColor">
                {/* QR corner squares */}
                <rect x="10" y="10" width="25" height="25" rx="3" fill="#000" />
                <rect x="15" y="15" width="15" height="15" fill="#fff" />
                <rect x="19" y="19" width="7" height="7" fill="#000" />

                <rect x="65" y="10" width="25" height="25" rx="3" fill="#000" />
                <rect x="70" y="15" width="15" height="15" fill="#fff" />
                <rect x="74" y="19" width="7" height="7" fill="#000" />

                <rect x="10" y="65" width="25" height="25" rx="3" fill="#000" />
                <rect x="15" y="70" width="15" height="15" fill="#fff" />
                <rect x="19" y="74" width="7" height="7" fill="#000" />

                {/* Random QR data points */}
                <rect x="42" y="15" width="6" height="6" fill="#000" />
                <rect x="52" y="25" width="6" height="6" fill="#000" />
                <rect x="45" y="45" width="10" height="10" rx="2" fill="#3B82F6" />
                <rect x="25" y="45" width="6" height="6" fill="#000" />
                <rect x="65" y="45" width="6" height="6" fill="#000" />
                <rect x="42" y="65" width="6" height="6" fill="#000" />
                <rect x="55" y="75" width="6" height="6" fill="#000" />
                <rect x="75" y="65" width="6" height="6" fill="#000" />
                <rect x="85" y="80" width="6" height="6" fill="#000" />
              </svg>
            </div>
            <p className="text-xs text-gray-300 font-medium">
              Scan with your iPhone or Android camera to view in AR
            </p>
            <p className="text-[11px] text-gray-400">
              Compatible with Apple Quick Look (iOS) & Google Scene Viewer (Android)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onExportGLB}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>📥</span>
            <span>Download 3D Binary (.GLB)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
