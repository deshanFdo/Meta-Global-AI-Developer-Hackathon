'use client';

import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { HouseAnalysis, GeneratedTextures, ViewerState, FlooringPreset, SolarStudySettings } from '@/types';
import HouseModel from './HouseModel';
import DimensionOverlay from './DimensionOverlay';
import WalkthroughControls from './WalkthroughControls';
import Minimap from './Minimap';
import MeasurementTool, { type MeasurementRecord } from './MeasurementTool';
import WebXRSessionManager from '@/lib/webxr-manager';
import { calculateSolarPosition } from '@/lib/solar-calculator';
import type { FinishSelectionState } from '@/lib/cost-engine';

interface HouseViewerProps {
  analysis: HouseAnalysis | null;
  textures: GeneratedTextures | null;
  viewMode: ViewerState['viewMode'];
  lightingMode?: 'day' | 'golden_hour' | 'night';
  flooringPreset?: FlooringPreset;
  finishes?: FinishSelectionState;
  solarStudy?: SolarStudySettings;
  showWireframe: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  isMeasuring?: boolean;
  showMinimap?: boolean;
  isSoundEnabled?: boolean;
  arScale?: 'real' | 'tabletop';
  selectedElement: string | null;
  onElementClick?: (id: string) => void;
  onExportRef?: (exportFn: () => void) => void;
  onToggleMeasuring?: () => void;
  onToggleMinimap?: () => void;
  onToggleSound?: () => void;
  onOpenFinishCustomizer?: () => void;
  onToggleARScale?: () => void;
}

// Throttled camera tracker to feed 2D Minimap player position and FOV orientation
function CameraTracker({
  onUpdate,
}: {
  onUpdate: (pos: [number, number, number], dir: [number, number]) => void;
}) {
  const { camera } = useThree();
  const dir = useRef(new THREE.Vector3());
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const now = state.clock.getElapsedTime();
    if (now - lastUpdate.current > 0.05) {
      lastUpdate.current = now;
      camera.getWorldDirection(dir.current);
      onUpdate(
        [camera.position.x, camera.position.y, camera.position.z],
        [dir.current.x, dir.current.z]
      );
    }
  });

  return null;
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
      camera.position.set(-1.0, 1.65, 1.0);
      camera.lookAt(1.5, 1.65, 2.5);
    } else {
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
      maxPolarAngle={viewMode === 'top' ? Math.PI / 2 : Math.PI / 2 - 0.02}
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
  finishes,
  solarStudy,
  showWireframe,
  showLabels,
  showDimensions,
  showRoof,
  showFurniture,
  isMeasuring = false,
  showMinimap = true,
  isSoundEnabled = false,
  arScale = 'real',
  selectedElement,
  onElementClick,
  onToggleMeasuring,
  onToggleMinimap,
  onToggleSound,
  onOpenFinishCustomizer,
  onToggleARScale,
}: HouseViewerProps) {
  const [teleportTarget, setTeleportTarget] = useState<[number, number, number] | null>(null);
  const [playerTransform, setPlayerTransform] = useState<{
    pos: [number, number, number];
    dir: [number, number];
  }>({
    pos: [0, 1.65, 0],
    dir: [0, 1],
  });
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
  const [isXRPresenting, setIsXRPresenting] = useState(false);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

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

  // Native WebXR session launcher (Quest 2/3/Pro / PCVR / WebXR AR)
  const handleLaunchNativeVR = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      alert('WebXR is not supported on this browser. Try on Meta Quest Browser or Chrome with WebXR enabled.');
      return;
    }
    try {
      const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!isVRSupported) {
        alert('Immersive VR session is not available on this device.');
        return;
      }
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      if (glRef.current) {
        await glRef.current.xr.setSession(session);
      }
    } catch (err) {
      console.warn('VR session launch failed:', err);
    }
  }, []);

  return (
    <div id="xr-overlay" className="relative w-full h-full bg-[#0c0e14] overflow-hidden select-none">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{
          position: [15, 12, 16],
          fov: 45,
          near: 0.1,
          far: 500,
        }}
        onCreated={({ gl }) => {
          gl.xr.enabled = true;
          glRef.current = gl;
        }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          {/* ======================================================== */}
          {/* ATMOSPHERIC LIGHTING OR DYNAMIC SOLAR STUDY HELIODON     */}
          {/* ======================================================== */}
          {solar ? (
            <>
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

          {/* Camera Tracker for 2D Minimap and HUD */}
          <CameraTracker onUpdate={(pos, dir) => setPlayerTransform({ pos, dir })} />

          {/* WebXR Real-time VR & AR Manager */}
          <WebXRSessionManager
            analysis={analysis}
            arScale={arScale}
            onSessionChange={(inXR) => setIsXRPresenting(inXR)}
          />

          {/* Interactive 3D Laser Dimension / Tape Measure Tool */}
          <MeasurementTool
            active={isMeasuring}
            measurements={measurements}
            onAddMeasurement={(record) => setMeasurements((prev) => [...prev, record])}
            onRemoveMeasurement={(id) => setMeasurements((prev) => prev.filter((m) => m.id !== id))}
          />

          {/* 3D House Model with Pivot-First Interactive Doors & PBR Finishes */}
          <HouseModel
            analysis={analysis}
            textures={textures}
            showWireframe={showWireframe}
            showLabels={showLabels}
            showRoof={showRoof}
            showFurniture={showFurniture}
            flooringPreset={flooringPreset}
            finishes={finishes}
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

      {/* Floating Measurement Status HUD */}
      {(isMeasuring || measurements.length > 0) && (
        <div className="absolute top-16 left-4 z-20 glass-strong rounded-2xl p-2.5 border border-amber-500/30 shadow-2xl flex items-center gap-2.5 text-xs animate-fade-in-up">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Laser Measure</span>
          </div>
          <span className="text-[10px] text-gray-300 hidden sm:inline">
            {isMeasuring ? 'Click surface to set Point A, then Point B' : `${measurements.length} recorded`}
          </span>
          {measurements.length > 0 && (
            <button
              type="button"
              onClick={() => setMeasurements([])}
              className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-medium transition-colors"
            >
              Clear All ({measurements.length})
            </button>
          )}
          {onToggleMeasuring && (
            <button
              type="button"
              onClick={onToggleMeasuring}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-[10px] font-medium transition-colors"
            >
              {isMeasuring ? 'Done' : 'Measure'}
            </button>
          )}
        </div>
      )}

      {/* Floating Quick Action Bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {onOpenFinishCustomizer && (
          <button
            type="button"
            onClick={onOpenFinishCustomizer}
            className="p-2 rounded-xl text-xs font-medium border border-blue-500/40 bg-blue-600/30 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            title="Open BIM Finish Studio & Cost Estimator"
          >
            <span>🎨</span>
            <span>Finishes & Cost</span>
          </button>
        )}

        {/* Native WebXR VR Launcher */}
        <button
          type="button"
          onClick={handleLaunchNativeVR}
          className="p-2 rounded-xl text-xs font-medium border border-purple-500/40 bg-purple-600/20 text-purple-200 hover:bg-purple-600 hover:text-white transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5"
          title="Launch Immersive VR (Meta Quest Browser / WebXR)"
        >
          <span>🥽</span>
          <span>WebXR VR</span>
        </button>

        {onToggleARScale && (
          <button
            type="button"
            onClick={onToggleARScale}
            className="p-2 rounded-xl text-xs font-medium border border-white/10 glass-strong text-gray-300 hover:text-white transition-all"
            title="Toggle 1:1 Life Size vs 1:20 Tabletop Scale"
          >
            {arScale === 'tabletop' ? '📐 1:20 Scale' : '🏛️ 1:1 Scale'}
          </button>
        )}

        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-2 rounded-xl text-xs font-medium border transition-all ${
              isSoundEnabled
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                : 'glass-strong border-white/10 text-gray-300 hover:text-white'
            }`}
            title={isSoundEnabled ? 'Mute Spatial Audio' : 'Enable Spatial Audio'}
          >
            {isSoundEnabled ? '🔊 Sound On' : '🔇 Audio'}
          </button>
        )}

        {onToggleMeasuring && (
          <button
            type="button"
            onClick={onToggleMeasuring}
            className={`p-2 rounded-xl text-xs font-medium border transition-all ${
              isMeasuring
                ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-500/30'
                : 'glass-strong border-white/10 text-gray-300 hover:text-white'
            }`}
            title="Toggle Laser Tape Measure"
          >
            📏 Ruler
          </button>
        )}

        {onToggleMinimap && (
          <button
            type="button"
            onClick={onToggleMinimap}
            className={`p-2 rounded-xl text-xs font-medium border transition-all ${
              showMinimap
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                : 'glass-strong border-white/10 text-gray-300 hover:text-white'
            }`}
            title="Toggle 2D Radar Minimap"
          >
            🗺️ Radar
          </button>
        )}
      </div>

      {/* 2D Architectural Minimap Overlay */}
      {showMinimap && (
        <div className="absolute bottom-6 left-6 z-20">
          <Minimap
            analysis={analysis}
            playerPos={playerTransform.pos}
            playerDir={playerTransform.dir}
            onTeleport={(target) => setTeleportTarget(target)}
            onSelectRoom={onElementClick}
          />
        </div>
      )}

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
        {isXRPresenting
          ? 'WebXR Active | Right Trigger: Teleport | Left Stick: Move'
          : viewMode === 'first-person'
          ? 'WASD / Arrow Keys: Walk | Mouse: Look | Click doors to open/close'
          : isMeasuring
          ? 'Tape Measure active: Click point A, then click point B'
          : 'Left Click: Rotate | Right Click: Pan | Click doors to swing open'}
      </div>
    </div>
  );
}
