"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import type { GeneratedTextures, HouseAnalysis } from "@/types";
import { buildHouseGroup, disposeGroup, findTag, isOpenable, type ElementTag, type OpenState } from "@/lib/geometry";
import { resolveCollision, spawnPose } from "@/lib/collide";
import { useTextureMaps } from "@/lib/useTextureMaps";
import { footstep, isMuted, landThud, setMuted } from "@/lib/sound";
import CustomizePanel from "./CustomizePanel";
import InteractiveAnimator from "./InteractiveAnimator";

interface WalkModeProps {
  analysis: HouseAnalysis;
  textures: GeneratedTextures;
  showFurniture: boolean;
  open: OpenState;
  onToggleOpen: (kind: "door" | "window", id: string) => void;
  onPatch: (kind: ElementTag["kind"], id: string, patch: Record<string, unknown>) => void;
  onDeleteFurniture: (id: string) => void;
  onSetAllWallHeight: (h: number) => void;
  onNudge: (kind: "door" | "window", id: string, dir: 1 | -1) => void;
  onClose: () => void;
}

const EYE = 1.7;
const RADIUS = 0.28;
const GRAVITY = 13;
const JUMP_VELOCITY = 4.8;

/** Modal input states: WALK owns the mouse via pointer lock; MENU frees it for UI. */
type InputMode = "walk" | "menu";

/** Pulsing highlight on the selected element (skips glass, which is material-shared). */
function SelectionPulse({ group, selection }: { group: THREE.Group; selection: ElementTag | null }): React.JSX.Element | null {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    const found: THREE.MeshStandardMaterial[] = [];
    if (selection) {
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const tag = findTag(mesh);
        if (tag && tag.kind === selection.kind && tag.id === selection.id) {
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of list) {
            const std = m as THREE.MeshStandardMaterial;
            if (std.emissive && !std.transparent && !found.includes(std)) found.push(std);
          }
        }
      });
    }
    mats.current = found;
    return () => {
      for (const m of found) {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 1;
      }
    };
  }, [group, selection]);

  useFrame(({ clock }) => {
    if (mats.current.length === 0) return;
    const pulse = 0.35 + 0.25 * Math.sin(clock.elapsedTime * 5);
    for (const m of mats.current) {
      m.emissive.setHex(0x2a4bd7);
      m.emissiveIntensity = pulse;
    }
  });

  return null;
}

/** Slow-drifting dust motes for interior atmosphere. */
function DustMotes({ w, d, h }: { w: number; d: number; h: number }): React.JSX.Element {
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const count = 140;
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    let seed = 1234567;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      base[i * 3] = (rand() - 0.5) * w;
      base[i * 3 + 1] = 0.3 + rand() * Math.max(0.5, h - 0.5);
      base[i * 3 + 2] = (rand() - 0.5) * d;
      phase[i] = rand() * Math.PI * 2;
    }
    return { base, phase, count };
  }, [w, d, h]);

  useFrame(({ clock }) => {
    const points = ref.current;
    if (!points) return;
    const pos = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < data.count; i += 1) {
      pos.setY(i, data.base[i * 3 + 1] + Math.sin(t * 0.5 + data.phase[i]) * 0.25);
      pos.setX(i, data.base[i * 3] + Math.sin(t * 0.23 + data.phase[i] * 1.7) * 0.2);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.base, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#ffeecc"
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function Walker({ analysis, active, open }: { analysis: HouseAnalysis; active: boolean; open: OpenState }): React.JSX.Element | null {
  const camera = useThree((s) => s.camera);
  const keys = useRef<Set<string>>(new Set());
  const vel = useRef(new THREE.Vector3());
  const vy = useRef(0);
  const physY = useRef(EYE);
  const grounded = useRef(true);
  const jumpQueued = useRef(false);
  const bobPhase = useRef(0);
  const stride = useRef(0);
  const reduceMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );

  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      keys.current.add(e.code);
      if (e.code === "Space" && !e.repeat) {
        jumpQueued.current = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent): void => {
      keys.current.delete(e.code);
    };
    const blur = (): void => {
      keys.current.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = active ? keys.current : new Set<string>();
    const run = k.has("ShiftLeft") || k.has("ShiftRight");
    const speed = run ? 5.5 : 2.8;
    const fw = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const st = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
    const target = new THREE.Vector3().addScaledVector(forward, fw).addScaledVector(right, st);
    if (target.lengthSq() > 0) target.normalize().multiplyScalar(speed);
    vel.current.lerp(target, 1 - Math.exp(-10 * dt));
    const nx = camera.position.x + vel.current.x * dt;
    const nz = camera.position.z + vel.current.z * dt;
    const solved = resolveCollision(analysis, nx, nz, RADIUS, open);

    // Jump + gravity (vertical only; floor is flat).
    if (active && jumpQueued.current && grounded.current) {
      vy.current = JUMP_VELOCITY;
      grounded.current = false;
    }
    jumpQueued.current = false;
    const hSpeed = Math.hypot(vel.current.x, vel.current.z);
    let y = physY.current + vy.current * dt;
    vy.current -= GRAVITY * dt;
    if (y <= EYE) {
      if (!grounded.current && vy.current < -4.5) landThud();
      y = EYE;
      vy.current = 0;
      grounded.current = true;
      stride.current = 0;
    }
    physY.current = y;

    // Footsteps from distance traveled + subtle head-bob.
    if (grounded.current && hSpeed > 0.3) {
      bobPhase.current += dt * (4 + hSpeed * 1.6);
      stride.current += hSpeed * dt;
      if (stride.current >= (hSpeed > 4 ? 2.3 : 1.9)) {
        stride.current = 0;
        footstep(hSpeed > 4);
      }
    }
    const bobY =
      !reduceMotion.current && grounded.current && hSpeed > 0.3 ? Math.sin(bobPhase.current * 2) * 0.028 : 0;
    camera.position.set(solved.x, y + bobY, solved.z);

    // FOV kick while sprinting.
    const perspective = camera as THREE.PerspectiveCamera;
    if (typeof perspective.fov === "number" && !reduceMotion.current) {
      const targetFov = hSpeed > 4 ? 78 : 70;
      if (Math.abs(perspective.fov - targetFov) > 0.05) {
        perspective.fov += (targetFov - perspective.fov) * Math.min(1, dt * 6);
        perspective.updateProjectionMatrix();
      }
    }
  });

  return null;
}

/** Raycasts the crosshair target a few times per second and reports tag changes. */
function TargetScanner({
  group,
  active,
  onTarget,
}: {
  group: THREE.Group;
  active: boolean;
  onTarget: (tag: ElementTag | null) => void;
}): React.JSX.Element | null {
  const camera = useThree((s) => s.camera);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const frame = useRef(0);
  const last = useRef<string | null>(null);

  useFrame(() => {
    frame.current += 1;
    if (!active || frame.current % 8 !== 0) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 5;
    const hits = raycaster.intersectObjects(group.children, true);
    let found: ElementTag | null = null;
    for (const hit of hits) {
      const tag = findTag(hit.object);
      if (tag) {
        found = tag;
        break;
      }
    }
    const key = found ? `${found.kind}:${found.id}` : null;
    if (key !== last.current) {
      last.current = key;
      onTarget(found);
    }
  });

  return null;
}

export default function WalkMode(props: WalkModeProps): React.JSX.Element {
  const { analysis, textures, showFurniture, open, onToggleOpen, onPatch, onDeleteFurniture, onSetAllWallHeight, onNudge, onClose } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<{ lock: () => void } | null>(null);
  const [mode, setMode] = useState<InputMode>("menu");
  const [selection, setSelection] = useState<ElementTag | null>(null);
  const [target, setTarget] = useState<ElementTag | null>(null);
  const [mutedUi, setMutedUi] = useState(() => isMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouch] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true);
  const targetRef = useRef<ElementTag | null>(null);
  targetRef.current = target;
  const maps = useTextureMaps(textures);

  const spawn = useMemo(() => spawnPose(analysis), [analysis]);

  const group = useMemo(
    () =>
      buildHouseGroup(analysis, {
        showRoof: true,
        showFurniture,
        facadeMap: maps.facade ?? null,
        floorMap: maps.floor ?? null,
        roofMap: maps.roof ?? null,
        open,
      }),
    [analysis, showFurniture, maps, open]
  );
  const groupRef = useRef<THREE.Group>(group);
  groupRef.current = group;

  useEffect(() => () => disposeGroup(group), [group]);

  // Highlight is animated inside the Canvas (SelectionPulse); nothing static here.

  // Fullscreen on open + track state.
  useEffect(() => {
    const el = containerRef.current;
    if (el && document.fullscreenElement !== el) {
      el.requestFullscreen?.().catch(() => undefined);
    }
    const onChange = (): void => setIsFullscreen(document.fullscreenElement === el);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Lock pointer shortly after mount (still inside the click-gesture window).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        lockRef.current?.lock();
      } catch {
        // Pointer lock needs a gesture; the veil click below is the fallback.
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleLock = useCallback(() => {
    setMode("walk");
    setSelection(null);
  }, []);

  const handleUnlock = useCallback(() => {
    setMode("menu");
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedUi(next);
  }, []);

  const lock = (): void => {
    // Blur focused buttons first so Space won't re-trigger them while walking.
    (document.activeElement as HTMLElement | null)?.blur?.();
    try {
      lockRef.current?.lock();
    } catch {
      // Ignored: user can click the veil again.
    }
  };

  const unlock = (): void => {
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const toggleFullscreen = (): void => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      el.requestFullscreen?.().catch(() => undefined);
    }
  };

  const exit = (): void => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    unlock();
    onClose();
  };

  // Global shortcuts: Q exits to orbit, F toggles fullscreen, E uses the targeted element.
  // Input fields keep their keystrokes. Re-lock only ever happens from clicks (browser cooldown rules).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (e.code === "KeyQ") exit();
      else if (e.code === "KeyF") toggleFullscreen();
      else if (e.code === "KeyM") toggleMute();
      else if (e.code === "KeyE" && mode === "walk") {
        const t = targetRef.current;
        if (t && (t.kind === "door" || t.kind === "window")) onToggleOpen(t.kind, t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // exit/toggleFullscreen/toggleMute are stable enough; mode is the live dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, onToggleOpen, toggleMute]);

  const lampPositions = useMemo(() => {
    const { overallWidth: w, overallDepth: d, wallHeight: h } = analysis.metadata;
    return analysis.rooms.slice(0, 8).map((r) => {
      const cx = r.vertices.reduce((s, v) => s + v.x, 0) / r.vertices.length - w / 2;
      const cz = r.vertices.reduce((s, v) => s + v.y, 0) / r.vertices.length - d / 2;
      return { id: r.id, x: cx, y: Math.max(1.2, h - 0.4), z: cz };
    });
  }, [analysis]);

  const styleOf = (tag: ElementTag): string => {
    if (tag.kind === "door") return analysis.doors.find((d) => d.id === tag.id)?.style ?? "";
    if (tag.kind === "window") return analysis.windows.find((w) => w.id === tag.id)?.style ?? "";
    return "";
  };

  const targetHint = (tag: ElementTag): string => {
    if (tag.kind === "door" || tag.kind === "window") {
      const style = styleOf(tag);
      const openable = isOpenable(tag.kind, style);
      const state = open[`${tag.kind}:${tag.id}`] ? "open" : "closed";
      return openable
        ? `${tag.id} · ${style} · ${state} — E to ${state === "open" ? "close" : "open"} · click to customize`
        : `${tag.id} · ${style} (fixed) · click to customize`;
    }
    return `${tag.id} · click to customize`;
  };

  const selectedOpen = selection && (selection.kind === "door" || selection.kind === "window")
    ? open[`${selection.kind}:${selection.id}`] === true
    : undefined;

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black">
      <div className="absolute inset-0">
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 70, near: 0.05, far: 300, position: [spawn.x, EYE, spawn.z] }}>
          <color attach="background" args={["#0b0e16"]} />
          <hemisphereLight args={["#dfe8ff", "#3a3428", 0.9]} />
          <ambientLight intensity={0.45} />
          {lampPositions.map((l) => (
            <pointLight key={l.id} position={[l.x, l.y, l.z]} intensity={14} distance={9} decay={2} color="#ffe7c4" />
          ))}
          <primitive object={group} />
          <InteractiveAnimator group={group} open={open} />
          <Walker analysis={analysis} active={mode === "walk"} open={open} />
          <TargetScanner group={group} active={mode === "walk"} onTarget={setTarget} />
          <SelectionPulse group={group} selection={selection} />
          <DustMotes w={analysis.metadata.overallWidth} d={analysis.metadata.overallDepth} h={analysis.metadata.wallHeight} />
          <PointerLockControls
            ref={lockRef as never}
            selector="#walk-lock-veil"
            onLock={handleLock}
            onUnlock={handleUnlock}
          />
          <ClickPicker group={group} enabled={mode === "walk"} onPick={setSelection} />
        </Canvas>
      </div>

      {/* Crosshair + context hint */}
      {mode === "walk" && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 text-xl text-white/85">
            +
          </div>
          {target && (
            <div className="pointer-events-none absolute left-1/2 top-[58%] z-40 -translate-x-1/2 rounded-lg bg-black/65 px-3 py-1 text-[11px] text-white/90">
              {targetHint(target)}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 w-max max-w-[94vw] -translate-x-1/2 rounded-lg bg-black/60 px-4 py-1.5 text-center text-[11px] text-white/85">
            WASD walk · Space jump · mouse look · E open/close · click customize · Q back to orbit
          </div>
        </>
      )}

      {/* Top bar: always above the veil so Exit is reachable. */}
      <div className="absolute left-0 right-0 top-0 z-[60] flex items-center justify-between gap-2 p-3">
        <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">
          Walk mode · {analysis.metadata.style}
          {selection ? ` · customizing ${selection.kind} ${selection.id}` : ""}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={toggleMute} className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80">
            {mutedUi ? "Unmute (M)" : "Mute (M)"}
          </button>
          <button type="button" onClick={toggleFullscreen} className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80">
            {isFullscreen ? "Exit full screen (F)" : "Full screen (F)"}
          </button>
          <button type="button" onClick={exit} className="rounded-lg bg-blue-700/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            Back to orbit (Q)
          </button>
        </div>
      </div>

      {/* Touch notice */}
      {isTouch && (
        <div className="absolute left-1/2 top-14 z-[60] -translate-x-1/2 rounded-lg bg-amber-500/90 px-3 py-1.5 text-[11px] font-medium text-black">
          Walk mode needs a keyboard and mouse — touch look is not supported yet.
        </div>
      )}

      {/* Menu veil: the ONLY element that re-locks the pointer (see selector above). */}
      {mode === "menu" && !selection && (
        <button
          id="walk-lock-veil"
          type="button"
          onClick={lock}
          className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/55 text-sm text-white"
        >
          <span className="pointer-events-none rounded-xl border border-white/20 bg-black/70 px-6 py-4 text-center">
            Click to walk
            <span className="mt-1 block text-[11px] text-white/60">WASD move · Space jump · E open/close · Q back to orbit</span>
          </span>
        </button>
      )}

      {/* Customize panel */}
      {selection && (
        <div className="absolute bottom-3 left-3 top-16 z-50 w-[320px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl border border-white/15 bg-[#12151f]/95 p-4 shadow-2xl">
          <CustomizePanel
            key={`${selection.kind}:${selection.id}`}
            analysis={analysis}
            selection={selection}
            open={selectedOpen}
            onToggleOpen={() => {
              if (selection.kind === "door" || selection.kind === "window") onToggleOpen(selection.kind, selection.id);
            }}
            onPatch={onPatch}
            onDeleteFurniture={(id) => {
              onDeleteFurniture(id);
              setSelection(null);
            }}
            onSetAllWallHeight={onSetAllWallHeight}
            onNudge={onNudge}
            onClose={() => setSelection(null)}
            onResume={lock}
          />
        </div>
      )}
    </div>
  );
}

function ClickPicker({
  group,
  enabled,
  onPick,
}: {
  group: THREE.Group;
  enabled: boolean;
  onPick: (tag: ElementTag) => void;
}): React.JSX.Element | null {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (): void => {
      if (!document.pointerLockElement) return;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = raycaster.intersectObjects(group.children, true);
      for (const hit of hits) {
        const tag = findTag(hit.object);
        if (tag) {
          onPick(tag);
          if (document.pointerLockElement) document.exitPointerLock();
          return;
        }
      }
    };
    gl.domElement.addEventListener("click", onClick);
    return () => gl.domElement.removeEventListener("click", onClick);
  }, [gl, camera, group, enabled, onPick]);

  return null;
}
