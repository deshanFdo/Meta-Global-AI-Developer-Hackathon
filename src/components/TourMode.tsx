"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import type { GeneratedTextures, HouseAnalysis } from "@/types";
import { buildHouseGroup, disposeGroup, type OpenState } from "@/lib/geometry";
import { buildTour, type TourBeat } from "@/lib/tour";
import { useTextureMaps } from "@/lib/useTextureMaps";
import { doorSound } from "@/lib/sound";
import InteractiveAnimator from "./InteractiveAnimator";
import { EnvironmentDressing, LIGHTS, type LightingMode } from "./Viewer3D";

interface TourModeProps {
  analysis: HouseAnalysis;
  textures: GeneratedTextures;
  open: OpenState;
  onSetOpen: (patch: OpenState) => void;
  showRoof: boolean;
  onShowRoof: (v: boolean) => void;
  lighting: LightingMode;
  onLighting: (v: LightingMode) => void;
  sunHour: number | null;
  onSunHour: (v: number | null) => void;
  onClose: () => void;
  onWalk: () => void;
}

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function TourCamera({
  beats,
  beatIndex,
  progress,
}: {
  beats: TourBeat[];
  beatIndex: number;
  progress: number;
}): React.JSX.Element | null {
  const camera = useThree((s) => s.camera);
  const start = useRef({ pos: new THREE.Vector3(12, 10, 12), beat: -1 });
  const tgtV = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const beat = beats[beatIndex];
    if (!beat) return;
    if (start.current.beat !== beatIndex) {
      start.current = { pos: camera.position.clone(), beat: beatIndex };
    }
    const e = easeInOut(Math.max(0, Math.min(1, progress)));
    const t = clock.elapsedTime;
    camera.position.set(
      start.current.pos.x + (beat.camPos[0] - start.current.pos.x) * e + Math.sin(t * 0.25) * 0.35,
      start.current.pos.y + (beat.camPos[1] - start.current.pos.y) * e,
      start.current.pos.z + (beat.camPos[2] - start.current.pos.z) * e + Math.cos(t * 0.22) * 0.35
    );
    const prevTgt = beatIndex > 0 ? beats[beatIndex - 1].camTgt : [0, 0.5, 0];
    tgtV.set(
      prevTgt[0] + (beat.camTgt[0] - prevTgt[0]) * e,
      prevTgt[1] + (beat.camTgt[1] - prevTgt[1]) * e,
      prevTgt[2] + (beat.camTgt[2] - prevTgt[2]) * e
    );
    camera.lookAt(tgtV);
  });

  return null;
}

export default function TourMode(props: TourModeProps): React.JSX.Element {
  const { analysis, textures, open, onSetOpen, lighting, onLighting, sunHour, onSunHour, onClose, onWalk } = props;
  const beats = useMemo(() => buildTour(analysis), [analysis]);
  const total = useMemo(() => beats.reduce((s, b) => s + b.dur, 0), [beats]);
  const [beatIndex, setBeatIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const stateRef = useRef({ beat: 0, prog: 0 });
  const maps = useTextureMaps(textures);

  // Restore the user's view settings on exit.
  const initial = useRef({ showRoof: props.showRoof, lighting: props.lighting, sunHour: props.sunHour });
  const showRoofNow = props.showRoof;

  const group = useMemo(
    () =>
      buildHouseGroup(analysis, {
        showRoof: showRoofNow,
        facadeMap: maps.facade ?? null,
        floorMap: maps.floor ?? null,
        roofMap: maps.roof ?? null,
        open,
      }),
    [analysis, showRoofNow, maps, open]
  );
  useEffect(() => () => disposeGroup(group), [group]);

  const { overallWidth: w, overallDepth: d } = analysis.metadata;
  const night = lighting === "night" && sunHour === null;

  const lamps = useMemo(() => {
    const lh = analysis.metadata.wallHeight;
    return analysis.rooms.slice(0, 8).map((r) => {
      const cx = r.vertices.reduce((s, v) => s + v.x, 0) / r.vertices.length - w / 2;
      const cz = r.vertices.reduce((s, v) => s + v.y, 0) / r.vertices.length - d / 2;
      return { id: r.id, x: cx, y: Math.max(1.2, lh - 0.4), z: cz };
    });
  }, [analysis, w, d]);

  // Night window glow follows the tour lighting.
  useEffect(() => {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.transparent && std.emissive) {
          if (night) {
            std.emissive.set("#ffb45e");
            std.emissiveIntensity = 0.9;
          } else {
            std.emissive.set("#000000");
            std.emissiveIntensity = 1;
          }
        }
      }
    });
  }, [group, night]);

  const sun = useMemo(() => {
    if (sunHour === null) return null;
    const h = Math.max(6, Math.min(20, sunHour));
    const a = ((h - 6) / 14) * Math.PI;
    const heat = Math.max(0, Math.sin(a));
    const dist = Math.max(w, d) * 2.2 + 12;
    return {
      position: [Math.cos(a) * dist, 3 + heat * dist * 0.85, dist * 0.4] as [number, number, number],
      color: heat > 0.55 ? "#ffffff" : "#ff9a4d",
      intensity: 1.1 + heat * 1.4,
    };
  }, [sunHour, w, d]);
  const light = sun ? { ...LIGHTS.day, sun: sun.color, intensity: sun.intensity } : LIGHTS[lighting];
  const sunDistance = Math.max(w, d) * 2.2 + 12;
  const sunY = Math.tan((LIGHTS[lighting].elevation * Math.PI) / 180) * sunDistance;

  const applyBeat = useRef((() => undefined) as (index: number) => void);
  applyBeat.current = (index: number): void => {
    const beat = beats[index];
    if (!beat) return;
    if (beat.roof !== undefined) props.onShowRoof(beat.roof);
    if (beat.lighting !== undefined) {
      onLighting(beat.lighting);
      onSunHour(null);
    } else if (beat.sunFrom === undefined) {
      onSunHour(null);
    } else {
      onSunHour(beat.sunFrom);
    }
    const patch: OpenState = {};
    for (const id of beat.openDoors ?? []) patch[`door:${id}`] = true;
    for (const id of beat.openWindows ?? []) patch[`window:${id}`] = true;
    if (Object.keys(patch).length > 0) {
      onSetOpen(patch);
      doorSound(true);
    }
  };

  // Apply the opening beat once.
  useEffect(() => {
    applyBeat.current(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const s = stateRef.current;
      const beat = beats[s.beat];
      if (!beat) return;
      s.prog += 0.1 / beat.dur;
      if (s.prog >= 1) {
        if (s.beat >= beats.length - 1) {
          s.prog = 1;
          setPlaying(false);
        } else {
          s.beat += 1;
          s.prog = 0;
          applyBeat.current(s.beat);
          setBeatIndex(s.beat);
        }
      }
      setProgress(s.prog);
      const current = beats[s.beat];
      if (current?.sunFrom !== undefined && current.sunTo !== undefined) {
        onSunHour(current.sunFrom + (current.sunTo - current.sunFrom) * easeInOut(s.prog));
      }
    }, 100);
    return () => clearInterval(timer);
  }, [playing, beats, onSunHour]);

  const exit = (restore: boolean): void => {
    if (restore) {
      props.onShowRoof(initial.current.showRoof);
      onLighting(initial.current.lighting);
      onSunHour(initial.current.sunHour);
    }
    onClose();
  };

  const next = (): void => {
    const s = stateRef.current;
    if (s.beat >= beats.length - 1) return;
    s.beat += 1;
    s.prog = 0;
    applyBeat.current(s.beat);
    setBeatIndex(s.beat);
    setProgress(0);
  };

  const beat = beats[beatIndex];
  const elapsed = beats.slice(0, beatIndex).reduce((sum, b) => sum + b.dur, 0) + progress * (beat?.dur ?? 0);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ fov: 45, near: 0.1, far: 600, position: [12, 10, 12] }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <color attach="background" args={[light.bg]} />
          <fog attach="fog" args={[light.bg, 70, 240]} />
          <ambientLight intensity={light.ambient} />
          <directionalLight
            position={sun ? sun.position : [sunDistance * 0.7, sunY, sunDistance * 0.5]}
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
          <primitive object={group} />
          <InteractiveAnimator group={group} open={open} />
          <EnvironmentDressing w={w} d={d} night={night} />
          {night &&
            lamps.map((l) => (
              <pointLight key={l.id} position={[l.x, l.y, l.z]} intensity={10} distance={8} decay={2} color="#ffcf96" />
            ))}
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
          <TourCamera beats={beats} beatIndex={beatIndex} progress={progress} />
        </Canvas>
      </div>

      {/* Cinematic letterbox bars */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 h-10 bg-black" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-40 h-10 bg-black" />

      <div className="absolute left-0 right-0 top-10 z-50 flex items-center justify-between gap-2 p-3">
        <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">
          Demo tour · {Math.floor(elapsed)}s / {Math.floor(total)}s · press Win+G to record this
        </div>
        <button
          type="button"
          onClick={() => exit(true)}
          className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80"
        >
          Exit tour
        </button>
      </div>

      <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center p-4">
        <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-black/70 p-4 text-center shadow-2xl">
          <p className="text-lg font-bold text-white">{beat?.caption}</p>
          <p className="mt-1 text-xs text-white/65">{beat?.sub}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-blue-500 transition-[width]" style={{ width: `${(elapsed / total) * 100}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={beatIndex >= beats.length - 1}
              className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-40"
            >
              Next scene
            </button>
            <button
              type="button"
              onClick={() => {
                exit(false);
                onWalk();
              }}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Walk it live
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
