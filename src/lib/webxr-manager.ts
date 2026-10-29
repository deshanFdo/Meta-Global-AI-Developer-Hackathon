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
 * Native WebXR Controller & Locomotion Manager for Three.js
 * Supports:
 * - Meta Quest 2 / 3 / Pro & PCVR headsets
 * - Controller Ray & Hinge Teleportation (Right trigger)
 * - Thumbstick Smooth Locomotion (Left stick)
 * - Tabletop (1:20) vs Life-Size (1:1) AR placement
 */
export default function WebXRSessionManager({
  analysis,
  arScale,
  onSessionChange,
}: WebXRSessionManagerProps) {
  const { gl, scene, camera } = useThree();
  const teleportMarkerRef = useRef<THREE.Mesh | null>(null);
  const leftGamepadRef = useRef<Gamepad | null>(null);
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
      opacity: 0.8,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.visible = false;
    scene.add(marker);
    teleportMarkerRef.current = marker;

    // Ray geometry for controllers
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5),
    ]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });

    // Setup Right Controller (index 0: Teleport & Interaction)
    const controllerRight = gl.xr.getController(0);
    controllerRight.add(new THREE.Line(rayGeo, rayMat));
    scene.add(controllerRight);

    // Setup Left Controller (index 1: Smooth Locomotion)
    const controllerLeft = gl.xr.getController(1);
    const rayMatLeft = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
    controllerLeft.add(new THREE.Line(rayGeo, rayMatLeft));
    scene.add(controllerLeft);

    controllerLeft.addEventListener('connected', (e: unknown) => {
      const xrEvent = e as { data?: { gamepad?: Gamepad } };
      if (xrEvent.data?.gamepad) {
        leftGamepadRef.current = xrEvent.data.gamepad;
      }
    });

    // Teleportation on Right Controller Trigger
    let teleportTargetPoint: THREE.Vector3 | null = null;

    const handleSelectStart = () => {
      if (!gl.xr.isPresenting) return;
      tempMatrix.current.identity().extractRotation(controllerRight.matrixWorld);
      raycaster.current.ray.origin.setFromMatrixPosition(controllerRight.matrixWorld);
      raycaster.current.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix.current);

      const hits = raycaster.current.intersectObjects(scene.children, true);
      const floorHit = hits.find((h) => h.point && Math.abs(h.point.y) < 0.3);

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
        // Move camera rig
        const xrCamera = gl.xr.getCamera();
        const camPos = xrCamera.position;
        camPos.x = teleportTargetPoint.x;
        camPos.z = teleportTargetPoint.z;
        teleportTargetPoint = null;
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

  // Adjust model scale in AR mode
  useEffect(() => {
    const scaleFactor = arScale === 'tabletop' ? 0.05 : 1.0;
    // Find the building root group in scene
    const houseMesh = scene.getObjectByName('house_root_group');
    if (houseMesh) {
      houseMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  }, [arScale, scene]);

  // Frame loop: Left Thumbstick Smooth Locomotion in VR
  useFrame(() => {
    if (!gl.xr.isPresenting) return;

    // Check left thumbstick input
    const gp = leftGamepadRef.current;
    if (gp && gp.axes) {
      const ax = gp.axes[2] ?? gp.axes[0] ?? 0;
      const ay = gp.axes[3] ?? gp.axes[1] ?? 0;

      if (Math.abs(ax) > 0.15 || Math.abs(ay) > 0.15) {
        const xrCam = gl.xr.getCamera();
        const yaw = new THREE.Euler().setFromQuaternion(xrCam.quaternion, 'YXZ').y;
        const moveDir = new THREE.Vector3(-ax, 0, -ay).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        moveDir.normalize().multiplyScalar(0.04); // ~2.4 m/s walking speed

        xrCam.position.add(moveDir);

        // Boundary clamp
        const halfW = (analysis.metadata.overallWidth / 2) - 0.4;
        const halfD = (analysis.metadata.overallDepth / 2) - 0.4;
        xrCam.position.x = Math.max(-halfW, Math.min(halfW, xrCam.position.x));
        xrCam.position.z = Math.max(-halfD, Math.min(halfD, xrCam.position.z));
      }
    }
  });

  return null;
}
