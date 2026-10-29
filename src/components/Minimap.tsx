'use client';

import React, { useState } from 'react';
import type { HouseAnalysis } from '@/types';

interface MinimapProps {
  analysis: HouseAnalysis;
  playerPos: [number, number, number]; // [worldX, worldY, worldZ]
  playerDir: [number, number]; // [dirX, dirZ] (horizontal forward vector)
  onTeleport: (target: [number, number, number]) => void;
  onSelectRoom?: (roomId: string) => void;
}

export default function Minimap({
  analysis,
  playerPos,
  playerDir,
  onTeleport,
  onSelectRoom,
}: MinimapProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const { overallWidth: w, overallDepth: d } = analysis.metadata;
  const offsetX = w / 2;
  const offsetZ = d / 2;

  // Convert 3D world coords to 2D plan coords
  const planX = playerPos[0] + offsetX;
  const planY = playerPos[2] + offsetZ;

  // Calculate yaw angle in degrees for the FOV cone
  // dirX is +X (East/Right), dirZ is +Z (South/Down)
  const angleRad = Math.atan2(playerDir[1], playerDir[0]);
  const angleDeg = (angleRad * 180) / Math.PI;

  // FOV cone endpoints (60 degree spread, 2.5m range on plan)
  const fovRange = 3.2;
  const halfFov = (30 * Math.PI) / 180;
  const leftX = planX + fovRange * Math.cos(angleRad - halfFov);
  const leftY = planY + fovRange * Math.sin(angleRad - halfFov);
  const rightX = planX + fovRange * Math.cos(angleRad + halfFov);
  const rightY = planY + fovRange * Math.sin(angleRad + halfFov);

  // Padding around bounding box
  const pad = 1.0;
  const viewBox = `${-pad} ${-pad} ${w + pad * 2} ${d + pad * 2}`;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click in element pixels to SVG viewbox coordinates
    const scaleX = (w + pad * 2) / rect.width;
    const scaleY = (d + pad * 2) / rect.height;

    const clickedPlanX = (clickX * scaleX) - pad;
    const clickedPlanY = (clickY * scaleY) - pad;

    // Convert 2D plan coords to 3D world coords
    const worldX = clickedPlanX - offsetX;
    const worldZ = clickedPlanY - offsetZ;

    // Clamp inside house bounds
    const clampedX = Math.max(-offsetX + 0.5, Math.min(offsetX - 0.5, worldX));
    const clampedZ = Math.max(-offsetZ + 0.5, Math.min(offsetZ - 0.5, worldZ));

    onTeleport([clampedX, 1.65, clampedZ]);
  };

  return (
    <div className="glass-strong rounded-2xl border border-white/10 shadow-2xl overflow-hidden select-none transition-all duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-gray-200">2D Radar Minimap</span>
        </div>
        <div className="flex items-center gap-2">
          {hoveredRoom && (
            <span className="text-[10px] text-blue-300 font-medium truncate max-w-[110px]">
              {hoveredRoom}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed((p) => !p)}
            className="text-gray-400 hover:text-white text-xs px-1 rounded transition-colors"
            title={isCollapsed ? 'Expand Minimap' : 'Collapse Minimap'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Map body */}
      {!isCollapsed && (
        <div className="p-2 relative bg-slate-950/80">
          <svg
            viewBox={viewBox}
            onClick={handleSvgClick}
            className="w-48 sm:w-56 h-auto cursor-crosshair rounded-xl overflow-hidden block"
            style={{ maxHeight: '200px' }}
          >
            <defs>
              {/* Luminous radar gradient for FOV cone */}
              <radialGradient id="fovGradient" cx="0%" cy="0%" r="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background grid dots */}
            <pattern id="grid" width="2" height="2" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.08" fill="#334155" />
            </pattern>
            <rect x={-pad} y={-pad} width={w + pad * 2} height={d + pad * 2} fill="url(#grid)" />

            {/* Room Polygons */}
            {analysis.rooms.map((room) => {
              if (room.vertices.length < 3) return null;
              const pointsStr = room.vertices.map((v) => `${v.x},${v.y}`).join(' ');
              const isHovered = hoveredRoom === room.name;

              // Color tints by room type
              let fillColor = 'rgba(59, 130, 246, 0.12)';
              if (room.type === 'bedroom') fillColor = 'rgba(168, 85, 247, 0.12)';
              if (room.type === 'bathroom') fillColor = 'rgba(6, 182, 212, 0.15)';
              if (room.type === 'kitchen') fillColor = 'rgba(234, 179, 8, 0.12)';
              if (room.type === 'porch' || room.type === 'balcony') fillColor = 'rgba(34, 197, 94, 0.12)';

              return (
                <g key={room.id}>
                  <polygon
                    points={pointsStr}
                    fill={isHovered ? 'rgba(59, 130, 246, 0.35)' : fillColor}
                    stroke={isHovered ? '#60a5fa' : '#334155'}
                    strokeWidth="0.08"
                    className="transition-colors duration-150"
                    onMouseEnter={() => setHoveredRoom(room.name)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectRoom) onSelectRoom(room.id);
                      // Calculate center of room and teleport
                      const cx = room.vertices.reduce((s, v) => s + v.x, 0) / room.vertices.length;
                      const cy = room.vertices.reduce((s, v) => s + v.y, 0) / room.vertices.length;
                      onTeleport([cx - offsetX, 1.65, cy - offsetZ]);
                    }}
                  />
                </g>
              );
            })}

            {/* Furniture Outlines on Minimap */}
            {analysis.furniture?.map((item) => {
              const halfW = item.width / 2;
              const halfD = item.depth / 2;
              return (
                <rect
                  key={item.id}
                  x={item.position.x - halfW}
                  y={item.position.y - halfD}
                  width={item.width}
                  height={item.depth}
                  fill="rgba(148, 163, 184, 0.25)"
                  stroke="#64748b"
                  strokeWidth="0.04"
                  rx="0.08"
                  transform={`rotate(${item.rotation}, ${item.position.x}, ${item.position.y})`}
                  pointerEvents="none"
                />
              );
            })}

            {/* Walls */}
            {analysis.walls.map((wall) => (
              <line
                key={wall.id}
                x1={wall.start.x}
                y1={wall.start.y}
                x2={wall.end.x}
                y2={wall.end.y}
                stroke={wall.isExterior ? '#94a3b8' : '#cbd5e1'}
                strokeWidth={wall.thickness}
                strokeLinecap="round"
                pointerEvents="none"
              />
            ))}

            {/* Doors */}
            {analysis.doors.map((door) => (
              <circle
                key={door.id}
                cx={door.position.x}
                cy={door.position.y}
                r={0.25}
                fill="#22c55e"
                pointerEvents="none"
              />
            ))}

            {/* Windows */}
            {analysis.windows.map((win) => (
              <circle
                key={win.id}
                cx={win.position.x}
                cy={win.position.y}
                r={0.2}
                fill="#38bdf8"
                pointerEvents="none"
              />
            ))}

            {/* Radar FOV Viewing Cone */}
            <path
              d={`M ${planX} ${planY} L ${leftX} ${leftY} A ${fovRange} ${fovRange} 0 0 1 ${rightX} ${rightY} Z`}
              fill="url(#fovGradient)"
              pointerEvents="none"
            />

            {/* Player Avatar Dot & Directional Arrow */}
            <g transform={`translate(${planX}, ${planY})`}>
              {/* Outer pulsing ping */}
              <circle r="0.75" fill="#38bdf8" opacity="0.25" className="animate-ping" />
              {/* Inner position ring */}
              <circle r="0.45" fill="#0284c7" stroke="#ffffff" strokeWidth="0.12" />
              {/* Heading arrow tick */}
              <path
                d={`M 0 0 L ${0.7 * Math.cos(angleRad)} ${0.7 * Math.sin(angleRad)}`}
                stroke="#ffffff"
                strokeWidth="0.14"
                strokeLinecap="round"
              />
            </g>
          </svg>

          {/* Minimap Hint & Quick Action */}
          <div className="mt-1 flex items-center justify-between text-[9px] text-gray-400 px-1">
            <span>Click any room to teleport</span>
            <span className="text-blue-400 font-mono">
              ({playerPos[0].toFixed(1)}m, {playerPos[2].toFixed(1)}m)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

