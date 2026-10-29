'use client';

import React, { useEffect, useState } from 'react';
import type { PipelineProgress as PipelineProgressType, PipelineStage } from '@/types';

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

interface StageInfo {
  key: PipelineStage;
  icon: string;
  label: string;
}

const STAGES: StageInfo[] = [
  { key: 'uploading', icon: '📤', label: 'Uploading Image' },
  { key: 'analyzing_structure', icon: '🧠', label: 'Analyzing Floor Plan (Muse Spark)' },
  { key: 'complete', icon: '✅', label: 'Complete!' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PipelineProgressProps {
  progress: PipelineProgressType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStageIndex(stage: PipelineStage): number {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx === -1 ? -1 : idx;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PipelineProgress({ progress }: PipelineProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const currentIdx = getStageIndex(progress.stage);
  const isActive = progress.stage !== 'idle' && progress.stage !== 'error';

  // Elapsed timer
  useEffect(() => {
    if (!isActive || progress.stage === 'complete') return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - progress.startedAt);
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, progress.startedAt, progress.stage]);

  // Reset elapsed when completed
  useEffect(() => {
    if (progress.stage === 'complete') {
      setElapsed(Date.now() - progress.startedAt);
    }
  }, [progress.stage, progress.startedAt]);

  if (progress.stage === 'idle') return null;

  // Error state
  if (progress.stage === 'error') {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Pipeline Status
        </h3>
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 animate-fade-in-up">
          <span className="text-lg">❌</span>
          <div>
            <p className="text-sm font-medium text-[var(--error)]">Error</p>
            <p className="text-xs text-[var(--text-muted)]">{progress.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Pipeline Status
        </h3>
        {isActive && (
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="space-y-1">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div
              key={stage.key}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300
                ${isCurrent ? 'bg-[var(--accent-muted)]' : ''}
                ${isCompleted ? 'opacity-70' : ''}
                ${isPending ? 'opacity-30' : ''}
              `}
            >
              {/* Icon / indicator */}
              <div className="relative flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-[var(--success)] flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="relative">
                    <span className="text-base">{stage.icon}</span>
                    <div className="absolute -inset-1 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                  </div>
                ) : (
                  <span className="text-base grayscale">{stage.icon}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs font-medium flex-1 ${
                  isCurrent
                    ? 'text-[var(--accent)]'
                    : isCompleted
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-muted)]'
                }`}
              >
                {stage.label}
              </span>

              {/* Progress bar for current stage */}
              {isCurrent && progress.progress > 0 && progress.progress < 100 && (
                <div className="w-12 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {progress.message && progress.stage !== 'complete' && (
        <p className="text-xs text-[var(--text-muted)] italic pl-3 animate-shimmer">
          {progress.message}
        </p>
      )}

      {/* Completion message */}
      {progress.stage === 'complete' && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 animate-fade-in-up">
          <span className="text-sm">🎉</span>
          <p className="text-xs text-[var(--success)] font-medium">
            3D model ready! — {formatElapsed(elapsed)}
          </p>
        </div>
      )}
    </div>
  );
}
