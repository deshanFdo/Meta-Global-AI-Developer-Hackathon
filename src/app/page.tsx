'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type {
  AnalyzeResponse,
  HouseAnalysis,
  PipelineProgress as PipelineProgressType,
  PipelineStage,
  ViewerState,
  FlooringPreset,
  SolarStudySettings,
} from '@/types';

import UploadZone from '@/components/UploadZone';
import PipelineProgress from '@/components/PipelineProgress';
import ViewControls from '@/components/ViewControls';
import ArchitectureInspector from '@/components/ArchitectureInspector';
import FinishCustomizer from '@/components/FinishCustomizer';
import { exportHouseToGLB } from '@/lib/export-3d';
import { exportHouseToDXF, exportHouseScheduleCSV } from '@/lib/dxf-exporter';
import SolarStudyControl from '@/components/SolarStudyControl';
import ARModal from '@/components/ARModal';
import PlanAssistant from '@/components/PlanAssistant';
import { GeometryEngine } from '@/lib/geometry-engine';
import { soundscape } from '@/lib/soundscape';
import type { FinishSelectionState } from '@/lib/cost-engine';

const HouseViewer = dynamic(() => import('@/components/HouseViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0c0e14]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400">Loading 3D Canvas…</p>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_PIPELINE: PipelineProgressType = {
  stage: 'idle',
  progress: 0,
  message: '',
  startedAt: 0,
};

const INITIAL_VIEWER: ViewerState = {
  isLoading: false,
  analysis: null,
  textures: null,
  selectedElement: null,
  viewMode: 'perspective',
  showLabels: true,
  showDimensions: false,
  showWireframe: false,
  showRoof: false, // Start in Dollhouse cutaway mode so interior rooms & furniture are visible!
  showFurniture: true,
  currentFloor: 0,
};

const INITIAL_FINISHES: FinishSelectionState = {
  globalWall: 'warm-alabaster',
  globalFloor: 'oak-parquet',
  globalTrim: 'matte-black',
  roomOverrides: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [viewer, setViewer] = useState<ViewerState>(INITIAL_VIEWER);
  const [pipeline, setPipeline] = useState<PipelineProgressType>(INITIAL_PIPELINE);
  const [preview, setPreview] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isFinishCustomizerOpen, setIsFinishCustomizerOpen] = useState(false);
  const [finishes, setFinishes] = useState<FinishSelectionState>(INITIAL_FINISHES);
  const [lightingMode, setLightingMode] = useState<'day' | 'golden_hour' | 'night'>('day');
  const [flooringPreset, setFlooringPreset] = useState<FlooringPreset>('scandinavian_oak');
  const [solarStudy, setSolarStudy] = useState<SolarStudySettings>({
    enabled: false,
    timeOfDay: 14.5,
    season: 'summer',
    latitude: 45.0,
  });
  const [isSolarStudyOpen, setIsSolarStudyOpen] = useState(false);
  const [isARModalOpen, setIsARModalOpen] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [arScale, setArScale] = useState<'real' | 'tabletop'>('real');
  const [selectedArchetype, setSelectedArchetype] = useState<'villa' | 'loft' | 'eco_cabin'>('villa');

  // ---- pipeline helpers ----------------------------------------------------

  const advancePipeline = useCallback(
    (stage: PipelineStage, message: string, progress = 0) => {
      setPipeline((prev) => ({
        ...prev,
        stage,
        message,
        progress,
        startedAt: prev.startedAt || Date.now(),
      }));
    },
    [],
  );

  // ---- upload & analyze ----------------------------------------------------

  const handleFileSelect = useCallback(
    async (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      setViewer((prev) => ({ ...prev, isLoading: true, analysis: null, textures: null }));
      setPipeline({ stage: 'uploading', progress: 0, message: 'Preparing image…', startedAt: Date.now() });

      try {
        advancePipeline('uploading', 'Encoding image…', 30);
        const base64 = await fileToBase64(file);
        advancePipeline('uploading', 'Image encoded', 100);

        advancePipeline('analyzing_structure', 'Analyzing with Meta Muse Spark…', 10);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            mimeType: file.type || 'image/png',
            imageType: 'floor_plan',
            options: { generateTextures: false, detailLevel: 'high' },
          }),
        });

        const data: AnalyzeResponse = await response.json();
        if (!response.ok) throw new Error(data.error ?? `Server responded with ${response.status}`);
        if (!data.success || !data.analysis) {
          throw new Error(data.error ?? 'Analysis failed');
        }

        setPipeline({
          stage: 'complete',
          progress: 100,
          message: 'Model ready',
          startedAt: pipeline.startedAt || Date.now(),
        });

        setViewer((prev) => ({
          ...prev,
          isLoading: false,
          analysis: data.analysis as HouseAnalysis,
          textures: data.textures ?? null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setPipeline({
          stage: 'error',
          progress: 0,
          message,
          startedAt: pipeline.startedAt || Date.now(),
        });
        setViewer((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [advancePipeline, pipeline.startedAt],
  );

  const handleLoadArchetype = useCallback(
    async (arch: 'villa' | 'loft' | 'eco_cabin') => {
      setSelectedArchetype(arch);
      setPreview(arch === 'villa' ? '/sample-floorplan.png' : null);
      setViewer((prev) => ({ ...prev, isLoading: true, analysis: null, textures: null }));

      const labels = {
        villa: 'Scandinavian Villa (122.4 m²)',
        loft: 'Industrial Urban Loft (74.2 m²)',
        eco_cabin: 'Eco Timber Micro-Cabin (42.5 m²)',
      };

      setPipeline({
        stage: 'uploading',
        progress: 20,
        message: `Loading ${labels[arch]}…`,
        startedAt: Date.now(),
      });

      try {
        advancePipeline('analyzing_structure', `Extracting ${labels[arch]} layout…`, 45);
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: 'archetype',
            archetype: arch,
            isDemo: true,
          }),
        });

        advancePipeline('uploading', 'Generating 3D BIM geometry…', 80);
        const data: AnalyzeResponse = await res.json();
        if (!data.success || !data.analysis) {
          throw new Error(data.error ?? 'Analysis failed');
        }

        advancePipeline('complete', 'Model ready', 100);

        setViewer((prev) => ({
          ...prev,
          isLoading: false,
          analysis: data.analysis as HouseAnalysis,
          textures: data.textures ?? null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load archetype';
        setPipeline({ stage: 'error', progress: 0, message, startedAt: Date.now() });
        setViewer((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [advancePipeline],
  );

  const handleExportGLB = useCallback(() => {
    if (!viewer.analysis) return;
    const engine = new GeometryEngine();
    const house = engine.generateHouseGeometry(viewer.analysis, { showRoof: true, showFurniture: true });
    exportHouseToGLB(house, `${viewer.analysis.metadata.style.toLowerCase().replace(/\s+/g, '-')}-3d-model.glb`);
  }, [viewer.analysis]);

  const handleExportDXF = useCallback(() => {
    if (!viewer.analysis) return;
    exportHouseToDXF(viewer.analysis, `${viewer.analysis.metadata.style.toLowerCase().replace(/\s+/g, '-')}-cad.dxf`);
  }, [viewer.analysis]);

  const handleExportCSV = useCallback(() => {
    if (!viewer.analysis) return;
    exportHouseScheduleCSV(viewer.analysis, `${viewer.analysis.metadata.style.toLowerCase().replace(/\s+/g, '-')}-schedules.csv`);
  }, [viewer.analysis]);

  const handleToggleSolarStudy = useCallback(() => {
    setIsSolarStudyOpen((p) => {
      const next = !p;
      setSolarStudy((s) => ({ ...s, enabled: next }));
      return next;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      soundscape.setMuted(!next);
      return next;
    });
  }, []);

  const handleLightingChange = useCallback((mode: 'day' | 'golden_hour' | 'night') => {
    setLightingMode(mode);
    soundscape.setNightMode(mode === 'night');
  }, []);

  // ---- render --------------------------------------------------------------

  const isProcessing = viewer.isLoading;
  const hasAnalysis = viewer.analysis !== null;
  const totalFloors = 1;

  return (
    <div className="h-screen flex flex-col overflow-hidden font-[family-name:var(--font-geist-sans)]">
      {/* ================================================================
          Header
          ================================================================ */}
      <header className="flex-shrink-0 glass-strong border-b border-[var(--border)] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient leading-tight">BlueprintTo3D</h1>
              <p className="text-[10px] text-[var(--text-muted)] leading-none hidden sm:block">
                AI-Powered Floor Plan to 3D Model&nbsp;&nbsp;•&nbsp;&nbsp;Meta AI Hackathon 2026
              </p>
            </div>
          </div>

          {/* Archetype Selector & Status badge */}
          <div className="flex items-center gap-2">
            {/* Instant Archetype Switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => handleLoadArchetype('villa')}
                disabled={isProcessing}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all font-medium ${
                  selectedArchetype === 'villa' && hasAnalysis
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                🏡 Villa (122m²)
              </button>
              <button
                type="button"
                onClick={() => handleLoadArchetype('loft')}
                disabled={isProcessing}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all font-medium ${
                  selectedArchetype === 'loft' && hasAnalysis
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                🏙️ Loft (74m²)
              </button>
              <button
                type="button"
                onClick={() => handleLoadArchetype('eco_cabin')}
                disabled={isProcessing}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all font-medium ${
                  selectedArchetype === 'eco_cabin' && hasAnalysis
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                🌲 Cabin (42m²)
              </button>
            </div>

            {/* Mobile simplified sample button */}
            <button
              type="button"
              onClick={() => handleLoadArchetype('villa')}
              disabled={isProcessing}
              className="sm:hidden text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2.5 py-1.5 rounded-lg"
            >
              ⚡ Demo
            </button>

            {hasAnalysis && (
              <button
                type="button"
                onClick={() => setIsFinishCustomizerOpen((p) => !p)}
                className={`text-xs border px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                  isFinishCustomizerOpen
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-emerald-300 border-emerald-500/30'
                }`}
              >
                <span>🎨</span>
                <span>BIM Finishes</span>
              </button>
            )}

            {isProcessing && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--accent)] bg-[var(--accent-muted)] px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Processing
              </span>
            )}
            {hasAnalysis && !isProcessing && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-green-500/10 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                Model Ready
              </span>
            )}
            {hasAnalysis && (
              <button
                type="button"
                onClick={() => setIsInspectorOpen((p) => !p)}
                className={`text-xs border px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                  isInspectorOpen
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/10'
                }`}
              >
                <span>🤖</span>
                <span>Plan Inspector</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================
          Main Content
          ================================================================ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ---- Left Panel ---- */}
        <aside className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Upload */}
            <UploadZone
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
              preview={preview}
            />

            {/* Pipeline Progress */}
            {pipeline.stage !== 'idle' && <PipelineProgress progress={pipeline} />}

            {viewer.analysis && (
              <PlanAssistant
                key={viewer.analysis.id}
                analysis={viewer.analysis}
                onSelect={(id) => setViewer((prev) => ({ ...prev, selectedElement: id }))}
              />
            )}

            {/* View Controls */}
            {hasAnalysis && (
              <ViewControls
                viewMode={viewer.viewMode}
                lightingMode={lightingMode}
                flooringPreset={flooringPreset}
                isSolarStudyOpen={isSolarStudyOpen}
                showWireframe={viewer.showWireframe}
                showLabels={viewer.showLabels}
                showDimensions={viewer.showDimensions}
                showRoof={viewer.showRoof}
                showFurniture={viewer.showFurniture}
                isMeasuring={isMeasuring}
                showMinimap={showMinimap}
                isSoundEnabled={isSoundEnabled}
                currentFloor={viewer.currentFloor}
                totalFloors={totalFloors}
                onViewModeChange={(mode) => setViewer((prev) => ({ ...prev, viewMode: mode }))}
                onLightingChange={handleLightingChange}
                onFlooringChange={setFlooringPreset}
                onToggleSolarStudy={handleToggleSolarStudy}
                onToggleMeasuring={() => setIsMeasuring((p) => !p)}
                onToggleMinimap={() => setShowMinimap((p) => !p)}
                onToggleSound={handleToggleSound}
                onToggleRoof={() => setViewer((prev) => ({ ...prev, showRoof: !prev.showRoof }))}
                onToggleFurniture={() => setViewer((prev) => ({ ...prev, showFurniture: !prev.showFurniture }))}
                onToggleWireframe={() =>
                  setViewer((prev) => ({ ...prev, showWireframe: !prev.showWireframe }))
                }
                onToggleLabels={() =>
                  setViewer((prev) => ({ ...prev, showLabels: !prev.showLabels }))
                }
                onToggleDimensions={() =>
                  setViewer((prev) => ({ ...prev, showDimensions: !prev.showDimensions }))
                }
                onFloorChange={(floor) =>
                  setViewer((prev) => ({ ...prev, currentFloor: floor }))
                }
                onExportGLB={handleExportGLB}
                onExportDXF={handleExportDXF}
                onExportCSV={handleExportCSV}
                onOpenAR={() => setIsARModalOpen(true)}
              />
            )}
          </div>
        </aside>

        {/* ---- Right Panel (3D Viewer) ---- */}
        <main className="flex-1 relative bg-[#0a0c12] overflow-hidden">
          {hasAnalysis ? (
            <HouseViewer
              analysis={viewer.analysis}
              textures={viewer.textures}
              viewMode={viewer.viewMode}
              lightingMode={lightingMode}
              flooringPreset={flooringPreset}
              finishes={finishes}
              solarStudy={solarStudy}
              showWireframe={viewer.showWireframe}
              showLabels={viewer.showLabels}
              showDimensions={viewer.showDimensions}
              showRoof={viewer.showRoof}
              showFurniture={viewer.showFurniture}
              isMeasuring={isMeasuring}
              showMinimap={showMinimap}
              isSoundEnabled={isSoundEnabled}
              arScale={arScale}
              selectedElement={viewer.selectedElement}
              onElementClick={(id) => setViewer((prev) => ({ ...prev, selectedElement: id }))}
              onToggleMeasuring={() => setIsMeasuring((p) => !p)}
              onToggleMinimap={() => setShowMinimap((p) => !p)}
              onToggleSound={handleToggleSound}
              onOpenFinishCustomizer={() => setIsFinishCustomizerOpen(true)}
              onToggleARScale={() => setArScale((s) => (s === 'real' ? 'tabletop' : 'real'))}
            />
          ) : (
            /* Enhanced 3-Archetype Showcase Grid when no floor plan is loaded */
            <div className="w-full h-full flex items-center justify-center p-6">
              <div className="text-center space-y-6 max-w-lg">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-[var(--border)] rotate-6" />
                  <div className="absolute inset-0 rounded-3xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-xl">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="38"
                      height="38"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-400"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gradient">
                    Architectural Blueprint to 3D Digital Twin
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Upload an architectural floor plan or select a preloaded archetype to inspect
                    with dynamic solar heliodon, first-person WASD navigation, and WebXR AR.
                  </p>
                </div>

                {/* 3 Archetype Interactive Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleLoadArchetype('villa')}
                    className="group glass-strong hover:border-blue-500/50 p-3 rounded-2xl border border-white/10 transition-all hover:scale-[1.02] shadow-lg text-left"
                  >
                    <span className="text-2xl block mb-1">🏡</span>
                    <h3 className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Nordic Villa
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                      122.4 m² • 4 Bed • 2 Bath • Covered Terrace
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadArchetype('loft')}
                    className="group glass-strong hover:border-blue-500/50 p-3 rounded-2xl border border-white/10 transition-all hover:scale-[1.02] shadow-lg text-left"
                  >
                    <span className="text-2xl block mb-1">🏙️</span>
                    <h3 className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Urban Loft
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                      74.2 m² • High Ceilings • Island • Balcony
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadArchetype('eco_cabin')}
                    className="group glass-strong hover:border-blue-500/50 p-3 rounded-2xl border border-white/10 transition-all hover:scale-[1.02] shadow-lg text-left"
                  >
                    <span className="text-2xl block mb-1">🌲</span>
                    <h3 className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Eco-Cabin
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                      42.5 m² • Wood Hearth • Spa Bath • Deck
                    </p>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--text-muted)] pt-2">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Meta Muse Spark 1.3
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    WebXR Spatial AR
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    AutoCAD DXF
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="glass-strong rounded-2xl p-6 max-w-xs text-center space-y-3 animate-fade-in-up">
                <div className="w-10 h-10 mx-auto border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {pipeline.message || 'Processing…'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}

          {/* Architecture Inspector Drawer */}
          <ArchitectureInspector
            analysis={viewer.analysis}
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
            onSelectRoom={(roomId) => setViewer((prev) => ({ ...prev, selectedElement: roomId }))}
          />

          {/* BIM Finish Studio & Cost Estimator Drawer */}
          {viewer.analysis && (
            <FinishCustomizer
              analysis={viewer.analysis}
              finishes={finishes}
              onChangeFinishes={setFinishes}
              isOpen={isFinishCustomizerOpen}
              onClose={() => setIsFinishCustomizerOpen(false)}
              selectedRoomId={viewer.selectedElement}
              onSelectRoom={(roomId) => setViewer((prev) => ({ ...prev, selectedElement: roomId }))}
            />
          )}

          {/* Dynamic Solar Study Floating Controls */}
          {hasAnalysis && isSolarStudyOpen && (
            <div className="absolute top-4 right-4 z-20">
              <SolarStudyControl
                settings={solarStudy}
                onChange={setSolarStudy}
                onClose={handleToggleSolarStudy}
              />
            </div>
          )}

          {/* WebXR & Mobile AR QR Modal */}
          <ARModal
            isOpen={isARModalOpen}
            onClose={() => setIsARModalOpen(false)}
            analysis={viewer.analysis}
            onExportGLB={handleExportGLB}
          />
        </main>
      </div>
    </div>
  );
}
