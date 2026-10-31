"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { AnalysisSource, GeneratedTextures, HouseAnalysis, SamMatch } from "@/types";
import { buildHouseGroup, disposeGroup, isOpenable, openKey, type OpenState } from "@/lib/geometry";
import { doorSound } from "@/lib/sound";
import { downloadText, exportGroupToGLB, houseToCSV, houseToDXF } from "@/lib/exporters";
import UploadCard, { type ArchetypeKind } from "@/components/UploadCard";
import PlanCompare from "@/components/PlanCompare";
import { AskTab, ExportTab, LookTab, PlanTab, VerifyTab, type QaMessage, type SparkCounts } from "@/components/panels";
import { DOOR_MATS, DOOR_STYLES, FURN_TYPES, ROOF_MATS, ROOF_TYPES, WALL_MATS, WIN_MATS, WIN_STYLES } from "@/components/CustomizePanel";
import type { ElementTag } from "@/lib/geometry";
import type { CameraPreset, LightingMode } from "@/components/Viewer3D";

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#0c0e14]">
      <p className="text-xs text-[var(--muted)]">Loading 3D canvas…</p>
    </div>
  ),
});

const WalkMode = dynamic(() => import("@/components/WalkMode"), { ssr: false });
const VRWalk = dynamic(() => import("@/components/VRWalk"), { ssr: false });
const ARModal = dynamic(() => import("@/components/ARModal"), { ssr: false });

type Tab = "plan" | "ask" | "look" | "verify" | "export";

const SAMPLE_ASSET: Record<ArchetypeKind, string> = {
  villa: "/sample-floorplan.png",
  loft: "/demo-blueprints/urban-loft-10x7m.svg",
  eco_cabin: "/demo-blueprints/eco-cabin-8x5m.svg",
};

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/** Fetch a public asset and return a PNG data URL (rasterizes SVGs for SAM). */
async function assetToPngDataURL(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load sample asset (${res.status}).`);
  const blob = await res.blob();
  if (blob.type === "image/svg+xml" || url.endsWith(".svg")) {
    const svgText = await blob.text();
    const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not rasterize the sample SVG."));
        el.src = svgUrl;
      });
      const w = img.naturalWidth > 0 ? img.naturalWidth : 1600;
      const h = img.naturalHeight > 0 ? img.naturalHeight : 1000;
      const scale = 1600 / w;
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the sample asset."));
    reader.readAsDataURL(blob);
  });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "house";
}

export default function Home(): React.JSX.Element {
  const [apiLive, setApiLive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("plan");

  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [analysis, setAnalysis] = useState<HouseAnalysis | null>(null);
  const [source, setSource] = useState<AnalysisSource>("sample");
  const [model, setModel] = useState("—");

  const [textures, setTextures] = useState<GeneratedTextures>({});
  const [texBusy, setTexBusy] = useState<string | null>(null);
  const [qa, setQa] = useState<QaMessage[]>([]);
  const [qaBusy, setQaBusy] = useState(false);
  const [samConcepts, setSamConcepts] = useState<string[]>(["bed", "sofa", "bathtub", "staircase"]);
  const [matches, setMatches] = useState<SamMatch[]>([]);
  const [samBusy, setSamBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  const [lighting, setLighting] = useState<LightingMode>("day");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("orbit");
  const [showRoof, setShowRoof] = useState(true);
  const [showFurniture, setShowFurniture] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [deep, setDeep] = useState(true);
  const [edited, setEdited] = useState(false);
  const [walkOpen, setWalkOpen] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [vrOpen, setVrOpen] = useState(false);
  const [openMap, setOpenMap] = useState<OpenState>({});
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => setApiLive(j.live === true))
      .catch(() => setApiLive(false));
  }, []);

  const resetForNewAnalysis = useCallback(() => {
    setTextures({});
    setQa([]);
    setMatches([]);
    setEdited(false);
    setOpenMap({});
    setTab("plan");
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Please upload a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The image exceeds the 10 MB limit.");
      return;
    }
    setBusy("Reading image…");
    try {
      const dataUrl = await fileToDataURL(file);
      setDisplayImage(dataUrl);
      setMimeType(file.type);
      setBusy(deep ? "Analyzing with Muse Spark 1.3 (deep furniture pass)…" : "Analyzing with Muse Spark 1.3…");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, mimeType: file.type, deep }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? `Server responded with ${res.status}.`);
      resetForNewAnalysis();
      setAnalysis(data.analysis as HouseAnalysis);
      setSource(data.source === "live" ? "live" : "sample");
      setModel(String(data.model ?? "—"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }, [resetForNewAnalysis, deep]);

  const handleSample = useCallback(async (kind: ArchetypeKind) => {
    setError(null);
    setBusy("Loading sample…");
    try {
      const png = await assetToPngDataURL(SAMPLE_ASSET[kind]);
      setDisplayImage(png);
      setMimeType("image/png");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: "archetype", archetype: kind, isDemo: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Sample failed to load.");
      resetForNewAnalysis();
      setAnalysis(data.analysis as HouseAnalysis);
      setSource("sample");
      setModel(String(data.model ?? "prebuilt"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sample failed to load.");
    } finally {
      setBusy(null);
    }
  }, [resetForNewAnalysis]);

  const handleAsk = useCallback(async (question: string) => {
    if (!analysis || qaBusy) return;
    setQaBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, plan: analysis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Question failed.");
      setQa((prev) => [...prev, { question, answer: String(data.answer), source: String(data.source), model: String(data.model) }]);
    } catch (err) {
      setQa((prev) => [...prev, { question, answer: err instanceof Error ? err.message : "Question failed.", source: "error", model: "—" }]);
    } finally {
      setQaBusy(false);
    }
  }, [analysis, qaBusy]);

  const handleTexture = useCallback(async (kind: "facade" | "floor" | "roof") => {
    if (!analysis || texBusy) return;
    setTexBusy(kind);
    try {
      const res = await fetch("/api/texture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, style: analysis.metadata.style }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Texture generation failed.");
      setTextures((prev) => ({ ...prev, [kind]: String(data.texture) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Texture generation failed.");
    } finally {
      setTexBusy(null);
    }
  }, [analysis, texBusy]);

  const handleAllTextures = useCallback(async () => {
    for (const kind of ["facade", "floor", "roof"] as const) {
      await handleTexture(kind);
    }
  }, [handleTexture]);

  const handleSam = useCallback(async () => {
    if (!displayImage || samBusy || samConcepts.length === 0) return;
    setSamBusy(true);
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: displayImage, mimeType, concepts: samConcepts }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "SAM verification failed.");
      setMatches(data.matches as SamMatch[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SAM verification failed.");
    } finally {
      setSamBusy(false);
    }
  }, [displayImage, mimeType, samBusy, samConcepts]);

  const sparkCounts: SparkCounts | null = useMemo(() => {
    if (!analysis) return null;
    const furn = analysis.furniture ?? [];
    const has = (t: string): number => furn.filter((f) => f.type === t).length;
    return {
      bed: has("bed_double") + has("bed_single"),
      sofa: has("sofa"),
      diningTable: has("dining_table"),
      bathtub: has("bathtub"),
      toilet: has("toilet"),
      staircase: analysis.staircases.length,
    };
  }, [analysis]);

  const handleExportGLB = useCallback(async () => {
    if (!analysis || exportBusy) return;
    setExportBusy(true);
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
        showFurniture: true,
        facadeMap: await load(textures.facade),
        floorMap: await load(textures.floor),
        roofMap: await load(textures.roof),
        open: openMap,
      });
      await exportGroupToGLB(group, `${slug(analysis.metadata.style)}-3d-model.glb`);
      disposeGroup(group);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GLB export failed.");
    } finally {
      setExportBusy(false);
    }
  }, [analysis, exportBusy, textures, openMap]);

  const handleExportDXF = useCallback(() => {
    if (!analysis) return;
    downloadText(houseToDXF(analysis), `${slug(analysis.metadata.style)}-plan.dxf`, "application/dxf");
  }, [analysis]);

  const handlePatch = useCallback((kind: ElementTag["kind"], id: string, patch: Record<string, unknown>) => {
    const clampNum = (v: unknown, fallback: number, min: number, max: number): number => {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };
    const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
    const pick = (v: unknown, allowed: string[]): string | null =>
      typeof v === "string" && (allowed as string[]).includes(v) ? v : null;

    setAnalysis((prev) => {
      if (!prev) return prev;
      if (kind === "door") {
        return {
          ...prev,
          doors: prev.doors.map((d) => {
            if (d.id !== id) return d;
            const style = pick(patch.style, DOOR_STYLES);
            const material = pick(patch.material, DOOR_MATS);
            return {
              ...d,
              ...(style ? { style: style as typeof d.style } : {}),
              ...(material ? { material: material as typeof d.material } : {}),
              ...(isHex(patch.color) ? { color: patch.color } : {}),
              width: clampNum(patch.width, d.width, 0.5, 6),
              height: clampNum(patch.height, d.height, 1.6, 3.2),
            };
          }),
        };
      }
      if (kind === "window") {
        return {
          ...prev,
          windows: prev.windows.map((w) => {
            if (w.id !== id) return w;
            const style = pick(patch.style, WIN_STYLES);
            const material = pick(patch.material, WIN_MATS);
            const panes = patch.panes === 1 || patch.panes === 2 || patch.panes === 3 ? patch.panes : w.panes;
            return {
              ...w,
              ...(style ? { style: style as typeof w.style } : {}),
              ...(material ? { material: material as typeof w.material } : {}),
              ...(isHex(patch.color) ? { color: patch.color } : {}),
              panes,
              width: clampNum(patch.width, w.width, 0.3, 6),
              height: clampNum(patch.height, w.height, 0.3, 3),
              sillHeight: clampNum(patch.sillHeight, w.sillHeight, 0, 2),
            };
          }),
        };
      }
      if (kind === "wall") {
        return {
          ...prev,
          walls: prev.walls.map((w) => {
            if (w.id !== id) return w;
            const material = pick(patch.material, WALL_MATS);
            return {
              ...w,
              ...(material ? { material: material as typeof w.material } : {}),
              ...(isHex(patch.color) ? { color: patch.color } : {}),
              height: clampNum(patch.height, w.height, 2.0, 4.5),
              thickness: clampNum(patch.thickness, w.thickness, 0.05, 0.6),
            };
          }),
        };
      }
      if (kind === "roof") {
        const type = pick(patch.type, ROOF_TYPES);
        const material = pick(patch.material, ROOF_MATS);
        return {
          ...prev,
          roof: {
            ...prev.roof,
            ...(type ? { type: type as typeof prev.roof.type } : {}),
            ...(material ? { material: material as typeof prev.roof.material } : {}),
            ...(isHex(patch.color) ? { color: patch.color } : {}),
            pitch: clampNum(patch.pitch, prev.roof.pitch, 0, 60),
            overhang: clampNum(patch.overhang, prev.roof.overhang, 0, 2),
          },
        };
      }
      if (kind !== "furniture") return prev;
      return {
        ...prev,
        furniture: (prev.furniture ?? []).map((f) => {
          if (f.id !== id) return f;
          const type = pick(patch.type, FURN_TYPES);
          const rotation =
            patch.rotation === 0 || patch.rotation === 90 || patch.rotation === 180 || patch.rotation === 270
              ? patch.rotation
              : f.rotation;
          return {
            ...f,
            ...(type ? { type: type as typeof f.type } : {}),
            rotation,
            width: clampNum(patch.width, f.width, 0.15, 5),
            depth: clampNum(patch.depth, f.depth, 0.15, 5),
            height: clampNum(patch.height, f.height, 0.15, 3),
          };
        }),
      };
    });
    setEdited(true);
  }, []);

  const handleDeleteFurniture = useCallback((id: string) => {
    setAnalysis((prev) => (prev ? { ...prev, furniture: (prev.furniture ?? []).filter((f) => f.id !== id) } : prev));
    setEdited(true);
  }, []);

  const handleSetAllWallHeight = useCallback((h: number) => {
    const height = Number.isFinite(h) ? Math.max(2.0, Math.min(4.5, h)) : 2.7;
    setAnalysis((prev) =>
      prev
        ? {
            ...prev,
            metadata: { ...prev.metadata, wallHeight: height },
            walls: prev.walls.map((w) => ({ ...w, height })),
          }
        : prev
    );
    setEdited(true);
  }, []);

  const handleNudgeElement = useCallback((kind: "door" | "window", id: string, dir: 1 | -1) => {
    setAnalysis((prev) => {
      if (!prev) return prev;
      const list = kind === "door" ? prev.doors : prev.windows;
      const element = list.find((e) => e.id === id);
      const wall = prev.walls.find((w) => w.id === element?.wallId);
      if (!element || !wall) return prev;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.2) return prev;
      // Position along the wall axis, clamped inside the segment.
      const t = ((element.position.x - wall.start.x) * dx + (element.position.y - wall.start.y) * dy) / len;
      const half = element.width / 2 + 0.05;
      const nt = Math.max(half, Math.min(len - half, t + dir * 0.1));
      const position = {
        x: Math.round((wall.start.x + (dx / len) * nt) * 1000) / 1000,
        y: Math.round((wall.start.y + (dy / len) * nt) * 1000) / 1000,
      };
      if (kind === "door") {
        return { ...prev, doors: prev.doors.map((d) => (d.id === id ? { ...d, position } : d)) };
      }
      return { ...prev, windows: prev.windows.map((w) => (w.id === id ? { ...w, position } : w)) };
    });
    setEdited(true);
  }, []);

  const handleToggleOpen = useCallback((kind: "door" | "window", id: string) => {
    if (!analysis) return;
    const style =
      kind === "door"
        ? analysis.doors.find((d) => d.id === id)?.style
        : analysis.windows.find((w) => w.id === id)?.style;
    if (!style || !isOpenable(kind, style)) return;
    const key = openKey(kind, id);
    const willOpen = openMap[key] !== true;
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
    doorSound(willOpen);
  }, [analysis, openMap]);
  const handleExportCSV = useCallback(() => {
    if (!analysis) return;
    downloadText(houseToCSV(analysis), `${slug(analysis.metadata.style)}-schedules.csv`, "text/csv");
  }, [analysis]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "plan", label: "Plan" },
    { id: "ask", label: "Ask Muse" },
    { id: "look", label: "Look" },
    { id: "verify", label: "Verify" },
    { id: "export", label: "Export" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-bold leading-tight">BlueprintTo3D</h1>
          <p className="text-[11px] text-[var(--muted)]">Floor plan to interactive 3D · Meta Muse Spark + SAM 3.1 + Muse Image</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-[var(--border)] px-3 py-1">
            API:{" "}
            {apiLive === null ? "checking…" : apiLive ? <span className="text-[var(--success)]">key configured</span> : <span className="text-[var(--warning)]">no key — samples only</span>}
          </span>
          {analysis && (
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              Model: {source === "live" ? <span className="text-[var(--success)]">live</span> : <span className="text-[var(--warning)]">sample</span>} · {model}
              {edited && <span className="text-[var(--muted)]"> · edited in 3D</span>}
            </span>
          )}
          {(busy || qaBusy || samBusy) && (
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--muted)]">
              {busy ?? "Working…"}
            </span>
          )}
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <UploadCard onFile={handleFile} onSample={handleSample} busy={busy !== null} deep={deep} setDeep={setDeep} />
          {error && (
            <div className="panel border-l-4 border-l-[var(--danger)] p-3 text-xs">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1 text-[var(--muted)]">{error}</p>
              <button type="button" onClick={() => setError(null)} className="btn-ghost mt-2 px-2.5 py-1">
                Dismiss
              </button>
            </div>
          )}
          {analysis ? (
            <div className="panel p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`btn-ghost px-3 py-1.5 text-xs font-medium ${tab === t.id ? "tab-active" : ""}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {tab === "plan" && <PlanTab analysis={analysis} source={source} model={model} />}
              {tab === "ask" && <AskTab messages={qa} busy={qaBusy} onAsk={handleAsk} />}
              {tab === "look" && (
                <LookTab
                  textures={textures}
                  texBusy={texBusy}
                  onTexture={handleTexture}
                  onAllTextures={handleAllTextures}
                  lighting={lighting}
                  setLighting={setLighting}
                  cameraPreset={cameraPreset}
                  setCameraPreset={setCameraPreset}
                  autoRotate={autoRotate}
                  setAutoRotate={setAutoRotate}
                  showRoof={showRoof}
                  setShowRoof={setShowRoof}
                  showFurniture={showFurniture}
                  setShowFurniture={setShowFurniture}
                  showLabels={showLabels}
                  setShowLabels={setShowLabels}
                  showDimensions={showDimensions}
                  setShowDimensions={setShowDimensions}
                />
              )}
              {tab === "verify" && sparkCounts && (
                <VerifyTab
                  concepts={samConcepts}
                  setConcepts={setSamConcepts}
                  onRun={handleSam}
                  busy={samBusy}
                  matches={matches}
                  spark={sparkCounts}
                  canRun={apiLive === true}
                />
              )}
              {tab === "export" && (
                <ExportTab onGLB={handleExportGLB} onDXF={handleExportDXF} onCSV={handleExportCSV} busy={exportBusy} />
              )}
            </div>
          ) : (
            <div className="panel p-4 text-xs text-[var(--muted)]">
              <p className="font-semibold text-[var(--text)]">How it works</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>Upload a plan for live extraction, or load a sample.</li>
                <li>Muse Spark 1.3 reads walls, doors, windows, rooms and furniture into strict JSON.</li>
                <li>Three.js rebuilds it as an interactive 3D model in your browser.</li>
                <li>Verify symbols with SAM 3.1, restyle with Muse Image, export GLB/DXF/CSV.</li>
              </ol>
            </div>
          )}
        </aside>

        <main className="flex min-w-0 flex-col gap-4">
          <div className="relative h-[440px] overflow-hidden rounded-xl border border-[var(--border)] bg-[#0c0e14] lg:h-[520px]">
            {analysis ? (
              <Viewer3D
                analysis={analysis}
                textures={textures}
                showRoof={showRoof}
                showFurniture={showFurniture}
                showLabels={showLabels}
                showDimensions={showDimensions}
                lighting={lighting}
                cameraPreset={cameraPreset}
                open={openMap}
                onToggleOpen={handleToggleOpen}
                autoRotate={autoRotate}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="max-w-md space-y-2">
                  <p className="text-lg font-semibold">No model yet</p>
                  <p className="text-sm text-[var(--muted)]">
                    Load one of the three samples on the left for an instant 3D digital twin, or upload your own floor
                    plan to run live Muse inference.
                  </p>
                </div>
              </div>
            )}
            {analysis && (
              <div className="absolute right-3 top-3 z-10 flex gap-2">
                <button type="button" onClick={() => setWalkOpen(true)} className="rounded-lg bg-black/65 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85">
                  Walk inside
                </button>
                <button type="button" onClick={() => setArOpen(true)} className="rounded-lg bg-black/65 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85">
                  View in AR
                </button>
                <button type="button" onClick={() => setVrOpen(true)} className="rounded-lg bg-black/65 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85">
                  VR walk
                </button>
              </div>
            )}
          </div>
          <PlanCompare displayImage={displayImage} analysis={analysis} matches={matches} />
        </main>
      </div>

      <footer className="border-t border-[var(--border)] px-4 py-3 text-center text-[11px] text-[var(--muted)]">
        Dimensions, roof shape and furniture may be inferred. The 3D view shows the ground-floor layout. Nothing here
        certifies structural safety or code compliance. Cost figures are placeholder demo rates.
      </footer>

      {walkOpen && analysis && (
        <WalkMode
          analysis={analysis}
          textures={textures}
          showFurniture={showFurniture}
          open={openMap}
          onToggleOpen={handleToggleOpen}
          onPatch={handlePatch}
          onDeleteFurniture={handleDeleteFurniture}
          onSetAllWallHeight={handleSetAllWallHeight}
          onNudge={handleNudgeElement}
          onClose={() => setWalkOpen(false)}
        />
      )}
      {arOpen && analysis && <ARModal analysis={analysis} textures={textures} open={openMap} onClose={() => setArOpen(false)} />}
      {vrOpen && analysis && (
        <VRWalk
          analysis={analysis}
          textures={textures}
          showFurniture={showFurniture}
          open={openMap}
          onToggleOpen={handleToggleOpen}
          onPatch={handlePatch}
          onClose={() => setVrOpen(false)}
        />
      )}
    </div>
  );
}
