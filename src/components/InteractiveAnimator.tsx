"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { setPivotTargets, updatePivots, type OpenState } from "@/lib/geometry";

/** Keeps door/window pivots animated toward the shared open-state map. */
export default function InteractiveAnimator({
  group,
  open,
}: {
  group: THREE.Group;
  open: OpenState;
}): React.JSX.Element | null {
  useEffect(() => {
    setPivotTargets(group, open);
  }, [group, open]);

  // Cache fireplace flames + lights once per build (no per-frame traversal).
  const fire = useMemo(() => {
    const lights: Array<{ light: THREE.PointLight; base: number }> = [];
    const flames: Array<{ mesh: THREE.Mesh; phase: number }> = [];
    group.traverse((obj) => {
      const ud = obj.userData as { fireLight?: number; flame?: number };
      if (typeof ud.fireLight === "number" && (obj as THREE.PointLight).isPointLight) {
        lights.push({ light: obj as THREE.PointLight, base: ud.fireLight });
      }
      if (typeof ud.flame === "number" && (obj as THREE.Mesh).isMesh) {
        flames.push({ mesh: obj as THREE.Mesh, phase: ud.flame });
      }
    });
    return { lights, flames };
  }, [group]);

  useFrame(({ clock }, rawDt) => {
    updatePivots(group, Math.min(rawDt, 0.05));
    const t = clock.elapsedTime;
    for (const { light, base } of fire.lights) {
      light.intensity = base * (0.85 + 0.12 * Math.sin(t * 11) + 0.08 * Math.sin(t * 23 + 1));
    }
    for (const { mesh, phase } of fire.flames) {
      mesh.scale.y = 1 + 0.1 * Math.sin(t * 13 + phase) + 0.06 * Math.sin(t * 29 + phase * 2);
    }
  });

  return null;
}
