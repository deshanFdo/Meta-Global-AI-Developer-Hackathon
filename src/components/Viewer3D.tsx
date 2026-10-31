"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Grid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { EditTool, GeneratedTextures, HouseAnalysis } from "@/types";
import { buildHouseGroup, disposeGroup, findTag, type ElementTag, type OpenState } from "@/lib/geometry";
import { buildFurniture, nominalSize, type CatalogEntry } from "@/lib/furnish";
import InteractiveAnimator from "./InteractiveAnimator";
import SelectionHighlight from "./SelectionHighlight";

export type LightingMode = "day" | "golden" | "night";
export type CameraPreset = "orbit" | "top" | "front";

interface ViewerProps {
  analysis: HouseAnalysis;
  textures: GeneratedTextures;
  showRoof: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  lighting: LightingMode;
  cameraPreset: CameraPreset;
  open: OpenState;
  onToggleOpen: (kind: "door" | "window", id: string) => void;
  autoRotate: boolean;
  editTool: EditTool;
  onAddWall: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
  onAddOpening: (kind: "door" | "window", wallId: string, at: { x: number; y: number }) => void;
  onMoveWall: (id: string, dx: number, dy: number) => void;
  onMoveFurniture: (id: string, dx: number, dy: number) => void;
  onCheckpoint: () => void;
  onAddFurniture: (entry: CatalogEntry, at: { x: number; y: number }, rotation: number) => void;
  onCancelTool: () => void;
  pendingFurniture: CatalogEntry | null;
  sunHour: number | null;
  showScaleFigure: boolean;
  selection: ElementTag | null;
  onSelect: (tag: ElementTag | null) => void;
}

interface RigProps {
  preset: CameraPreset;
  w: number;
  d: number;
  h: number;
  analysisId: string;
  flight: React.MutableRefObject<{ active: boolean }>;
}

type ControlsLike = { target: THREE.Vector3; update: () => void } | null;

function CameraRig({ preset, w, d, h, analysisId, flight }: RigProps): React.JSX.Element | null {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike;

  const dest = useMemo(() => {
    const r = Math.max(w, d);
    const pos =
      preset === "top"
        ? new THREE.Vector3(0.01, r * 2.0, 0.01)
        : preset === "front"
          ? new THREE.Vector3(0, h * 1.4 + 1.5, d * 0.9 + r * 0.7)
          : new THREE.Vector3(r * 0.85, h * 2.4 + r * 0.3, r * 0.85 + d * 0.25);
    return { pos, tgt: new THREE.Vector3(0, h * 0.35, 0) };
  }, [preset, w, d, h]);

  const journeyKey = `${analysisId}|${preset}|${w.toFixed(1)}|${d.toFixed(1)}|${h.toFixed(1)}`;
  const from = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), t: 1 });

  // Every preset/model change starts a short eased flight instead of a hard cut.
  useEffect(() => {
    from.current = {
      pos: camera.position.clone(),
      tgt: controls ? controls.target.clone() : new THREE.Vector3(),
      t: 0,
    };
    flight.current.active = true;
  }, [journeyKey, camera, controls, flight]);

  useFrame((_, rawDt) => {
    controls?.update();
    if (!flight.current.active) return;
    const state = from.current;
    state.t = Math.min(1, state.t + Math.min(rawDt, 0.05) / 1.4);
    const t = state.t;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(state.pos, dest.pos, eased);
    if (controls) controls.target.lerpVectors(state.tgt, dest.tgt, eased);
    if (state.t >= 1) flight.current.active = false;
  });

  return null;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Ground, trees, drifting clouds and night stars around the house. */
function EnvironmentDressing({ w, d, night }: { w: number; d: number; night: boolean }): React.JSX.Element {
  const clouds = useRef<THREE.Group>(null);

  const trees = useMemo(() => {
    const rand = seededRandom(7);
    const r = Math.max(w, d);
    return Array.from({ length: 9 }, (_, i) => {
      const angle = (i / 9) * Math.PI * 2 + rand() * 0.5;
      const dist = r * 0.9 + 8 + rand() * 10;
      return { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, s: 0.8 + rand() * 0.9, key: i };
    });
  }, [w, d]);

  const puffs = useMemo(() => {
    const rand = seededRandom(21);
    return Array.from({ length: 6 }, (_, i) => ({
      x: -50 + rand() * 100,
      y: 24 + rand() * 10,
      z: -45 + rand() * 90,
      s: 3 + rand() * 4,
      speed: 0.35 + rand() * 0.45,
      key: i,
    }));
  }, []);

  const stars = useMemo(() => {
    const rand = seededRandom(99);
    const arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * Math.PI * 0.45;
      const r = 180;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) + 5;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  useFrame((_, rawDt) => {
    const group = clouds.current;
    if (!group) return;
    const dt = Math.min(rawDt, 0.05);
    group.children.forEach((child, i) => {
      child.position.x += puffs[i % puffs.length].speed * dt;
      if (child.position.x > 75) child.position.x = -75;
    });
  });

  const cloudColor = night ? "#2a3350" : "#dfe6f2";

  return (
    <>
      <mesh position={[0, -0.26, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[85, 48]} />
        <meshStandardMaterial color={night ? "#0c1120" : "#172034"} roughness={1} />
      </mesh>
      {trees.map((t) => (
        <group key={t.key} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.2, 1.6, 8]} />
            <meshStandardMaterial color="#5a4632" roughness={1} />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <coneGeometry args={[1.3, 2.4, 10]} />
            <meshStandardMaterial color="#2e4a38" roughness={1} />
          </mesh>
          <mesh position={[0, 3.4, 0]} castShadow>
            <coneGeometry args={[0.9, 1.8, 10]} />
            <meshStandardMaterial color="#35563f" roughness={1} />
          </mesh>
        </group>
      ))}
      <group ref={clouds}>
        {puffs.map((p) => (
          <group key={p.key} position={[p.x, p.y, p.z]}>
            <mesh>
              <sphereGeometry args={[p.s, 12, 10]} />
              <meshStandardMaterial color={cloudColor} transparent opacity={0.8} roughness={1} />
            </mesh>
            <mesh position={[p.s * 0.9, -p.s * 0.25, 0]}>
              <sphereGeometry args={[p.s * 0.65, 12, 10]} />
              <meshStandardMaterial color={cloudColor} transparent opacity={0.8} roughness={1} />
            </mesh>
            <mesh position={[-p.s * 0.9, -p.s * 0.2, p.s * 0.3]}>
              <sphereGeometry args={[p.s * 0.55, 12, 10]} />
              <meshStandardMaterial color={cloudColor} transparent opacity={0.8} roughness={1} />
            </mesh>
          </group>
        ))}
      </group>
      {night && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stars, 3]} />
          </bufferGeometry>
          <pointsMaterial size={1.6} sizeAttenuation={false} color="#cdd8ff" transparent opacity={0.8} depthWrite={false} />
        </points>
      )}
    </>
  );
}

const LIGHTS: Record<LightingMode, { bg: string; sun: string; intensity: number; ambient: number; elevation: number }> = {
  day: { bg: "#0d1220", sun: "#ffffff", intensity: 2.4, ambient: 0.75, elevation: 38 },
  golden: { bg: "#191221", sun: "#ffb45e", intensity: 2.0, ambient: 0.5, elevation: 14 },
  night: { bg: "#05070f", sun: "#9db8ff", intensity: 0.7, ambient: 0.3, elevation: 30 },
};

export default function Viewer3D(props: ViewerProps): React.JSX.Element {
  const { analysis, textures, showRoof, showLabels, showDimensions, lighting, cameraPreset, open, onToggleOpen, autoRotate, editTool, onAddWall, onAddOpening, onMoveWall, onMoveFurniture, onCheckpoint, onAddFurniture, onCancelTool, pendingFurniture, sunHour, showScaleFigure, selection, onSelect } = props;
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
        facadeMap: maps.facade ?? null,
        floorMap: maps.floor ?? null,
        roofMap: maps.roof ?? null,
        open,
      }),
    [analysis, showRoof, maps, open]
  );

  useEffect(() => () => disposeGroup(group), [group]);

  // Night: warm emissive glass + interior lamps. Day/golden: glass goes neutral.
  useEffect(() => {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.transparent && std.emissive) {
          if (lighting === "night") {
            std.emissive.set("#ffb45e");
            std.emissiveIntensity = 0.9;
          } else {
            std.emissive.set("#000000");
            std.emissiveIntensity = 1;
          }
        }
      }
    });
  }, [group, lighting]);

  const lampPositions = useMemo(() => {
    const { overallWidth: lw, overallDepth: ld, wallHeight: lh } = analysis.metadata;
    return analysis.rooms.slice(0, 8).map((r) => {
      const cx = r.vertices.reduce((s, v) => s + v.x, 0) / r.vertices.length - lw / 2;
      const cz = r.vertices.reduce((s, v) => s + v.y, 0) / r.vertices.length - ld / 2;
      return { id: r.id, x: cx, y: Math.max(1.2, lh - 0.4), z: cz };
    });
  }, [analysis]);

  const flight = useRef({ active: false });

  // ---- editor state (add / move / measure tools) ----
  const toPlan = useCallback(
    (wx: number, wz: number): { x: number; y: number } => ({ x: wx + w / 2, y: wz + d / 2 }),
    [w, d]
  );
  const snapQ = (v: number): number => Math.round(v * 4) / 4;
  const [pendingStart, setPendingStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverPlan, setHoverPlan] = useState<{ x: number; y: number } | null>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const [measurePts, setMeasurePts] = useState<Array<{ x: number; z: number }>>([]);
  const [pendingRot, setPendingRot] = useState(0);
  const dragRef = useRef<{ kind: "wall" | "furniture"; id: string; bx: number; bz: number; ldx: number; ldy: number } | null>(null);
  const editToolRef = useRef(editTool);
  editToolRef.current = editTool;
  const onCancelToolRef = useRef(onCancelTool);
  onCancelToolRef.current = onCancelTool;

  // Reset transient tool state when the tool or model changes.
  useEffect(() => {
    setPendingStart(null);
    setHoverPlan(null);
    setMeasurePts([]);
    setPendingRot(0);
    dragRef.current = null;
  }, [editTool, analysis, pendingFurniture?.id]);

  useEffect(() => {
    const onUp = (): void => {
      dragRef.current = null;
    };
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (e.code === "Escape") {
        if (editToolRef.current === "add-furniture") onCancelToolRef.current();
        else {
          setPendingStart(null);
          setMeasurePts([]);
          dragRef.current = null;
        }
      } else if (e.code === "KeyR" && editToolRef.current === "add-furniture") {
        setPendingRot((r) => (r + 45) % 360);
      }
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Ghost preview for furniture placement.
  const ghost = useMemo(() => {
    if (!pendingFurniture) return null;
    const g = buildFurniture(pendingFurniture.type, pendingFurniture.variant, pendingFurniture.color);
    const nom = nominalSize(pendingFurniture.type, pendingFurniture.variant);
    g.scale.set(pendingFurniture.w / nom.w, pendingFurniture.h / nom.h, pendingFurniture.d / nom.d);
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        std.transparent = true;
        std.opacity = 0.62;
        if (std.emissive) {
          std.emissive.setHex(0x4f7cff);
          std.emissiveIntensity = 0.25;
        }
      }
    });
    return g;
  }, [pendingFurniture]);

  useEffect(() => () => {
    if (ghost) disposeGroup(ghost);
  }, [ghost]);

  /** Wall endpoint with 15° angle snapping for straight, clean walls. */
  const snapWallEnd = useCallback((a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return { x: snapQ(b.x), y: snapQ(b.y) };
    const step = Math.PI / 12;
    const ang = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: snapQ(a.x + Math.cos(ang) * len), y: snapQ(a.y + Math.sin(ang) * len) };
  }, []);

  /** Snap a point onto a nearby wall endpoint (0.3 m magnet) for easy connections. */
  const magnetize = useCallback((p: { x: number; y: number }): { x: number; y: number } => {
    let best: { x: number; y: number } | null = null;
    let bestDist = 0.3;
    for (const wall of analysis.walls) {
      for (const end of [wall.start, wall.end]) {
        const dist = Math.hypot(p.x - end.x, p.y - end.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = { x: end.x, y: end.y };
        }
      }
    }
    return best ?? p;
  }, [analysis]);

  const floorTool = editTool === "add-wall" || editTool === "move" || editTool === "measure" || editTool === "add-furniture";

  const rubberEnd = pendingStart && hoverPlan ? magnetize(snapWallEnd(pendingStart, hoverPlan)) : null;

  // ---- sun: explicit hour overrides the lighting preset ----
  const sun = useMemo(() => {
    if (sunHour === null) return null;
    const h = Math.max(6, Math.min(20, sunHour));
    const a = ((h - 6) / 14) * Math.PI; // 6h east horizon → 20h west horizon
    const heat = Math.max(0, Math.sin(a));
    const dist = Math.max(w, d) * 2.2 + 12;
    return {
      position: [Math.cos(a) * dist, 3 + heat * dist * 0.85, dist * 0.4] as [number, number, number],
      color: heat > 0.55 ? "#ffffff" : "#ff9a4d",
      intensity: 1.1 + heat * 1.4,
    };
  }, [sunHour, w, d]);
  const effBg = sun ? "#0d1220" : light.bg;
  const effAmbient = sun ? 0.7 : light.ambient;


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
    <div
      className="relative h-full w-full"
      style={{ cursor: editTool === "move" ? "grab" : editTool === "select" ? "default" : "crosshair" }}
    >
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.1, far: 600, position: [12, 10, 12] }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={[effBg]} />
      <fog attach="fog" args={[effBg, 70, 240]} />
      <ambientLight intensity={effAmbient} />
      <directionalLight
        position={sun ? sun.position : [sunDistance * 0.7, sunY, sunDistance * 0.5]}
        intensity={sun ? sun.intensity : light.intensity}
        color={sun ? sun.color : light.sun}
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
          e.stopPropagation();
          if (e.delta > 6) return;
          const tag: ElementTag | null = findTag(e.object);
          if ((editTool === "add-door" || editTool === "add-window") && tag?.kind === "wall") {
            onAddOpening(editTool === "add-door" ? "door" : "window", tag.id, toPlan(e.point.x, e.point.z));
            return;
          }
          if (editTool !== "select") return;
          // Single click selects anything; doors/windows open on double-click.
          onSelect(tag);
        }}
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (editTool !== "select") return;
          const tag: ElementTag | null = findTag(e.object);
          if (tag && (tag.kind === "door" || tag.kind === "window")) onToggleOpen(tag.kind, tag.id);
        }}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (editTool !== "move" || e.button !== 0) return;
          const tag: ElementTag | null = findTag(e.object);
          if (tag?.kind !== "wall" && tag?.kind !== "furniture") return;
          e.stopPropagation();
          (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
          onCheckpoint();
          dragRef.current = { kind: tag.kind, id: tag.id, bx: e.point.x, bz: e.point.z, ldx: 0, ldy: 0 };
        }}
      />
      {/* Invisible floor click-plane for add / move / measure tools. */}
      {floorTool && (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, 0.02, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (e.delta > 6) return;
            const p = toPlan(e.point.x, e.point.z);
            const snapped = { x: snapQ(p.x), y: snapQ(p.y) };
            if (editTool === "add-wall") {
              if (!pendingStart) setPendingStart(magnetize(snapped));
              else {
                onAddWall(pendingStart, magnetize(snapWallEnd(pendingStart, snapped)));
                setPendingStart(null);
              }
            } else if (editTool === "add-furniture") {
              if (pendingFurniture) onAddFurniture(pendingFurniture, snapped, pendingRot);
            } else if (editTool === "measure") {
              const wpt = { x: e.point.x, z: e.point.z };
              setMeasurePts((prev) => (prev.length >= 2 ? [wpt] : [...prev, wpt]));
            }
          }}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            const p = toPlan(e.point.x, e.point.z);
            const snapped = { x: snapQ(p.x), y: snapQ(p.y) };
            hoverRef.current = snapped;
            setHoverPlan(snapped);
            const drag = dragRef.current;
            if (drag && editTool === "move") {
              const dx = e.point.x - drag.bx;
              const dz = e.point.z - drag.bz;
              if (drag.kind === "wall") onMoveWall(drag.id, dx - drag.ldx, dz - drag.ldy);
              else onMoveFurniture(drag.id, dx - drag.ldx, dz - drag.ldy);
              drag.ldx = dx;
              drag.ldy = dz;
            }
          }}
          onContextMenu={(e) => {
            e.nativeEvent.preventDefault();
            if (e.delta > 6) return; // was a right-drag pan, not a click
            if (editTool === "add-furniture") onCancelTool();
            else {
              setPendingStart(null);
              setMeasurePts([]);
              dragRef.current = null;
            }
          }}
        >
          <planeGeometry args={[140, 140]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
      {/* Wall rubber band + start marker. */}
      {editTool === "add-wall" && pendingStart && rubberEnd && (
        <>
          <Line
            points={[
              [pendingStart.x - w / 2, 0.1, pendingStart.y - d / 2],
              [rubberEnd.x - w / 2, 0.1, rubberEnd.y - d / 2],
            ]}
            color="#4f7cff"
            lineWidth={3}
          />
          <mesh position={[pendingStart.x - w / 2, 0.1, pendingStart.y - d / 2]}>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshBasicMaterial color="#4f7cff" />
          </mesh>
          <Html position={[rubberEnd.x - w / 2, 0.5, rubberEnd.y - d / 2]} center distanceFactor={22} style={{ pointerEvents: "none" }}>
            <div style={dimStyle}>
              {Math.hypot(rubberEnd.x - pendingStart.x, rubberEnd.y - pendingStart.y).toFixed(2)} m
            </div>
          </Html>
        </>
      )}
      {/* Tape measure. */}
      {editTool === "measure" && measurePts.length > 0 && (
        <>
          {measurePts.map((p, i) => (
            <mesh key={i} position={[p.x, 0.1, p.z]}>
              <sphereGeometry args={[0.1, 12, 10]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          ))}
          {measurePts.length === 2 && (
            <>
              <Line points={[[measurePts[0].x, 0.1, measurePts[0].z], [measurePts[1].x, 0.1, measurePts[1].z]]} color="#fbbf24" lineWidth={3} />
              <Html
                position={[(measurePts[0].x + measurePts[1].x) / 2, 0.6, (measurePts[0].z + measurePts[1].z) / 2]}
                center
                distanceFactor={22}
                style={{ pointerEvents: "none" }}
              >
                <div style={dimStyle}>
                  {Math.hypot(measurePts[1].x - measurePts[0].x, measurePts[1].z - measurePts[0].z).toFixed(2)} m
                </div>
              </Html>
            </>
          )}
        </>
      )}
      {/* Furniture ghost preview while placing. */}
      {editTool === "add-furniture" && ghost && hoverPlan && (
        <>
          <primitive
            object={ghost}
            position={[hoverPlan.x - w / 2, 0, hoverPlan.y - d / 2]}
            rotation={[0, (pendingRot * Math.PI) / 180, 0]}
          />
          <Html
            position={[hoverPlan.x - w / 2, 1.6, hoverPlan.y - d / 2]}
            center
            distanceFactor={22}
            style={{ pointerEvents: "none" }}
          >
            <div style={dimStyle}>{pendingFurniture?.label} · R rotates</div>
          </Html>
        </>
      )}
      {/* 1.8 m scale figure for size reference. */}
      {showScaleFigure && (
        <group position={[w / 2 + 2.2, 0, d / 2 + 2.2]}>
          <mesh position={[0, 0.95, 0]} castShadow>
            <capsuleGeometry args={[0.16, 1.1, 6, 12]} />
            <meshStandardMaterial color="#7c8db0" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.68, 0]} castShadow>
            <sphereGeometry args={[0.14, 14, 12]} />
            <meshStandardMaterial color="#a9b8d8" roughness={0.8} />
          </mesh>
        </group>
      )}
      <InteractiveAnimator group={group} open={open} />
      <SelectionHighlight group={group} selection={editTool === "select" ? selection : null} />
      <EnvironmentDressing w={w} d={d} night={lighting === "night"} />
      {lighting === "night" &&
        lampPositions.map((l) => (
          <pointLight key={l.id} position={[l.x, l.y, l.z]} intensity={10} distance={8} decay={2} color="#ffcf96" />
        ))}
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
      <CameraRig preset={cameraPreset} w={w} d={d} h={h} analysisId={analysis.id} flight={flight} />
      <OrbitControls
        makeDefault
        enabled={editTool !== "move"}
        maxPolarAngle={Math.PI * 0.495}
        autoRotate={autoRotate && editTool === "select"}
        autoRotateSpeed={0.9}
        onStart={() => {
          flight.current.active = false;
        }}
      />
    </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/55 px-2.5 py-1 text-[11px] text-white/75">
        {editTool === "select" && "Click to select · double-click doors/windows to open · Del deletes · drag to orbit"}
        {editTool === "move" && "Drag a wall or furniture to move it · right-click cancels"}
        {editTool === "add-wall" && (pendingStart ? "Click the end point · right-click cancels" : "Click the floor to start a wall")}
        {(editTool === "add-door" || editTool === "add-window") && "Click a wall where the opening should go"}
        {editTool === "add-furniture" && (pendingFurniture ? `Placing ${pendingFurniture.label} · R rotates · right-click done` : "Pick a piece below first")}
        {editTool === "measure" && (measurePts.length === 1 ? "Click the second point" : "Click two points to measure")}
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
