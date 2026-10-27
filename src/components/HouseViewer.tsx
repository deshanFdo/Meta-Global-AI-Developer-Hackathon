'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { HouseAnalysis, GeneratedTextures, ViewerState } from '@/types';
import HouseModel from './HouseModel';

interface HouseViewerProps {
  analysis: HouseAnalysis | null;
  textures: GeneratedTextures | null;
  viewMode: ViewerState['viewMode'];
  showWireframe: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  selectedElement: string | null;
  onElementClick?: (id: string) => void;
}

// Controller to animate / adjust camera depending on selected ViewMode
function CameraController({
  viewMode,
  analysis,
}: {
  viewMode: ViewerState['viewMode'];
  analysis: HouseAnalysis | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const size = analysis
      ? Math.max(analysis.metadata.overallWidth, analysis.metadata.overallDepth) * 1.5
      : 20;

    if (viewMode === 'top') {
      camera.position.set(0, size * 1.2, 0.001);
      camera.lookAt(0, 0, 0);
    } else if (viewMode === 'front') {
      camera.position.set(0, size * 0.3, size * 1.1);
      camera.lookAt(0, 0, 0);
    } else if (viewMode === 'side') {
      camera.position.set(size * 1.1, size * 0.3, 0);
      camera.lookAt(0, 0, 0);
    } else {
      // Perspective default
      camera.position.set(size * 0.9, size * 0.8, size * 1.0);
      camera.lookAt(0, 0, 0);
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [viewMode, analysis, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      maxPolarAngle={viewMode === 'top' ? Math.PI / 2 : Math.PI / 2 - 0.02} // don't go below ground
      minDistance={2}
      maxDistance={100}
    />
  );
}

export default function HouseViewer({
  analysis,
  textures,
  viewMode,
  showWireframe,
  showLabels,
  showDimensions,
  selectedElement,
  onElementClick,
}: HouseViewerProps) {
  void showDimensions;

  if (!analysis) return null;

  return (
    <div className="relative w-full h-full bg-[#0c0e14] overflow-hidden select-none">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{
          position: [15, 12, 16],
          fov: 45,
          near: 0.1,
          far: 500,
        }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.65} />
          <directionalLight
            position={[20, 30, 20]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={100}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
          />
          <directionalLight position={[-15, 15, -15]} intensity={0.3} color="#90b0e0" />
          <hemisphereLight args={['#d0e0ff', '#1a202c', 0.4]} />

          {/* Camera Controller & OrbitControls */}
          <CameraController viewMode={viewMode} analysis={analysis} />

          {/* 3D House Model */}
          <HouseModel
            analysis={analysis}
            textures={textures}
            showWireframe={showWireframe}
            showLabels={showLabels}
            selectedElement={selectedElement}
            onElementClick={onElementClick}
          />

          {/* Architectural Ground Grid */}
          <Grid
            renderOrder={-1}
            position={[0, -0.01, 0]}
            infiniteGrid
            cellSize={1}
            cellThickness={0.6}
            cellColor="#262b3d"
            sectionSize={5}
            sectionThickness={1.2}
            sectionColor="#3b82f6"
            fadeDistance={60}
            fadeStrength={1.5}
          />
        </Suspense>
      </Canvas>

      {/* Floating Info Overlay in 3D Viewer */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5">
        <div className="glass-strong rounded-xl px-3 py-2 border border-white/10 shadow-lg">
          <p className="text-xs font-semibold text-white">
            {analysis.metadata.style}
          </p>
          <p className="text-[10px] text-gray-400">
            {analysis.metadata.overallWidth.toFixed(1)}m × {analysis.metadata.overallDepth.toFixed(1)}m | Area: {analysis.metadata.totalArea.toFixed(1)}m²
          </p>
        </div>
      </div>

      {/* Camera hint badge */}
      <div className="absolute bottom-4 right-4 pointer-events-none glass-subtle rounded-lg px-2.5 py-1 text-[11px] text-gray-400 border border-white/5">
        Left Click: Rotate | Right Click: Pan | Scroll: Zoom
      </div>
    </div>
  );
}
