"use client";

import { useEffect } from "react";
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

  useFrame((_, rawDt) => {
    updatePivots(group, Math.min(rawDt, 0.05));
  });

  return null;
}
