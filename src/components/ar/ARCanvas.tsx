"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAudioStore } from "@/stores/audioStore";
import { useARStore } from "@/stores/arStore";
import { useLocationStore } from "@/stores/locationStore";
import { gpsToWorldPosition } from "@/lib/geo";
import type { StageWithVisualizations, VisualizationWithConfig } from "@/types/ar";
import { ParticleSystem } from "./visualizations/ParticleSystem";
import { GeometryPulse } from "./visualizations/GeometryPulse";
import { WaveformRibbon } from "./visualizations/WaveformRibbon";
import { FrequencyBars } from "./visualizations/FrequencyBars";
import { LightShow } from "./visualizations/LightShow";

interface ARVisualizationProps {
  visualization: VisualizationWithConfig;
  stage: StageWithVisualizations;
}

function ARVisualization({ visualization, stage }: ARVisualizationProps) {
  const beatData = useAudioStore((s) => s.beatData) ?? {
    bass: 0, mid: 0, treble: 0, beat: false, rms: 0, waveform: null
  };
  const isPlaying = useAudioStore((s) => s.isPlaying);

  const { x, y, z } = gpsToWorldPosition(
    useLocationStore.getState().lat ?? 0,
    useLocationStore.getState().lng ?? 0,
    stage.latitude,
    stage.longitude,
    visualization.offsetY
  );

  const position = [x, y, z] as [number, number, number];
  const rotation = [visualization.rotationX, visualization.rotationY, visualization.rotationZ] as [number, number, number];
  const scale = [visualization.scaleX, visualization.scaleY, visualization.scaleZ] as [number, number, number];

  switch (visualization.type) {
    case "PARTICLE_SYSTEM":
      return <ParticleSystem config={visualization.config as any} beatData={beatData} isPlaying={isPlaying} position={position} rotation={rotation} scale={scale} />;
    case "GEOMETRY_PULSE":
      return <GeometryPulse config={visualization.config as any} beatData={beatData} isPlaying={isPlaying} position={position} rotation={rotation} scale={scale} />;
    case "WAVEFORM_RIBBON":
      return <WaveformRibbon config={visualization.config as any} beatData={beatData} isPlaying={isPlaying} position={position} rotation={rotation} scale={scale} />;
    case "FREQUENCY_BARS":
      return <FrequencyBars config={visualization.config as any} beatData={beatData} isPlaying={isPlaying} position={position} rotation={rotation} scale={scale} />;
    case "LIGHT_SHOW":
      return <LightShow config={visualization.config as any} beatData={beatData} isPlaying={isPlaying} position={position} rotation={rotation} scale={scale} />;
    default:
      return null;
  }
}

interface ARSceneProps {
  videoElement: HTMLVideoElement | null;
  activeStage: StageWithVisualizations | null;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

function ARScene({ videoElement, activeStage, onSessionStart, onSessionEnd }: ARSceneProps) {
  const { camera, scene } = useThree();
  const bgTextureRef = useRef<THREE.VideoTexture | null>(null);
  const frameCountRef = useRef(0);

  // Attach camera feed as scene background
  useEffect(() => {
    if (!videoElement) return;

    const texture = new THREE.VideoTexture(videoElement);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    bgTextureRef.current = texture;
    scene.background = texture;

    return () => {
      texture.dispose();
      bgTextureRef.current = null;
      scene.background = null;
    };
  }, [videoElement, scene]);

  // Notify parent when entering a stage
  useEffect(() => {
    if (activeStage) {
      onSessionStart?.();
    }
  }, [activeStage, onSessionStart]);

  // Update audio context on each frame via useFrame
  useFrame(() => {
    frameCountRef.current++;
    // Background texture update is handled by Three.js VideoTexture internally
  });

  if (!activeStage) return null;

  return (
    <>
      {/* Ambient light for baseline illumination */}
      <ambientLight intensity={0.2} />

      {/* Render each visualization attached to the active stage */}
      {activeStage.visualizations
        .filter((v) => v.isVisible)
        .map((viz) => (
          <ARVisualization
            key={viz.id}
            visualization={viz}
            stage={activeStage}
          />
        ))}
    </>
  );
}

interface ARCanvasProps {
  videoElement: HTMLVideoElement | null;
  activeStage: StageWithVisualizations | null;
  className?: string;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

/**
 * ARCanvas — wraps @react-three/fiber Canvas with AR-specific scene setup.
 *
 * Usage:
 * ```tsx
 * <ARCanvas
 *   videoElement={videoRef.current}
 *   activeStage={stageWithVisualizations}
 *   onSessionStart={() => setSessionActive(true)}
 *   onSessionEnd={() => setSessionActive(false)}
 * />
 * ```
 *
 * On desktop (no camera), renders a starfield background so the Three.js
 * scene is visible and testable without AR hardware.
 */
export function ARCanvas({ videoElement, activeStage, className, onSessionStart, onSessionEnd }: ARCanvasProps) {
  // Lazy-load Canvas to avoid SSR issues
  const [Canvas, setCanvas] = useStateRef<typeof import("@react-three/fiber").Canvas>(
    () => require("@react-three/fiber").Canvas
  );

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: 75, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ background: "#000" }}
      >
        <ARSceneWithFallback
          videoElement={videoElement}
          activeStage={activeStage}
          onSessionStart={onSessionStart}
          onSessionEnd={onSessionEnd}
        />
      </Canvas>
    </div>
  );
}

// Inner component that conditionally renders either the full ARScene or a fallback
function ARSceneWithFallback({ videoElement, activeStage, onSessionStart, onSessionEnd }: ARSceneProps) {
  const hasVideo = videoElement !== null && videoElement.readyState >= 2;

  if (hasVideo) {
    return (
      <ARScene
        videoElement={videoElement}
        activeStage={activeStage}
        onSessionStart={onSessionStart}
        onSessionEnd={onSessionEnd}
      />
    );
  }

  // Desktop fallback: animated starfield + grid so visualizations are visible
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Starfield />
      <GridFloor />
      {activeStage && (
        <>
          {activeStage.visualizations
            .filter((v) => v.isVisible)
            .map((viz) => (
              <ARVisualization
                key={viz.id}
                visualization={viz}
                stage={activeStage}
              />
            ))}
        </>
      )}
    </>
  );
}

// ─── Desktop fallback scene elements ──────────────────────────────────────────

function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial size={0.3} color="#a78bfa" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function GridFloor() {
  return (
    <gridHelper
      args={[100, 50, "#4c1d95", "#1e1b4b"]}
      position={[0, -2, 0]}
    />
  );
}

// ─── Internal useRef that supports lazy initialization ────────────────────────

function useStateRef<T>(init: () => T): [T, (val: T) => void] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useState } = require("react") as typeof import("react");
  return useState<T>(init);
}
