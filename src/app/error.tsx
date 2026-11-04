"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error("Route error:", error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0c12] p-6 text-center">
      <div className="max-w-md space-y-3 rounded-xl border border-white/10 bg-[#12151f] p-6">
        <h1 className="text-lg font-bold text-white">Something went wrong</h1>
        <p className="text-xs text-gray-400">
          The 3D view hit an unexpected error (often a lost WebGL context). Your work autosaves continuously —
          nothing is lost.
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-gray-200 hover:bg-white/10"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
