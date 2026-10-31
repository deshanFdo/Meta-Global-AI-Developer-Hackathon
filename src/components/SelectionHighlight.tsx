"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { findTag, type ElementTag } from "@/lib/geometry";

/** Pulsing highlight on the selected element (skips shared glass material). */
export default function SelectionHighlight({
  group,
  selection,
}: {
  group: THREE.Group;
  selection: ElementTag | null;
}): React.JSX.Element | null {
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
