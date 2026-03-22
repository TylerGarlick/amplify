"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BeatData, GeometryPulseConfig } from "@/types/ar";

interface GeometryPulseProps {
  config: GeometryPulseConfig;
  beatData: BeatData;
  isPlaying: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

const GEOMETRY_MAP: Record<string, () => THREE.BufferGeometry> = {
  sphere: () => new THREE.SphereGeometry(1, 32, 32),
  icosahedron: () => new THREE.IcosahedronGeometry(1, 1),
  torus: () => new THREE.TorusGeometry(0.8, 0.3, 16, 48),
  box: () => new THREE.BoxGeometry(1.4, 1.4, 1.4),
  octahedron: () => new THREE.OctahedronGeometry(1, 0),
};

export function GeometryPulse({
  config,
  beatData,
  isPlaying,
  position,
  rotation,
  scale,
}: GeometryPulseProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const targetScaleRef = useRef(1);

  useFrame((_state, delta) => {
    if (!meshRef.current || !isPlaying) return;

    const bass = beatData.bass;
    const rms = beatData.rms;
    const beat = beatData.beat;

    // Target scale pulses with bass energy and beats
    const pulse = 1 + bass * (config.pulseScale - 1) * 0.8 + (beat ? (config.pulseScale - 1) * 0.4 : 0);
    targetScaleRef.current += (pulse - targetScaleRef.current) * 0.15;

    const s = targetScaleRef.current;
    meshRef.current.scale.setScalar(s);
    if (wireframeRef.current) {
      wireframeRef.current.scale.setScalar(s * 1.01);
    }

    // Rotation
    const rotSpeed = config.rotationSpeed * (1 + bass * 0.5);
    meshRef.current.rotation.y += delta * rotSpeed;
    meshRef.current.rotation.x += delta * rotSpeed * 0.37;

    // Emissive intensity driven by energy
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.3 + rms * 0.7 + (beat ? 0.4 : 0);
  });

  const geometryFn = GEOMETRY_MAP[config.geometry] ?? GEOMETRY_MAP.sphere;
  const geo = geometryFn();

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Solid mesh */}
      <mesh ref={meshRef} geometry={geo}>
        <meshStandardMaterial
          color={config.color}
          emissive={config.emissiveColor}
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Wireframe overlay */}
      {config.wireframe && (
        <lineSegments ref={wireframeRef} geometry={geo}>
          <lineBasicMaterial
            color={config.emissiveColor}
            transparent
            opacity={0.3}
            linewidth={1}
          />
        </lineSegments>
      )}
    </group>
  );
}
