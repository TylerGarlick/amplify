"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BeatData, WaveformRibbonConfig } from "@/types/ar";

interface WaveformRibbonProps {
  config: WaveformRibbonConfig;
  beatData: BeatData;
  isPlaying: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export function WaveformRibbon({
  config,
  beatData,
  isPlaying,
  position,
  rotation,
  scale,
}: WaveformRibbonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Spine curve for the ribbon path
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segs = config.segments;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const angle = t * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          Math.cos(angle) * config.radius,
          0,
          Math.sin(angle) * config.radius
        )
      );
    }
    return new THREE.CatmullRomCurve3(pts, true);
  }, [config.radius, config.segments]);

  // Build ribbon geometry (tube / extruded shape along curve)
  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, config.segments, config.width, 8, true);
  }, [curve, config.radius, config.width, config.segments]);

  useFrame(() => {
    if (!groupRef.current || !isPlaying) return;

    // Scale the tube with bass energy
    const bassScale = 1 + beatData.bass * 0.3 + beatData.rms * 0.2;
    groupRef.current.scale.setScalar(bassScale);

    // Rotate based on mid energy
    groupRef.current.rotation.y += 0.005 + beatData.mid * 0.015;
    groupRef.current.rotation.x += 0.002 + beatData.treble * 0.008;

    // Pulse emissive intensity
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + beatData.rms * 0.8;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group ref={groupRef}>
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial
            color={config.color}
            emissive={config.color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
            wireframe={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Wireframe overlay for extra glow */}
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color={config.color}
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
      </group>
    </group>
  );
}
