"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BeatData, LightShowConfig } from "@/types/ar";

interface LightShowProps {
  config: LightShowConfig;
  beatData: BeatData;
  isPlaying: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export function LightShow({
  config,
  beatData,
  isPlaying,
  position,
  rotation,
  scale,
}: LightShowProps) {
  const lightsRef = useRef<THREE.PointLight[]>([]);
  const sphereRefs = useRef<(THREE.Mesh | null)[]>([]);
  const timeRef = useRef(0);

  useFrame((_state, delta) => {
    if (!isPlaying) return;
    timeRef.current += delta;

    lightsRef.current.forEach((light, i) => {
      if (!light) return;
      const lightConfig = config.lights[i];
      if (!lightConfig) return;

      const time = timeRef.current * lightConfig.orbitSpeed;
      const angle = (i / config.lights.length) * Math.PI * 2 + time;

      // Orbit on XZ plane
      light.position.x = Math.cos(angle) * lightConfig.orbitRadius;
      light.position.z = Math.sin(angle) * lightConfig.orbitRadius;

      // Audio reactivity
      let intensityMult = 1;
      let yBase = 2;

      switch (lightConfig.reactTo) {
        case "bass":
          intensityMult = 1 + beatData.bass * 4;
          yBase = 2 + beatData.bass * 3;
          break;
        case "mid":
          intensityMult = 1 + beatData.mid * 3;
          yBase = 2 + beatData.mid * 2;
          break;
        case "treble":
          intensityMult = 1 + beatData.treble * 2.5;
          yBase = 2 + beatData.treble * 1.5;
          break;
        case "beat":
          intensityMult = beatData.beat ? 5 : 1;
          yBase = beatData.beat ? 5 : 2;
          break;
      }

      // Ease y towards target
      light.position.y += (yBase - light.position.y) * 0.12;
      light.intensity = lightConfig.intensity * intensityMult;

      // Update sphere visualizer
      const sphere = sphereRefs.current[i];
      if (sphere) {
        sphere.position.copy(light.position);
        const mat = sphere.material as THREE.MeshBasicMaterial;
        mat.color.setHSL(
          ((Date.now() * 0.0001) + i * 0.15) % 1,
          0.8,
          0.4 + beatData.rms * 0.4
        );
      }
    });
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <ambientLight intensity={0.15} />

      {config.lights.map((lightConfig, i) => (
        <group key={i}>
          <pointLight
            ref={(el) => { lightsRef.current[i] = el!; }}
            color={lightConfig.color}
            intensity={lightConfig.intensity}
            distance={20}
            decay={2}
          />
          <mesh
            ref={(el) => { sphereRefs.current[i] = el; }}
            position={[
              Math.cos((i / config.lights.length) * Math.PI * 2) * lightConfig.orbitRadius,
              2,
              Math.sin((i / config.lights.length) * Math.PI * 2) * lightConfig.orbitRadius,
            ]}
          >
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshBasicMaterial color={lightConfig.color} />
          </mesh>
        </group>
      ))}

      {/* Reflective floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}
