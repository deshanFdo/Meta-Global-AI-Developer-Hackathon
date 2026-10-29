'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { HouseAnalysis, GeneratedTextures, ViewerState, FlooringPreset, SolarStudySettings } from '@/types';
import HouseModel from './HouseModel';
import DimensionOverlay from './DimensionOverlay';
import WalkthroughControls from './WalkthroughControls';
import { calculateSolarPosition } from '@/lib/solar-calculator';

interface HouseViewerProps {
  analysis: HouseAnalysis | null;
  textures: GeneratedTextures | null;
  viewMode: ViewerState['viewMode'];
  lightingMode?: 'day' | 'golden_hour' | 'night';
  flooringPreset?: FlooringPreset;
  solarStudy?: SolarStudySettings;
  showWireframe: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  selectedElement: string | null;
  onElementClick?: (id: string) => void;
  onExportRef?: (exportFn: () => void) => void;
}

// Controller to animate / adjust camera depending on selected ViewMode
function CameraController({
  viewMode,
  analysis,
  teleportTarget,
}: {
  viewMode: ViewerState['viewMode'];
  analysis: HouseAnalysis | null;
  teleportTarget: [number, number, number] | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (teleportTarget) {
      camera.position.set(teleportTarget[0], teleportTarget[1], teleportTarget[2]);
      if (controlsRef.current) {
        controlsRef.current.target.set(teleportTarget[0] + 0.5, teleportTarget[1], teleportTarget[2] + 1.0);
        controlsRef.current.update();
      }
      return;
    }

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
  }, [viewMode, analysis, camera, teleportTarget]);

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
  flooringPreset = 'scandinavian_oak',
  solarStudy,
  showWireframe,
  showLabels,
  showDimensions,
  showRoof,
  showFurniture,
  selectedElement,
  onElementClick,
}: HouseViewerProps) {
  const [teleportTarget, setTeleportTarget] = React.useState<[number, number, number] | null>(null);

  if (!analysis) return null;

  // Compute dynamic solar calculation if solar study is active
  const solar = solarStudy?.enabled ? calculateSolarPosition(solarStudy) : null;

  // Preset room teleport destinations
  const teleportRooms: { name: string; icon: string; pos: [number, number, number] }[] = [
    { name: 'Living Room', icon: '🛋️', pos: [-0.8, 1.65, 0.8] },
    { name: 'Kitchen', icon: '🍳', pos: [-3.0, 1.65, 0.8] },
    { name: 'Terrace', icon: '🌅', pos: [-1.0, 1.65, 4.5] },
    { name: 'Foyer', icon: '🚪', pos: [-5.8, 1.65, 2.5] },
    { name: 'Master Bed', icon: '🛏️', pos: [4.8, 1.65, -4.0] },
    { name: 'Bed NW', icon: '🛏️', pos: [-5.2, 1.65, -4.0] },
    { name: 'Main Bath', icon: '🛁', pos: [0.0, 1.65, -4.0] },
    { name: 'Bed SE', icon: '🛏️', pos: [4.8, 1.65, 3.5] },
  ];

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
          {/* ATMOSPHERIC LIGHTING OR DYNAMIC SOLAR STUDY HELIODON     */}
          {/* ======================================================== */}
          {solar ? (
            <>
              {/* Dynamic Sun Light calculated from Heliodon Altitude & Azimuth */}
              <ambientLight intensity={solar.isNight ? 0.2 : 0.6} color={solar.isNight ? '#152035' : '#EEF4FF'} />
              <directionalLight
                position={solar.position3D}
                intensity={solar.intensity}
                color={solar.color}
                castShadow={!solar.isNight}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={120}
                shadow-camera-left={-25}
                shadow-camera-right={25}
                shadow-camera-top={25}
                shadow-camera-bottom={-25}
              />
              {solar.isNight ? (
                <>
                  {/* Interior Recessed LED Lighting */}
                  <pointLight position={[0, 2.5, 1.5]} intensity={2.0} distance={8} color="#ffe2a0" />
                  <pointLight position={[-5.3, 2.5, -4.2]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[4.8, 2.5, -4.2]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[4.8, 2.5, 0]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[4.8, 2.5, 3.8]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[-0.2, 2.5, -4.2]} intensity={1.2} distance={5} color="#ffffff" />
                  <pointLight position={[0, 2.5, 4.8]} intensity={1.5} distance={7} color="#ffb060" />
                </>
              ) : (
                <hemisphereLight args={['#d0e0ff', '#1a202c', 0.45]} />
              )}
            </>
          ) : (
            <>
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
                  <ambientLight intensity={0.22} color="#152035" />
                  <directionalLight position={[15, 25, 15]} intensity={0.35} color="#7090c0" castShadow />
                  <pointLight position={[0, 2.5, 1.5]} intensity={2.0} distance={8} color="#ffe2a0" />
                  <pointLight position={[-5.3, 2.5, -4.2]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[4.8, 2.5, -4.2]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[4.8, 2.5, 0]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[4.8, 2.5, 3.8]} intensity={1.5} distance={6} color="#ffd690" />
                  <pointLight position={[-0.2, 2.5, -4.2]} intensity={1.2} distance={5} color="#ffffff" />
                  <pointLight position={[0, 2.5, 4.8]} intensity={1.5} distance={7} color="#ffb060" />
                </>
              )}
            </>
          )}

          {/* Camera Controller & OrbitControls */}
          <CameraController
            viewMode={viewMode}
            analysis={analysis}
            teleportTarget={teleportTarget}
          />

          {/* Interactive Keyboard Walkthrough Navigation */}
          <WalkthroughControls
            analysis={analysis}
            active={viewMode === 'first-person'}
          />

          {/* 3D House Model with PBR Procedural Textures */}
          <HouseModel
            analysis={analysis}
            textures={textures}
            showWireframe={showWireframe}
            showLabels={showLabels}
            showRoof={showRoof}
            showFurniture={showFurniture}
            flooringPreset={flooringPreset}
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
            {analysis.metadata.overallWidth.toFixed(1)}m × {analysis.metadata.overallDepth.toFixed(1)}m | Plan area: {analysis.metadata.totalArea.toFixed(1)}m²
          </p>
        </div>
      </div>

      {/* Floating Room Teleporter Quick-Nav (when in Walk mode) */}
      {viewMode === 'first-person' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 glass-strong rounded-2xl p-1.5 border border-white/10 shadow-2xl flex items-center gap-1 overflow-x-auto max-w-[90vw]">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-2 hidden sm:inline">
            Teleport:
          </span>
          {teleportRooms.map((r) => (
            <button
              key={r.name}
              type="button"
              onClick={() => setTeleportTarget([...r.pos])}
              className="py-1 px-2.5 rounded-xl bg-white/5 hover:bg-blue-600 text-white text-[11px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>{r.icon}</span>
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Camera / Navigation hint badge */}
      <div className="absolute bottom-4 right-4 pointer-events-none glass-subtle rounded-lg px-2.5 py-1 text-[11px] text-gray-400 border border-white/5">
        {viewMode === 'first-person'
          ? 'WASD / Arrow Keys: Walk | Mouse: Look Around'
          : 'Left Click: Rotate | Right Click: Pan | Scroll: Zoom'}
      </div>
    </div>
  );
}
