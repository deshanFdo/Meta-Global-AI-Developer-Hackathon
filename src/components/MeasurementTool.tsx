'use client';

import React, { useState, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface MeasurementRecord {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  distance: number;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

interface MeasurementToolProps {
  active: boolean;
  measurements: MeasurementRecord[];
  onAddMeasurement: (record: MeasurementRecord) => void;
  onRemoveMeasurement: (id: string) => void;
}

export default function MeasurementTool({
  active,
  measurements,
  onAddMeasurement,
  onRemoveMeasurement,
}: MeasurementToolProps) {
  const { raycaster, scene, camera, pointer } = useThree();
  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(null);
  const [currentHover, setCurrentHover] = useState<[number, number, number] | null>(null);
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectPoint = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!active) {
      if (startPoint) setStartPoint(null);
      if (currentHover) setCurrentHover(null);
      return;
    }

    raycaster.setFromCamera(pointer, camera);

    // First try raycasting against solid geometry in scene
    const intersects = raycaster.intersectObjects(scene.children, true);
    // Filter out helper lines or UI elements
    const validHit = intersects.find(
      (hit) => hit.object.type === 'Mesh' && hit.point && !hit.object.name.includes('helper')
    );

    if (validHit) {
      setCurrentHover([validHit.point.x, validHit.point.y, validHit.point.z]);
    } else {
      // Fall back to ground plane intersection
      if (raycaster.ray.intersectPlane(groundPlane.current, intersectPoint.current)) {
        setCurrentHover([
          intersectPoint.current.x,
          intersectPoint.current.y,
          intersectPoint.current.z,
        ]);
      }
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    if (!active || !currentHover) return;
    e.stopPropagation();

    if (!startPoint) {
      // Set anchor start point
      setStartPoint([...currentHover]);
    } else {
      // Set end point & complete measurement
      const dx = currentHover[0] - startPoint[0];
      const dy = currentHover[1] - startPoint[1];
      const dz = currentHover[2] - startPoint[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Only save if points are not identical (> 5cm)
      if (distance > 0.05) {
        onAddMeasurement({
          id: `measure-${Date.now()}`,
          start: startPoint,
          end: [...currentHover],
          distance,
          deltaX: Math.abs(dx),
          deltaY: Math.abs(dy),
          deltaZ: Math.abs(dz),
        });
      }
      setStartPoint(null);
    }
  };

  return (
    <group onPointerDown={active ? handleClick : undefined}>
      {/* Invisible broad raycast catch plane when measuring */}
      {active && (
        <mesh visible={false} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Dynamic Rubber-band Laser Line while dragging to Point 2 */}
      {active && startPoint && currentHover && (
        <group>
          {/* Pulsing Start Anchor Pin */}
          <mesh position={startPoint}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>

          {/* Current cursor endpoint pin */}
          <mesh position={currentHover}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>

          {/* Glowing Dimension Laser Line */}
          <line>
            <bufferGeometry
              attach="geometry"
              onUpdate={(geo) => {
                const positions = new Float32Array([
                  startPoint[0], startPoint[1] + 0.02, startPoint[2],
                  currentHover[0], currentHover[1] + 0.02, currentHover[2],
                ]);
                geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
              }}
            />
            <lineBasicMaterial attach="material" color="#38bdf8" linewidth={3} />
          </line>

          {/* Real-time floating dimension badge at midpoint */}
          <Html
            position={[
              (startPoint[0] + currentHover[0]) / 2,
              Math.max(startPoint[1], currentHover[1]) + 0.25,
              (startPoint[2] + currentHover[2]) / 2,
            ]}
            center
            distanceFactor={18}
          >
            <div className="bg-slate-900/90 text-amber-300 font-mono text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 shadow-xl pointer-events-none whitespace-nowrap backdrop-blur-sm">
              ↔{' '}
              {Math.sqrt(
                Math.pow(currentHover[0] - startPoint[0], 2) +
                Math.pow(currentHover[1] - startPoint[1], 2) +
                Math.pow(currentHover[2] - startPoint[2], 2)
              ).toFixed(2)}
              m
            </div>
          </Html>
        </group>
      )}

      {/* Render all committed measurements */}
      {measurements.map((m) => {
        const midX = (m.start[0] + m.end[0]) / 2;
        const midY = (m.start[1] + m.end[1]) / 2 + 0.2;
        const midZ = (m.start[2] + m.end[2]) / 2;

        return (
          <group key={m.id}>
            {/* Start & End Anchor spheres */}
            <mesh position={m.start}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>
            <mesh position={m.end}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>

            {/* Dimension line */}
            <line>
              <bufferGeometry
                attach="geometry"
                onUpdate={(geo) => {
                  const positions = new Float32Array([
                    m.start[0], m.start[1] + 0.02, m.start[2],
                    m.end[0], m.end[1] + 0.02, m.end[2],
                  ]);
                  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                }}
              />
              <lineBasicMaterial attach="material" color="#10b981" linewidth={2} />
            </line>

            {/* Architectural CAD Dimension Tag Badge */}
            <Html position={[midX, midY, midZ]} center distanceFactor={18}>
              <div className="glass-strong text-white font-mono text-[11px] px-2.5 py-1.5 rounded-lg border border-emerald-500/40 shadow-2xl flex items-center gap-2 select-none">
                <span className="text-emerald-400 font-bold">
                  ↔ {m.distance.toFixed(2)}m
                </span>
                <span className="text-[9px] text-gray-400 hidden sm:inline">
                  (ΔX:{m.deltaX.toFixed(2)}m, ΔZ:{m.deltaZ.toFixed(2)}m)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveMeasurement(m.id);
                  }}
                  className="w-4 h-4 rounded-full bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center text-[10px] transition-colors"
                  title="Delete measurement"
                >
                  ✕
                </button>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

