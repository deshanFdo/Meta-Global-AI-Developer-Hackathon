"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { GeneratedTextures, HouseAnalysis } from "@/types";
import { buildHouseGroup, disposeGroup, findTag, type ElementTag, type OpenState } from "@/lib/geometry";
import InteractiveAnimator from "./InteractiveAnimator";

export type LightingMode = "day" | "golden" | "night";
export type CameraPreset = "orbit" | "top" | "front";

interface ViewerProps {
  analysis: HouseAnalysis;
  textures: GeneratedTextures;
  showRoof: boolean;
  showFurniture: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  lighting: LightingMode;
  cameraPreset: CameraPreset;
  open: OpenState;
  onToggleOpen: (kind: "door" | "window", id: string) => void;
}

interface RigProps {
  preset: CameraPreset;
  w: number;
  d: number;
  h: number;
}

function CameraRig({ preset, w, d, h }: RigProps): React.JSX.Element | null {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;

  useEffect(() => {
    const r = Math.max(w, d);
    if (preset === "top") camera.position.set(0.01, r * 2.0, 0.01);
    else if (preset === "front") camera.position.set(0, h * 1.4 + 1.5, d * 0.9 + r * 0.7);
    else camera.position.set(r * 0.85, h * 2.4 + r * 0.3, r * 0.85 + d * 0.25);
    if (controls) {
      controls.target.set(0, h * 0.35, 0);
      controls.update();
    }
  }, [preset, w, d, h, camera, controls]);

  return null;
}

const LIGHTS: Record<LightingMode, { bg: string; sun: string; intensity: number; ambient: number; elevation: number }> = {
  day: { bg: "#0d1220", sun: "#ffffff", intensity: 2.4, ambient: 0.75, elevation: 38 },
  golden: { bg: "#191221", sun: "#ffb45e", intensity: 2.0, ambient: 0.5, elevation: 14 },
  night: { bg: "#05070f", sun: "#9db8ff", intensity: 0.7, ambient: 0.3, elevation: 30 },
};

export default function Viewer3D(props: ViewerProps): React.JSX.Element {
  const { analysis, textures, showRoof, showFurniture, showLabels, showDimensions, lighting, cameraPreset, open, onToggleOpen } = props;
  const { overallWidth: w, overallDepth: d, wallHeight: h } = analysis.metadata;
  const light = LIGHTS[lighting];

  const [maps, setMaps] = useState<{ facade?: THREE.Texture; floor?: THREE.Texture; roof?: THREE.Texture }>({});

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    const entries = Object.entries(textures).filter(([, v]) => typeof v === "string" && v.length > 0) as Array<
      [string, string]
    >;
    if (entries.length === 0) {
      setMaps({});
      return;
    }
    Promise.all(
      entries.map(async ([key, url]) => {
        const tex = await loader.loadAsync(url);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.set(3, 3);
        return [key, tex] as const;
      })
    )
      .then((pairs) => {
        if (alive) setMaps(Object.fromEntries(pairs));
      })
      .catch(() => {
        if (alive) setMaps({});
      });
    return () => {
      alive = false;
    };
  }, [textures]);

  const group = useMemo(
    () =>
      buildHouseGroup(analysis, {
        showRoof,
        showFurniture,
        facadeMap: maps.facade ?? null,
        floorMap: maps.floor ?? null,
        roofMap: maps.roof ?? null,
        open,
      }),
    [analysis, showRoof, showFurniture, maps, open]
  );

  useEffect(() => () => disposeGroup(group), [group]);

  const labels = useMemo(
    () =>
      analysis.rooms.map((r) => {
        const cx = r.vertices.reduce((s, v) => s + v.x, 0) / r.vertices.length - w / 2;
        const cz = r.vertices.reduce((s, v) => s + v.y, 0) / r.vertices.length - d / 2;
        return { id: r.id, name: r.name, area: r.area, x: cx, z: cz };
      }),
    [analysis, w, d]
  );

  const sunDistance = Math.max(w, d) * 2.2 + 12;
  const sunY = Math.tan((light.elevation * Math.PI) / 180) * sunDistance;

  return (
    <div className="relative h-full w-full">
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.1, far: 600, position: [12, 10, 12] }}
    >
      <color attach="background" args={[light.bg]} />
      <ambientLight intensity={light.ambient} />
      <directionalLight
        position={[sunDistance * 0.7, sunY, sunDistance * 0.5]}
        intensity={light.intensity}
        color={light.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-w}
        shadow-camera-right={w}
        shadow-camera-top={d}
        shadow-camera-bottom={-d}
        shadow-camera-far={sunDistance * 3}
      />
      <primitive
        object={group}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          // Ignore orbit drags (delta = px moved); toggle doors/windows on genuine clicks.
          e.stopPropagation();
          if (e.delta > 6) return;
          const tag: ElementTag | null = findTag(e.object);
          if (tag && (tag.kind === "door" || tag.kind === "window")) onToggleOpen(tag.kind, tag.id);
        }}
      />
      <InteractiveAnimator group={group} open={open} />
      {showLabels &&
        labels.map((l) => (
          <Html key={l.id} position={[l.x, 0.35, l.z]} center distanceFactor={22} style={{ pointerEvents: "none" }}>
            <div
              style={{
                background: "rgba(10,12,20,0.78)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 6,
                padding: "2px 7px",
                fontSize: 11,
                whiteSpace: "nowrap",
                color: "#e8eaf1",
              }}
            >
              {l.name} · {l.area.toFixed(1)} m²
            </div>
          </Html>
        ))}
      {showDimensions && (
        <>
          <Html position={[0, 0.15, d / 2 + 0.8]} center distanceFactor={22} style={{ pointerEvents: "none" }}>
            <div style={dimStyle}>{w.toFixed(2)} m</div>
          </Html>
          <Html position={[w / 2 + 0.8, 0.15, 0]} center distanceFactor={22} style={{ pointerEvents: "none" }}>
            <div style={dimStyle}>{d.toFixed(2)} m</div>
          </Html>
        </>
      )}
      <Grid
        position={[0, -0.21, 0]}
        args={[Math.max(w, d) * 4, Math.max(w, d) * 4]}
        cellSize={1}
        sectionSize={5}
        cellThickness={0.6}
        sectionThickness={1.1}
        cellColor="#2a3040"
        sectionColor="#3d4a66"
        fadeDistance={Math.max(w, d) * 4}
      />
      <CameraRig preset={cameraPreset} w={w} d={d} h={h} />
      <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.495} />
    </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/55 px-2.5 py-1 text-[11px] text-white/75">
        Click a door or window to open it · drag to orbit · scroll to zoom
      </div>
    </div>
  );
}

const dimStyle: React.CSSProperties = {
  background: "rgba(79,124,255,0.85)",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: "#fff",
};
