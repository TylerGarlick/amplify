"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BeatData, FrequencyBarsConfig } from "@/types/ar";

interface FrequencyBarsProps {
  config: FrequencyBarsConfig;
  beatData: BeatData;
  isPlaying: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export function FrequencyBars({
  config,
  beatData,
  isPlaying,
  position,
  rotation,
  scale,
}: FrequencyBarsProps) {
  const barsRef = useRef<(THREE.Mesh | null)[]>([]);

  // Pre-compute bar positions based on arrangement
  const barPositions = useMemo(() => {
    const positions: { x: number; y: number; z: number }[] = [];
    const count = config.count;

    if (config.arrangement === "line") {
      const spacing = 0.5;
      const startX = -((count - 1) * spacing) / 2;
      for (let i = 0; i < count; i++) {
        positions.push({ x: startX + i * spacing, y: 0, z: 0 });
      }
    } else if (config.arrangement === "arc") {
      const arcRadius = 8;
      const arcAngle = Math.PI * 0.6;
      const startAngle = Math.PI + arcAngle / 2;
      for (let i = 0; i < count; i++) {
        const angle = startAngle - (i / (count - 1)) * arcAngle;
        positions.push({
          x: Math.cos(angle) * arcRadius,
          y: 0,
          z: Math.sin(angle) * arcRadius,
        });
      }
    } else if (config.arrangement === "circle") {
      const radius = 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        positions.push({
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius,
        });
      }
    }

    return positions;
  }, [config.count, config.arrangement]);

  // Stable geometry shared across all bars
  const geometry = useMemo(
    () => new THREE.BoxGeometry(0.3, 1, 0.3),
    []
  );

  useFrame(() => {
    if (!isPlaying) return;

    barsRef.current.forEach((bar, i) => {
      if (!bar) return;

      // Map bar index to frequency range (bass→mid→treble across the bar array)
      const normalized = i / (config.count - 1);
      let frequencyValue: number;

      if (normalized < 0.33) {
        frequencyValue = beatData.bass * (1 - normalized * 3) + beatData.mid * normalized * 3 * 0.2;
      } else if (normalized < 0.66) {
        const midNorm = (normalized - 0.33) / 0.33;
        frequencyValue = beatData.mid * (1 - Math.abs(midNorm - 0.5) * 2) + beatData.bass * 0.2;
      } else {
        const trebleNorm = (normalized - 0.66) / 0.34;
        frequencyValue = beatData.treble * trebleNorm + beatData.mid * (1 - trebleNorm) * 0.2;
      }

      const targetHeight = 0.1 + frequencyValue * config.maxHeight;
      const currentHeight = bar.scale.y;
      const smoothHeight = currentHeight + (targetHeight - currentHeight) * 0.25;

      bar.scale.y = smoothHeight;
      bar.position.y = smoothHeight / 2;

      // Update color intensity
      const mat = bar.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + frequencyValue * 0.8;

      // Hue shift with energy
      const hue = ((i / config.count) + beatData.rms * 0.1) % 1;
      mat.color.setHSL(hue, 0.6 + beatData.rms * 0.4, 0.5);
      mat.emissive.setHSL(hue, 0.8, 0.3 + beatData.rms * 0.3);
    });
  });

  const baseColor = useMemo(() => new THREE.Color(config.color), [config.color]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {barPositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          position={[pos.x, pos.y, pos.z]}
          geometry={geometry}
        >
          <meshStandardMaterial
            color={baseColor}
            emissive={baseColor}
            emissiveIntensity={0.5}
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
