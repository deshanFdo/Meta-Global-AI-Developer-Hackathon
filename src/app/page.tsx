'use client';

import React, { useCallback, useState } from 'react';
import type {
  AnalyzeResponse,
  HouseAnalysis,
  GeneratedTextures,
  PipelineProgress as PipelineProgressType,
  PipelineStage,
  ViewerState,
} from '@/types';

import UploadZone from '@/components/UploadZone';
import PipelineProgress from '@/components/PipelineProgress';
import ViewControls from '@/components/ViewControls';

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
  currentFloor: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URI prefix — API expects raw base64
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
      // Preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Reset state
      setViewer((prev) => ({ ...prev, isLoading: true, analysis: null, textures: null }));
      setPipeline({ stage: 'uploading', progress: 0, message: 'Preparing image…', startedAt: Date.now() });

      try {
        // Stage 1: upload / encode
        advancePipeline('uploading', 'Encoding image…', 30);
        const base64 = await fileToBase64(file);
        advancePipeline('uploading', 'Image encoded', 100);

        // Stage 2: analyze
        advancePipeline('analyzing_structure', 'Sending to Muse Spark…', 10);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            imageType: 'floor_plan',
            options: { generateTextures: true, detailLevel: 'high' },
          }),
        });

        // Simulate intermediate pipeline stages based on stream / response
        advancePipeline('analyzing_structure', 'Analyzing structure…', 50);

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        advancePipeline('segmenting', 'Segmenting floor plan components…', 30);

        const data: AnalyzeResponse = await response.json();

        if (!data.success || !data.analysis) {
          throw new Error(data.error ?? 'Analysis failed');
        }

        advancePipeline('fusing', 'Fusing analysis data…', 60);

        // Small delay to show fusing stage
        await new Promise((r) => setTimeout(r, 400));

        advancePipeline('generating_3d', 'Building 3D geometry…', 50);
        await new Promise((r) => setTimeout(r, 600));

        advancePipeline('generating_textures', 'Applying textures…', 70);
        await new Promise((r) => setTimeout(r, 500));

        // Done!
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

  // ---- render --------------------------------------------------------------

  const isProcessing = viewer.isLoading;
  const hasAnalysis = viewer.analysis !== null;
  const totalFloors = viewer.analysis?.metadata.floors ?? 1;

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

          {/* Status badge */}
          <div className="flex items-center gap-2">
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

            {/* View Controls */}
            {hasAnalysis && (
              <ViewControls
                viewMode={viewer.viewMode}
                showWireframe={viewer.showWireframe}
                showLabels={viewer.showLabels}
                showDimensions={viewer.showDimensions}
                currentFloor={viewer.currentFloor}
                totalFloors={totalFloors}
                onViewModeChange={(mode) => setViewer((prev) => ({ ...prev, viewMode: mode }))}
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
              />
            )}
          </div>
        </aside>

        {/* ---- Right Panel (3D Viewer) ---- */}
        <main className="flex-1 relative bg-[#0a0c12] overflow-hidden">
          {hasAnalysis ? (
            /* TODO: Replace with actual HouseViewer Three.js component */
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-3 animate-fade-in-up">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-400"
                  >
                    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                    <path d="M12 12l8-4.5" />
                    <path d="M12 12v9" />
                    <path d="M12 12L4 7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    3D Model Generated
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {viewer.analysis?.rooms.length} rooms •{' '}
                    {viewer.analysis?.walls.length} walls •{' '}
                    {viewer.analysis?.metadata.totalArea.toFixed(1)} m²
                  </p>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  HouseViewer component will render here
                </p>
              </div>
            </div>
          ) : (
            /* Placeholder when no analysis */
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-sm px-6">
                {/* Blueprint illustration */}
                <div className="relative mx-auto w-28 h-28">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-[var(--border)] rotate-6" />
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-[var(--border)] -rotate-3" />
                  <div className="absolute inset-0 rounded-3xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--text-muted)]"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Upload a Floor Plan
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                    Drop a 2D floor plan, blueprint, or architectural drawing. Our AI pipeline
                    will analyze it and generate an interactive 3D model in seconds.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-blue-400" />
                    Muse Spark
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-400" />
                    SAM 3.1
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-purple-400" />
                    Muse Image
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
        </main>
      </div>
    </div>
  );
}
