'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { HouseAnalysis, GeneratedTextures, FlooringPreset } from '@/types';
import { GeometryEngine } from '@/lib/geometry-engine';
import { soundscape } from '@/lib/soundscape';
import {
  getMaterialForFloorFinish,
  getMaterialForWallFinish,
  getMaterialForTrimFinish,
} from '@/lib/finish-library';
import type { FinishSelectionState } from '@/lib/cost-engine';

interface HouseModelProps {
  analysis: HouseAnalysis;
  textures: GeneratedTextures | null;
  showWireframe: boolean;
  showLabels: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  flooringPreset?: FlooringPreset;
  finishes?: FinishSelectionState;
  selectedElement: string | null;
  onElementClick?: (id: string) => void;
}

export default function HouseModel({
  analysis,
  textures,
  showWireframe,
  showLabels,
  showRoof,
  showFurniture,
  flooringPreset,
  finishes,
  selectedElement,
  onElementClick,
}: HouseModelProps) {
  void textures;
  const doorPivotsRef = useRef<THREE.Group[]>([]);

  // Generate 3D geometry using GeometryEngine
  const houseGroup = useMemo(() => {
    const engine = new GeometryEngine();
    const grp = engine.generateHouseGeometry(analysis, { showRoof, showFurniture, flooringPreset });

    // Collect all interactive door pivots
    const pivots: THREE.Group[] = [];
    grp.traverse((child) => {
      if (child.userData?.isDoorPivot) {
        pivots.push(child as THREE.Group);
      }
    });
    doorPivotsRef.current = pivots;

    return grp;
  }, [analysis, showRoof, showFurniture, flooringPreset]);

  // Dynamic Finish Swapper driven by BIM Finish Studio
  useEffect(() => {
    if (!finishes) return;

    houseGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name.startsWith('floor_')) {
          const roomId = child.name.replace('floor_', '');
          const floorKey = finishes.roomOverrides[roomId]?.floor || finishes.globalFloor;
          child.material = getMaterialForFloorFinish(floorKey);
        } else if (child.name.startsWith('wall_')) {
          const wallId = child.name.replace('wall_', '');
          const wall = analysis.walls.find((w) => w.id === wallId);
          if (wall && !wall.isExterior) {
            child.material = getMaterialForWallFinish(finishes.globalWall);
          }
        } else if (child.name.startsWith('door_panel_')) {
          const trimKey = finishes.globalTrim;
          child.material = getMaterialForTrimFinish(trimKey);
        }
      }
    });
  }, [houseGroup, finishes, analysis.walls]);

  // Update wireframe state and selection highlight across all meshes in the group
  useEffect(() => {
    houseGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (
          selectedElement &&
          (child.name === selectedElement ||
            child.name === `floor_${selectedElement}` ||
            child.name === `wall_${selectedElement}` ||
            child.name === `door_${selectedElement}`)
        ) {
          child.scale.set(1.02, 1.02, 1.02);
        } else {
          child.scale.set(1, 1, 1);
        }

        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if ('wireframe' in mat) {
              (mat as THREE.MeshStandardMaterial).wireframe = showWireframe;
            }
          });
        } else if (child.material && 'wireframe' in child.material) {
          (child.material as THREE.MeshStandardMaterial).wireframe = showWireframe;
        }
      }
    });
  }, [houseGroup, showWireframe, selectedElement]);

  // Animation Frame: Critically-Damped Spring Animation for Doors & Windows
  useFrame((_, delta) => {
    for (const pivot of doorPivotsRef.current) {
      const u = pivot.userData;
      if (!u) continue;
      const target = u.isOpen ? 1 : 0;
      u.currentT += (target - u.currentT) * Math.min(1, delta * 7);

      if (u.doorStyle === 'sliding') {
        pivot.position.x = -u.doorWidth / 2 + u.currentT * u.slideDist;
      } else {
        pivot.rotation.y = u.currentT * u.targetAngle;
      }
    }
  });

  // Compute room centers for 3D label tags
  const roomLabels = useMemo(() => {
    const offsetX = analysis.metadata.overallWidth / 2;
    const offsetZ = analysis.metadata.overallDepth / 2;

    return analysis.rooms
      .map((room) => {
        if (room.vertices.length === 0) return null;
        let sumX = 0;
        let sumZ = 0;
        for (const v of room.vertices) {
          sumX += v.x;
          sumZ += v.y;
        }
        const cx = sumX / room.vertices.length - offsetX;
        const cz = sumZ / room.vertices.length - offsetZ;
        const cy = analysis.metadata.wallHeight + 0.3;

        return {
          id: room.id,
          name: room.name,
          type: room.type,
          area: room.area,
          position: [cx, cy, cz] as [number, number, number],
        };
      })
      .filter(Boolean);
  }, [analysis]);

  return (
    <group>
      {/* Three.js procedural house mesh with interactive door toggle */}
      <primitive
        object={houseGroup}
        onClick={(e: { stopPropagation: () => void; object: THREE.Object3D }) => {
          e.stopPropagation();
          const target = e.object;

          // Check if user clicked an interactive door / handle
          if (target.userData?.pivotGroup) {
            const pivot = target.userData.pivotGroup as THREE.Group;
            pivot.userData.isOpen = !pivot.userData.isOpen;
            soundscape.playFootstep(); // Tactile click sound
            return;
          }

          if (target && target.name && onElementClick) {
            onElementClick(target.name.replace(/^(floor|wall|door|window)_/, ''));
          }
        }}
      />

      {/* Floating 3D Room Badges */}
      {showLabels &&
        roomLabels.map((lbl) => {
          if (!lbl) return null;
          return (
            <Html
              key={lbl.id}
              position={lbl.position}
              center
              distanceFactor={18}
              className="pointer-events-none select-none"
            >
              <div
                className={`${
                  selectedElement === lbl.id ? 'ring-2 ring-amber-400' : ''
                } bg-[#151822]/90 backdrop-blur-md border border-blue-500/30 rounded-lg px-2.5 py-1 text-center shadow-lg shadow-black/50 whitespace-nowrap`}
              >
                <p className="text-[11px] font-semibold text-white tracking-wide">{lbl.name}</p>
                <p className="text-[9px] text-blue-400 font-mono">
                  {lbl.area ? `${lbl.area.toFixed(1)} m²` : lbl.type}
                </p>
              </div>
            </Html>
          );
        })}
    </group>
  );
}
