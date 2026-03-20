"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BeatData, ParticleSystemConfig } from "@/types/ar";

interface ParticleSystemProps {
  config: ParticleSystemConfig;
  beatData: BeatData;
  isPlaying: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

/**
 * ParticleSystem visualization for AR.
 * Renders a cloud of particles that pulse and expand based on audio energy.
 */
export function ParticleSystem({
  config,
  beatData,
  isPlaying,
  position,
  rotation,
  scale,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Initialize particle positions and velocities
  const { positions, velocities } = useMemo(() => {
    const count = config.count || 1000;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random positions in a sphere
      const r = Math.random() * config.spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    return { positions, velocities };
  }, [config.count, config.spread]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !isPlaying) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const count = config.count || 1000;

    // Audio reactivity
    const bassIntensity = beatData.bass;
    const beatPulse = beatData.beat ? config.beatMultiplier : 1;
    const expansion = 1 + bassIntensity * 0.2 * beatPulse;

    for (let i = 0; i < count; i++) {
      // Move particles
      posArray[i * 3] += velocities[i * 3] * expansion;
      posArray[i * 3 + 1] += velocities[i * 3 + 1] * expansion;
      posArray[i * 3 + 2] += velocities[i * 3 + 2] * expansion;

      // Wrap particles within spread radius
      const d2 = 
        posArray[i * 3] ** 2 + 
        posArray[i * 3 + 1] ** 2 + 
        posArray[i * 3 + 2] ** 2;
      
      if (d2 > (config.spread * 1.5) ** 2) {
        // Reset to center area
        const r = Math.random() * config.spread * 0.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        posArray[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        posArray[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        posArray[i * 3 + 2] = r * Math.cos(phi);
      }
    }

    posAttr.needsUpdate = true;

    // Rotate system
    pointsRef.current.rotation.y += delta * 0.1 * (1 + bassIntensity);
    pointsRef.current.rotation.z += delta * 0.05;

    // Pulse material size
    if (materialRef.current) {
      materialRef.current.size = config.size * (1 + beatData.rms * 0.5 + (beatData.beat ? 0.3 : 0));
      materialRef.current.opacity = 0.4 + beatData.rms * 0.6;
    }
  });

  return (
    <points ref={pointsRef} position={position} rotation={rotation} scale={scale}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={config.color}
        size={config.size}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
