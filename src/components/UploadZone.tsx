'use client';

import React, { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  preview: string | null;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UploadZone({
  onFileSelect,
  isProcessing,
  preview,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- validation ----------------------------------------------------------

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      return 'Invalid file type. Please upload a PNG, JPG, or WebP image.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max size is 10 MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [validate, onFileSelect],
  );

  // ---- event handlers ------------------------------------------------------

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [handleFile],
  );

  const openFilePicker = useCallback(() => {
    if (!isProcessing) inputRef.current?.click();
  }, [isProcessing]);

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        Upload Floor Plan
      </h3>

      {/* Drop zone */}
      <button
        type="button"
        disabled={isProcessing}
        onClick={openFilePicker}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-label="Upload floor plan image"
        className={`
          relative w-full rounded-xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center gap-3 p-6 min-h-[180px]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
          ${
            isProcessing
              ? 'border-[var(--border)] opacity-60 cursor-not-allowed'
              : isDragOver
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] scale-[1.01]'
                : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] cursor-pointer'
          }
        `}
      >
        {/* Preview image */}
        {preview ? (
          <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Floor plan preview"
              className="w-full h-full object-contain"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Upload icon */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDragOver
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
              } transition-colors duration-200`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {isDragOver ? 'Drop your floor plan here' : 'Drag & drop your floor plan'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                or click to browse • PNG, JPG, WebP • Max 10 MB
              </p>
            </div>
          </>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={onInputChange}
        tabIndex={-1}
      />

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2 animate-fade-in-up">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {/* Change image link (when preview exists and not processing) */}
      {preview && !isProcessing && (
        <button
          type="button"
          onClick={openFilePicker}
          className="w-full text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors text-center py-1"
        >
          Upload a different floor plan
        </button>
      )}
    </div>
  );
}
