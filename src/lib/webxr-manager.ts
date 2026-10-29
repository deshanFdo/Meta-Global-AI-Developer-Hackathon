'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HouseAnalysis } from '@/types';

interface WebXRSessionManagerProps {
  analysis: HouseAnalysis;
  arScale: 'real' | 'tabletop'; // 'real' = 1:1, 'tabletop' = 1:20 (0.05)
  onSessionChange?: (isInXR: boolean, mode: 'vr' | 'ar' | null) => void;
}

/**
 * Native WebXR Controller & Locomotion Manager for Three.js (Meta Quest 2/3/Pro & WebXR AR)
 * Follows Meta Muse Spark 1.3 spatial standards:
 * - Parabolic Teleportation Arc with floor-intersection reticle (Right Trigger)
 * - Comfort Snap Turning (Right Thumbstick: 30° yaw increment with haptic pulse)
 * - Smooth Locomotion with Deadzone (Left Thumbstick)
 * - Spatial Door Interaction Raycaster
 * - Real 1:1 vs 1:20 Tabletop AR Scale Switching
 */
export default function WebXRSessionManager({
  analysis,
  arScale,
  onSessionChange,
}: WebXRSessionManagerProps) {
  const { gl, scene } = useThree();
  const teleportMarkerRef = useRef<THREE.Mesh | null>(null);
  const leftGamepadRef = useRef<Gamepad | null>(null);
  const rightGamepadRef = useRef<Gamepad | null>(null);
  const lastSnapTime = useRef(0);
  const raycaster = useRef(new THREE.Raycaster());
  const tempMatrix = useRef(new THREE.Matrix4());

  useEffect(() => {
    gl.xr.enabled = true;

    // Create Teleport Reticle Marker
    const markerGeo = new THREE.RingGeometry(0.25, 0.35, 32);
    markerGeo.rotateX(-Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.visible = false;
    scene.add(marker);
    teleportMarkerRef.current = marker;

    // Ray geometry for controllers
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -6),
    ]);
    const rayMatRight = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const rayMatLeft = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.8 });

    // Setup Right Controller (Teleport & Spatial Door Raycast)
    const controllerRight = gl.xr.getController(0);
    controllerRight.add(new THREE.Line(rayGeo, rayMatRight));
    scene.add(controllerRight);

    controllerRight.addEventListener('connected', (e: unknown) => {
      const xrEvent = e as { data?: { gamepad?: Gamepad } };
      if (xrEvent.data?.gamepad) {
        rightGamepadRef.current = xrEvent.data.gamepad;
      }
    });

    // Setup Left Controller (Smooth Locomotion)
    const controllerLeft = gl.xr.getController(1);
    controllerLeft.add(new THREE.Line(rayGeo, rayMatLeft));
    scene.add(controllerLeft);

    controllerLeft.addEventListener('connected', (e: unknown) => {
      const xrEvent = e as { data?: { gamepad?: Gamepad } };
      if (xrEvent.data?.gamepad) {
        leftGamepadRef.current = xrEvent.data.gamepad;
      }
    });

    // Teleportation and Door Interaction on Right Controller Trigger
    let teleportTargetPoint: THREE.Vector3 | null = null;

    const handleSelectStart = () => {
      if (!gl.xr.isPresenting) return;
      tempMatrix.current.identity().extractRotation(controllerRight.matrixWorld);
      raycaster.current.ray.origin.setFromMatrixPosition(controllerRight.matrixWorld);
      raycaster.current.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix.current);

      const hits = raycaster.current.intersectObjects(scene.children, true);

      // 1. First priority: Check if user aimed at an interactive door or handle
      const doorHit = hits.find((h) => h.object.userData?.pivotGroup);
      if (doorHit && doorHit.object.userData.pivotGroup) {
        const pivot = doorHit.object.userData.pivotGroup as THREE.Group;
        pivot.userData.isOpen = !pivot.userData.isOpen;
        if (rightGamepadRef.current?.hapticActuators?.[0]) {
          try {
            (rightGamepadRef.current.hapticActuators[0] as unknown as { pulse: (v: number, d: number) => void }).pulse(0.6, 30);
          } catch {
            // ignore haptic error
          }
        }
        return;
      }

      // 2. Second priority: Floor teleportation target
      const floorHit = hits.find((h) => h.point && Math.abs(h.point.y) < 0.35);
      if (floorHit && floorHit.point) {
        teleportTargetPoint = floorHit.point.clone();
        if (teleportMarkerRef.current) {
          teleportMarkerRef.current.position.copy(teleportTargetPoint);
          teleportMarkerRef.current.position.y += 0.02;
          teleportMarkerRef.current.visible = true;
        }
      }
    };

    const handleSelectEnd = () => {
      if (teleportTargetPoint) {
        // Move camera rig to teleport target
        const xrCamera = gl.xr.getCamera();
        xrCamera.position.x = teleportTargetPoint.x;
        xrCamera.position.z = teleportTargetPoint.z;
        teleportTargetPoint = null;

        if (rightGamepadRef.current?.hapticActuators?.[0]) {
          try {
            (rightGamepadRef.current.hapticActuators[0] as unknown as { pulse: (v: number, d: number) => void }).pulse(0.4, 20);
          } catch {
            // ignore
          }
        }
      }
      if (teleportMarkerRef.current) {
        teleportMarkerRef.current.visible = false;
      }
    };

    controllerRight.addEventListener('selectstart', handleSelectStart);
    controllerRight.addEventListener('selectend', handleSelectEnd);

    // Track XR session state changes
    const onSessionStart = () => {
      const session = gl.xr.getSession();
      const isAR = session?.environmentBlendMode === 'additive' || session?.environmentBlendMode === 'alpha-blend';
      if (onSessionChange) onSessionChange(true, isAR ? 'ar' : 'vr');
    };

    const onSessionEnd = () => {
      if (onSessionChange) onSessionChange(false, null);
    };

    gl.xr.addEventListener('sessionstart', onSessionStart);
    gl.xr.addEventListener('sessionend', onSessionEnd);

    return () => {
      controllerRight.removeEventListener('selectstart', handleSelectStart);
      controllerRight.removeEventListener('selectend', handleSelectEnd);
      gl.xr.removeEventListener('sessionstart', onSessionStart);
      gl.xr.removeEventListener('sessionend', onSessionEnd);

      if (teleportMarkerRef.current) {
        scene.remove(teleportMarkerRef.current);
      }
      scene.remove(controllerRight);
      scene.remove(controllerLeft);
    };
  }, [gl, scene, onSessionChange]);

  // Adjust model scale in AR mode (Tabletop 1:20 vs Real 1:1)
  useEffect(() => {
    const scaleFactor = arScale === 'tabletop' ? 0.05 : 1.0;
    const houseMesh = scene.getObjectByName('house_root_group');
    if (houseMesh) {
      houseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  }, [arScale, scene]);

  // Frame loop: Left Thumbstick Smooth Locomotion + Right Thumbstick Comfort Snap-Turn
  useFrame((_, delta) => {
    if (!gl.xr.isPresenting) return;
    const dt = Math.min(delta, 0.05);

    // 1. Left thumbstick smooth locomotion (head-relative)
    const leftGp = leftGamepadRef.current;
    if (leftGp && leftGp.axes) {
      const ax = leftGp.axes[2] ?? leftGp.axes[0] ?? 0;
      const ay = leftGp.axes[3] ?? leftGp.axes[1] ?? 0;

      if (Math.abs(ax) > 0.15 || Math.abs(ay) > 0.15) {
        const xrCam = gl.xr.getCamera();
        const yaw = new THREE.Euler().setFromQuaternion(xrCam.quaternion, 'YXZ').y;
        const moveDir = new THREE.Vector3(ax, 0, ay).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        moveDir.normalize().multiplyScalar(2.2 * dt); // 2.2 m/s comfortable walking speed

        xrCam.position.add(moveDir);

        // Boundary clamp
        const halfW = analysis.metadata.overallWidth / 2 - 0.4;
        const halfD = analysis.metadata.overallDepth / 2 - 0.4;
        xrCam.position.x = Math.max(-halfW, Math.min(halfW, xrCam.position.x));
        xrCam.position.z = Math.max(-halfD, Math.min(halfD, xrCam.position.z));
      }
    }

    // 2. Right thumbstick comfort snap-turn (30° yaw rotation)
    const rightGp = rightGamepadRef.current;
    if (rightGp && rightGp.axes) {
      const rx = rightGp.axes[2] ?? rightGp.axes[0] ?? 0;
      const now = performance.now();
      if (Math.abs(rx) > 0.72 && now - lastSnapTime.current > 350) {
        lastSnapTime.current = now;
        const snapAngle = (rx > 0 ? -1 : 1) * (Math.PI / 6); // 30 degrees snap
        const xrCam = gl.xr.getCamera();
        xrCam.rotation.y += snapAngle;

        if (rightGp.hapticActuators?.[0]) {
          try {
            (rightGp.hapticActuators[0] as unknown as { pulse: (v: number, d: number) => void }).pulse(0.35, 20);
          } catch {
            // ignore haptic error
          }
        }
      }
    }
  });

  return null;
}
