'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { HouseAnalysis, GeneratedTextures, ViewerState } from '@/types';
import HouseModel from './HouseModel';
import DimensionOverlay from './DimensionOverlay';

interface HouseViewerProps {
  analysis: HouseAnalysis | null;
  textures: GeneratedTextures | null;
  viewMode: ViewerState['viewMode'];
  lightingMode?: 'day' | 'golden_hour' | 'night';
  showWireframe: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  showRoof: boolean;
  selectedElement: string | null;
  onElementClick?: (id: string) => void;
  onExportRef?: (exportFn: () => void) => void;
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
    } else if (viewMode === 'first-person') {
      // First-person walkthrough: Human eye-height (1.65m) inside Living Room looking toward Terrace
      camera.position.set(-1.0, 1.65, 1.0);
      camera.lookAt(1.5, 1.65, 2.5);
    } else {
      // Perspective default
      camera.position.set(size * 0.9, size * 0.8, size * 1.0);
      camera.lookAt(0, 0, 0);
    }

    if (controlsRef.current) {
      if (viewMode === 'first-person') {
        controlsRef.current.target.set(1.5, 1.65, 2.5);
        controlsRef.current.minDistance = 0.1;
        controlsRef.current.maxDistance = 40;
      } else {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.minDistance = 2;
        controlsRef.current.maxDistance = 100;
      }
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
      minDistance={viewMode === 'first-person' ? 0.1 : 2}
      maxDistance={viewMode === 'first-person' ? 40 : 100}
    />
  );
}

export default function HouseViewer({
  analysis,
  textures,
  viewMode,
  lightingMode = 'day',
  showWireframe,
  showLabels,
  showDimensions,
  showRoof,
  selectedElement,
  onElementClick,
}: HouseViewerProps) {
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
          {/* ======================================================== */}
          {/* ATMOSPHERIC LIGHTING MODES (Day, Golden Hour, Night)    */}
          {/* ======================================================== */}
          {lightingMode === 'day' && (
            <>
              <ambientLight intensity={0.65} color="#eef4ff" />
              <directionalLight
                position={[20, 32, 20]}
                intensity={1.3}
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
            </>
          )}

          {lightingMode === 'golden_hour' && (
            <>
              <ambientLight intensity={0.5} color="#ffd4aa" />
              <directionalLight
                position={[32, 12, 22]}
                intensity={1.7}
                color="#ff9944"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={100}
                shadow-camera-left={-25}
                shadow-camera-right={25}
                shadow-camera-top={25}
                shadow-camera-bottom={-25}
              />
              <directionalLight position={[-15, 10, -15]} intensity={0.25} color="#406080" />
              <hemisphereLight args={['#ffd0a0', '#203045', 0.5]} />
            </>
          )}

          {lightingMode === 'night' && (
            <>
              {/* Moonlight */}
              <ambientLight intensity={0.22} color="#152035" />
              <directionalLight position={[15, 25, 15]} intensity={0.35} color="#7090c0" castShadow />

              {/* Interior Warm Recessed LED Downlights (3000K) */}
              <pointLight position={[0, 2.5, 1.5]} intensity={2.0} distance={8} color="#ffe2a0" />
              <pointLight position={[-5.3, 2.5, -4.2]} intensity={1.5} distance={6} color="#ffd690" />
              <pointLight position={[4.8, 2.5, -4.2]} intensity={1.5} distance={6} color="#ffd690" />
              <pointLight position={[4.8, 2.5, 0]} intensity={1.5} distance={6} color="#ffd690" />
              <pointLight position={[4.8, 2.5, 3.8]} intensity={1.5} distance={6} color="#ffd690" />
              <pointLight position={[-0.2, 2.5, -4.2]} intensity={1.2} distance={5} color="#ffffff" />
              <pointLight position={[0, 2.5, 4.8]} intensity={1.5} distance={7} color="#ffb060" />
            </>
          )}

          {/* Camera Controller & OrbitControls */}
          <CameraController viewMode={viewMode} analysis={analysis} />

          {/* 3D House Model with PBR Procedural Textures */}
          <HouseModel
            analysis={analysis}
            textures={textures}
            showWireframe={showWireframe}
            showLabels={showLabels}
            showRoof={showRoof}
            selectedElement={selectedElement}
            onElementClick={onElementClick}
          />

          {/* Interactive 3D CAD Metric Dimension Chains */}
          <DimensionOverlay analysis={analysis} visible={showDimensions} />

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
            {analysis.metadata.overallWidth.toFixed(1)}m × {analysis.metadata.overallDepth.toFixed(1)}m | Premises: 122.4m² | Terrace: 22.5m²
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
