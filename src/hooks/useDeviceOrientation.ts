"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useLocationStore } from "@/stores/locationStore";

/**
 * Converts device orientation angles to a Three.js Quaternion.
 * alpha = compass heading (0–360, degrees from North)
 * beta  = front-back tilt (-180 to 180)
 * gamma = left-right tilt (-90 to 90)
 */
function deviceOrientationToQuaternion(
  alpha: number,
  beta: number,
  gamma: number
): THREE.Quaternion {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(beta),
    THREE.MathUtils.degToRad(alpha),
    THREE.MathUtils.degToRad(-gamma),
    "YXZ"
  );
  return new THREE.Quaternion().setFromEuler(euler);
}

export function useDeviceOrientation() {
  const { setHeading } = useLocationStore();
  const quaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());

  useEffect(() => {
    const handler = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = event;
      if (alpha === null || beta === null || gamma === null) return;

      quaternionRef.current = deviceOrientationToQuaternion(
        alpha,
        beta,
        gamma
      );
      setHeading(alpha); // store compass heading for HUD display
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [setHeading]);

  return quaternionRef;
}
