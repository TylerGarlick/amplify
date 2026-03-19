/**
 * Audio-reactive frequency bars visualization using Three.js
 */

import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import type { BeatData, FrequencyBarsConfig } from "@/types/ar";

interface FrequencyBarsProps {
  beatData: BeatData;
  config: FrequencyBarsConfig;
  size?: number;
}

export function FrequencyBars({
  beatData,
  config,
  size = 10,
}: FrequencyBarsProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);
  const animationRef = useRef<number>(0);

  // Create bar positions based on arrangement
  const barPositions = useMemo(() => {
    const positions: { x: number; y: number; z: number }[] = [];
    const count = config.count;
    const baseColor = new THREE.Color(config.color);

    if (config.arrangement === "line") {
      const spacing = 0.5;
      const startX = -((count - 1) * spacing) / 2;
      for (let i = 0; i < count; i++) {
        positions.push({
          x: startX + i * spacing,
          y: 0,
          z: 0,
        });
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

    return { positions, baseColor };
  }, [config.count, config.arrangement, config.color]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, size / size, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create bars
    const bars: THREE.Mesh[] = [];
    const geometry = new THREE.BoxGeometry(0.3, 1, 0.3);

    for (let i = 0; i < config.count; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: barPositions.baseColor,
        emissive: barPositions.baseColor,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      });

      const bar = new THREE.Mesh(geometry, material);
      const pos = barPositions.positions[i];
      bar.position.set(pos.x, pos.y, pos.z);
      
      scene.add(bar);
      bars.push(bar);
    }

    barsRef.current = bars;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Add point lights for effect
    const pointLight1 = new THREE.PointLight(0x7c3aed, 1, 30);
    pointLight1.position.set(5, 10, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xec4899, 1, 30);
    pointLight2.position.set(-5, 10, -5);
    scene.add(pointLight2);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Update bar heights based on frequency data
      barsRef.current.forEach((bar, i) => {
        // Map bar index to frequency range
        const frequencyValue = getFrequencyForBar(i, config.count, beatData);
        
        // Smooth transition
        const targetHeight = 0.1 + frequencyValue * config.maxHeight;
        const currentHeight = bar.scale.y;
        const smoothHeight = currentHeight + (targetHeight - currentHeight) * 0.3;
        
        bar.scale.y = smoothHeight;
        bar.position.y = smoothHeight / 2;

        // Update color intensity based on energy
        const material = bar.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.3 + frequencyValue * 0.7;
      });

      // Rotate camera slightly based on beat
      const time = Date.now() * 0.0001;
      camera.position.x = Math.sin(time) * 2;
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !mountRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);
      
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      geometry.dispose();
      barsRef.current.forEach(bar => (bar.material as THREE.Material).dispose());
      rendererRef.current?.dispose();
    };
  }, [config, barPositions, size]);

  // Update colors based on energy
  useEffect(() => {
    const energy = beatData.rms;
    const saturation = 0.5 + energy * 0.5;

    barsRef.current.forEach((bar, i) => {
      const material = bar.material as THREE.MeshStandardMaterial;
      // Shift hue based on bar position
      const hue = (i / config.count + energy * 0.1) % 1;
      material.color.setHSL(hue, saturation, 0.5);
      material.emissive.setHSL(hue, saturation, 0.5);
    });
  }, [beatData, config.count]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full"
      style={{ width: size, height: size }}
    />
  );
}

// Helper function to map bar index to frequency band
function getFrequencyForBar(index: number, totalBars: number, beatData: BeatData): number {
  const normalizedIndex = index / (totalBars - 1);
  
  // Map bars to frequency ranges (bass on left, treble on right)
  if (normalizedIndex < 0.33) {
    return beatData.bass * (1 - normalizedIndex * 3) + beatData.mid * normalizedIndex * 3 * 0.3;
  } else if (normalizedIndex < 0.66) {
    const midNormalized = (normalizedIndex - 0.33) / 0.33;
    return beatData.mid * (1 - Math.abs(midNormalized - 0.5) * 2) + beatData.bass * 0.3;
  } else {
    const trebleNormalized = (normalizedIndex - 0.66) / 0.34;
    return beatData.treble * trebleNormalized + beatData.mid * (1 - trebleNormalized) * 0.3;
  }
}