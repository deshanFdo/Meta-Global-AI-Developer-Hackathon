"use client";

import React, { useEffect, useState } from "react";
import * as THREE from "three";
import type { GeneratedTextures, HouseAnalysis } from "@/types";
import { buildHouseGroup, disposeGroup, type OpenState } from "@/lib/geometry";
import { groupToGLBBlob } from "@/lib/exporters";

declare global {
  // model-viewer web component (loaded from CDN at runtime).
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
      };
    }
  }
}

const VIEWER_CDN = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";

interface Props {
  analysis: HouseAnalysis;
  textures: GeneratedTextures;
  open: OpenState;
  onClose: () => void;
}

export default function ARModal({ analysis, textures, open, onClose }: Props): React.JSX.Element {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabletop, setTabletop] = useState(true);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
    if (!document.querySelector(`script[src="${VIEWER_CDN}"]`)) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = VIEWER_CDN;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    setBlobUrl(null);
    setError(null);
    (async () => {
      try {
        const loader = new THREE.TextureLoader();
        const load = async (dataUrl?: string): Promise<THREE.Texture | null> => {
          if (!dataUrl) return null;
          const tex = await loader.loadAsync(dataUrl);
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          return tex;
        };
        const group = buildHouseGroup(analysis, {
          showRoof: true,
          facadeMap: await load(textures.facade),
          floorMap: await load(textures.floor),
          roofMap: await load(textures.roof),
          open,
        });
        if (tabletop) group.scale.setScalar(0.08); // ~1.2 m tabletop model
        const blob = await groupToGLBBlob(group);
        disposeGroup(group);
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not prepare the AR model.");
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [analysis, textures, open, tabletop]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="presentation">
      <div
        className="panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="View in AR"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">View in AR</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2.5 py-1 text-xs">
            Close
          </button>
        </div>
        <div className="mb-2 flex gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setTabletop(true)}
            className={`btn-ghost px-3 py-1.5 ${tabletop ? "tab-active" : ""}`}
          >
            Tabletop scale
          </button>
          <button
            type="button"
            onClick={() => setTabletop(false)}
            className={`btn-ghost px-3 py-1.5 ${!tabletop ? "tab-active" : ""}`}
          >
            True scale (walk-in)
          </button>
        </div>
        {error && <p className="mb-2 text-xs text-red-300">{error}</p>}
        {!blobUrl && !error && <p className="py-10 text-center text-xs text-[var(--muted)]">Preparing AR model…</p>}
        {blobUrl && (
          <model-viewer
            src={blobUrl}
            alt={`3D model of ${analysis.metadata.style}`}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            shadow-intensity="1"
            style={{ width: "100%", height: 420, borderRadius: 12, background: "#0b0e16" }}
          >
            <button
              slot="ar-button"
              style={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#4f7cff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Place in your space
            </button>
          </model-viewer>
        )}
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          On a phone or tablet, tap “Place in your space” to anchor the model in your room (iOS uses Quick Look,
          Android uses Scene Viewer or WebXR). On desktop, open this page on your phone:{" "}
          <span className="break-all text-[var(--text)]">{pageUrl || "this URL"}</span>
        </p>
      </div>
    </div>
  );
}
