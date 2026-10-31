"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { GeneratedTextures, HouseAnalysis } from "@/types";
import { buildHouseGroup, disposeGroup, findTag, isOpenable, openKey, type ElementTag, type OpenState } from "@/lib/geometry";
import { resolveCollision, spawnPose } from "@/lib/collide";
import { useTextureMaps } from "@/lib/useTextureMaps";
import InteractiveAnimator from "./InteractiveAnimator";

interface VRWalkProps {
  analysis: HouseAnalysis;
  textures: GeneratedTextures;
  showFurniture: boolean;
  open: OpenState;
  onToggleOpen: (kind: "door" | "window", id: string) => void;
  onPatch: (kind: ElementTag["kind"], id: string, patch: Record<string, unknown>) => void;
  onClose: () => void;
}

const DOOR_ORDER = ["single", "double", "sliding", "french", "pocket", "garage"];
const WIN_ORDER = ["fixed", "casement", "sliding", "double-hung", "single-hung", "bay", "skylight"];
const WALL_ORDER = ["drywall", "brick", "concrete", "wood", "stone", "stucco", "glass", "vinyl_siding"];
const ROOF_ORDER = ["gable", "hip", "flat", "shed", "mansard", "gambrel", "butterfly"];

function nextIn(order: string[], current: string): string {
  const i = order.indexOf(current);
  return order[(i + 1 + order.length) % order.length];
}

interface SceneProps {
  analysis: HouseAnalysis;
  textures: GeneratedTextures;
  showFurniture: boolean;
  open: OpenState;
  onToggleOpen: (kind: "door" | "window", id: string) => void;
  onPatch: (kind: ElementTag["kind"], id: string, patch: Record<string, unknown>) => void;
  onGl: (gl: THREE.WebGLRenderer) => void;
}

function VRScene({ analysis, textures, showFurniture, open, onToggleOpen, onPatch, onGl }: SceneProps): React.JSX.Element {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const maps = useTextureMaps(textures);
  const [label, setLabel] = useState<{ text: string; pos: [number, number, number] } | null>(null);

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
  useEffect(() => () => disposeGroup(group), [group]);

  const rig = useMemo(() => new THREE.Group(), []);
  const live = useRef({ group, analysis, onPatch, onToggleOpen, open });
  live.current = { group, analysis, onPatch, onToggleOpen, open };
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onGl(gl);
    gl.xr.enabled = true;
  }, [gl, onGl]);

  // Player rig owns the camera; spawn at the largest room.
  useEffect(() => {
    const spawn = spawnPose(analysis);
    rig.position.set(spawn.x, 0, spawn.z);
    rig.rotation.set(0, 0, 0);
    rig.add(camera);
    scene.add(rig);
    return () => {
      scene.remove(rig);
      rig.remove(camera);
    };
    // Re-seat only when a new analysis loads (prop identity), not on every patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, camera, scene]);

  // Controllers + trigger-to-cycle editing.
  useEffect(() => {
    const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4)]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const controllers = [gl.xr.getController(0), gl.xr.getController(1)];
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    const flash = (text: string, point: THREE.Vector3): void => {
      setLabel({ text, pos: [point.x, point.y + 0.15, point.z] });
      if (labelTimer.current) clearTimeout(labelTimer.current);
      labelTimer.current = setTimeout(() => setLabel(null), 2600);
    };

    const onSelect = (controller: THREE.Group): void => {
      const { group: g } = live.current;
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      const hits = raycaster.intersectObjects(g.children, true);
      for (const hit of hits) {
        const tag = findTag(hit.object);
        if (tag) {
          onTrigger(controller, tag, hit.point);
          return;
        }
      }
    };

    // Trigger: open/close doors and windows, rotate furniture, inspect walls.
    const onTrigger = (controller: THREE.Group, tag: ElementTag, point: THREE.Vector3): void => {
      void controller;
      const { analysis: a, onToggleOpen: toggle, onPatch: patch, open: openMap } = live.current;
      if (tag.kind === "door" || tag.kind === "window") {
        const style =
          tag.kind === "door"
            ? (a.doors.find((d) => d.id === tag.id)?.style ?? "")
            : (a.windows.find((w) => w.id === tag.id)?.style ?? "");
        if (!isOpenable(tag.kind, style)) {
          flash(`${tag.id} · ${style} is fixed`, point);
          return;
        }
        toggle(tag.kind, tag.id);
        const willOpen = openMap[openKey(tag.kind, tag.id)] !== true;
        flash(`${tag.id} → ${willOpen ? "open" : "closed"}`, point);
      } else if (tag.kind === "furniture") {
        const current = (a.furniture ?? []).find((f) => f.id === tag.id)?.rotation ?? 0;
        const next = (current + 90) % 360;
        patch("furniture", tag.id, { rotation: next });
        flash(`${tag.id} → rotated ${next}°`, point);
      } else if (tag.kind === "roof") {
        flash(`roof · ${a.roof.type} · ${a.roof.pitch.toFixed(0)}° pitch`, point);
      } else {
        const wall = a.walls.find((w) => w.id === tag.id);
        const len = wall ? Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y).toFixed(1) : "?";
        flash(`${tag.id} · ${wall?.material.replace(/_/g, " ") ?? ""} · ${len} m`, point);
      }
    };

    // Grip/squeeze: restyle the targeted element.
    const onSqueeze = (controller: THREE.Group): void => {
      const { group: g, analysis: a, onPatch: patch } = live.current;
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      const hits = raycaster.intersectObjects(g.children, true);
      for (const hit of hits) {
        const tag = findTag(hit.object);
        if (!tag) continue;
        if (tag.kind === "door") {
          const current = a.doors.find((d) => d.id === tag.id)?.style ?? "single";
          const next = nextIn(DOOR_ORDER, current);
          patch("door", tag.id, { style: next });
          flash(`${tag.id} → ${next} door`, hit.point);
        } else if (tag.kind === "window") {
          const current = a.windows.find((w) => w.id === tag.id)?.style ?? "fixed";
          const next = nextIn(WIN_ORDER, current);
          patch("window", tag.id, { style: next });
          flash(`${tag.id} → ${next} window`, hit.point);
        } else if (tag.kind === "wall") {
          const current = a.walls.find((w) => w.id === tag.id)?.material ?? "drywall";
          const next = nextIn(WALL_ORDER, current);
          patch("wall", tag.id, { material: next });
          flash(`${tag.id} → ${next.replace(/_/g, " ")}`, hit.point);
        } else if (tag.kind === "roof") {
          const next = nextIn(ROOF_ORDER, a.roof.type);
          patch("roof", "roof", { type: next });
          flash(`roof → ${next}`, hit.point);
        } else {
          const current = (a.furniture ?? []).find((f) => f.id === tag.id)?.rotation ?? 0;
          const next = (current + 90) % 360;
          patch("furniture", tag.id, { rotation: next });
          flash(`${tag.id} → rotated ${next}°`, hit.point);
        }
        return;
      }
    };

    const cleanups: Array<() => void> = [];
    for (const controller of controllers) {
      const ray = new THREE.Line(rayGeo, rayMat);
      controller.add(ray);
      scene.add(controller);
      const selectHandler = (): void => onSelect(controller);
      const squeezeHandler = (): void => onSqueeze(controller);
      controller.addEventListener("selectstart", selectHandler);
      controller.addEventListener("squeezestart", squeezeHandler);
      cleanups.push(() => {
        controller.removeEventListener("selectstart", selectHandler);
        controller.removeEventListener("squeezestart", squeezeHandler);
        scene.remove(controller);
      });
    }
    return () => {
      cleanups.forEach((fn) => fn());
      rayGeo.dispose();
      rayMat.dispose();
      if (labelTimer.current) clearTimeout(labelTimer.current);
    };
  }, [gl, scene]);

  // Thumbstick locomotion + snap turn.
  const snapCooldown = useRef(0);
  useFrame((state, rawDt) => {
    const session = gl.xr.getSession();
    if (!session) return;
    const dt = Math.min(rawDt, 0.1);
    const now = state.clock.elapsedTime;
    const sources = session.inputSources;
    for (let i = 0; i < sources.length; i += 1) {
      const source = sources[i];
      const gp = source.gamepad;
      if (!gp || gp.axes.length < 2) continue;
      const [ax, az] = [gp.axes[0] ?? 0, gp.axes[1] ?? 0];
      if (source.handedness === "left") {
        if (Math.hypot(ax, az) < 0.15) continue;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        const step = new THREE.Vector3().addScaledVector(forward, -az * 2.4 * dt).addScaledVector(right, ax * 2.4 * dt);
        const solved = resolveCollision(live.current.analysis, rig.position.x + step.x, rig.position.z + step.z, 0.3, live.current.open);
        rig.position.x = solved.x;
        rig.position.z = solved.z;
      } else if (source.handedness === "right") {
        if (Math.abs(ax) > 0.7 && now - snapCooldown.current > 0.45) {
          snapCooldown.current = now;
          rig.rotation.y -= Math.sign(ax) * (Math.PI / 6);
        }
      }
    }
  });

  const lamps = useMemo(() => {
    const { overallWidth: w, overallDepth: d, wallHeight: h } = analysis.metadata;
    return analysis.rooms.slice(0, 8).map((r) => {
      const cx = r.vertices.reduce((s, v) => s + v.x, 0) / r.vertices.length - w / 2;
      const cz = r.vertices.reduce((s, v) => s + v.y, 0) / r.vertices.length - d / 2;
      return { id: r.id, x: cx, y: Math.max(1.2, h - 0.4), z: cz };
    });
  }, [analysis]);

  return (
    <>
      <color attach="background" args={["#0b0e16"]} />
      <hemisphereLight args={["#dfe8ff", "#3a3428", 0.9]} />
      <ambientLight intensity={0.45} />
      {lamps.map((l) => (
        <pointLight key={l.id} position={[l.x, l.y, l.z]} intensity={14} distance={9} decay={2} color="#ffe7c4" />
      ))}
      <primitive object={group} />
      <InteractiveAnimator group={group} open={open} />
      {label && (
        <Text position={label.pos} fontSize={0.14} color="#ffffff" anchorX="center" anchorY="middle">
          {label.text}
        </Text>
      )}
    </>
  );
}

export default function VRWalk({ analysis, textures, showFurniture, open, onToggleOpen, onPatch, onClose }: VRWalkProps): React.JSX.Element {
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const [support, setSupport] = useState<"checking" | "yes" | "no">("checking");
  const [inSession, setInSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!("xr" in navigator) || !navigator.xr) {
          if (alive) setSupport("no");
          return;
        }
        const ok = await navigator.xr.isSessionSupported("immersive-vr");
        if (alive) setSupport(ok ? "yes" : "no");
      } catch {
        if (alive) setSupport("no");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const enter = async (): Promise<void> => {
    setError(null);
    try {
      const gl = glRef.current;
      if (!gl || !navigator.xr) {
        setError("WebXR is not available in this browser.");
        return;
      }
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor"],
      });
      sessionRef.current = session;
      session.addEventListener("end", () => {
        sessionRef.current = null;
        setInSession(false);
      });
      await gl.xr.setSession(session);
      setInSession(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the VR session.");
    }
  };

  const exit = (): void => {
    sessionRef.current?.end().catch(() => undefined);
    sessionRef.current = null;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 70, near: 0.05, far: 300 }} gl={{ antialias: true }}>
        <VRScene
          analysis={analysis}
          textures={textures}
          showFurniture={showFurniture}
          open={open}
          onToggleOpen={onToggleOpen}
          onPatch={onPatch}
          onGl={(gl) => {
            glRef.current = gl;
          }}
        />
      </Canvas>
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-2 p-3">
        <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">
          VR walkthrough · {inSession ? "in headset" : support === "checking" ? "checking headset…" : support}
        </div>
        <button type="button" onClick={exit} className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/80">
          Exit VR
        </button>
      </div>
      {!inSession && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
          <div className="panel max-w-md space-y-3 p-5 text-sm">
            <h2 className="font-semibold">Walk the house in VR</h2>
            {support === "checking" && <p className="text-xs text-[var(--muted)]">Checking for a VR headset…</p>}
            {support === "no" && (
              <p className="text-xs text-[var(--muted)]">
                No VR headset detected. Connect a headset (Quest, Index, …) and open this page in a WebXR browser such
                as Chrome, Edge or Quest Browser — localhost and HTTPS both work.
              </p>
            )}
            {support === "yes" && (
              <>
                <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
                  <li>Left thumbstick walks (with wall collision), right thumbstick turns.</li>
                  <li>Trigger opens/closes the door or window you point at.</li>
                  <li>Grip restyles it instead (doors/windows cycle styles, furniture rotates).</li>
                </ul>
                <button type="button" onClick={enter} className="btn-primary w-full px-4 py-2.5">
                  Enter VR
                </button>
              </>
            )}
            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>
        </div>
      )}
      {inSession && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-1.5 text-[11px] text-white/85">
          Left stick walks · right stick turns · trigger opens · grip restyles
        </div>
      )}
    </div>
  );
}
