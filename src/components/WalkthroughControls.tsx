'use client';

import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HouseAnalysis } from '@/types';

interface WalkthroughControlsProps {
  analysis: HouseAnalysis;
  active: boolean;
}

/**
 * First-person WASD + Arrow keys keyboard controller for interactive architectural walkthroughs.
 * Maintains realistic human walking speed (2.5 m/s) and human eye height (1.65m),
 * clamped within the bounding perimeter of the house.
 */
export default function WalkthroughControls({ analysis, active }: WalkthroughControlsProps) {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling on navigation keys
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keys.current[e.code] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keys.current = {};
    };
  }, [active]);

  useFrame((_, delta) => {
    if (!active) return;

    const moveSpeed = 3.0 * delta; // 3.0 m/s walking speed
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Get horizontal forward direction of camera
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Calculate perpendicular strafe direction (right)
    right.crossVectors(forward, camera.up).normalize();

    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keys.current['KeyW'] || keys.current['ArrowUp']) {
      moveVector.add(forward);
    }
    if (keys.current['KeyS'] || keys.current['ArrowDown']) {
      moveVector.sub(forward);
    }
    if (keys.current['KeyD'] || keys.current['ArrowRight']) {
      moveVector.add(right);
    }
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) {
      moveVector.sub(right);
    }

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed);
      camera.position.add(moveVector);

      // Boundary clamp to prevent falling outside the house lot
      const halfW = (analysis.metadata.overallWidth / 2) - 0.4;
      const halfD = (analysis.metadata.overallDepth / 2) - 0.4;

      camera.position.x = Math.max(-halfW, Math.min(halfW, camera.position.x));
      camera.position.z = Math.max(-halfD, Math.min(halfD, camera.position.z));
      camera.position.y = 1.65; // Eye height
    }
  });

  return null;
}
