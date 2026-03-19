/**
 * Audio-reactive light show visualization using Three.js
 */

import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import type { BeatData, LightShowConfig } from "@/types/ar";

interface LightShowProps {
  beatData: BeatData;
  config: LightShowConfig;
  size?: number;
}

export function AudioReactiveLightShow({
  beatData,
  config,
  size = 10,
}: LightShowProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lightsRef = useRef<THREE.PointLight[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, size / size, 0.1, 1000);
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create lights
    const lights: THREE.PointLight[] = [];
    
    config.lights.forEach((lightConfig, i) => {
      const color = new THREE.Color(lightConfig.color);
      const light = new THREE.PointLight(color, lightConfig.intensity, 20);
      
      // Initial position
      const angle = (i / config.lights.length) * Math.PI * 2;
      light.position.set(
        Math.cos(angle) * lightConfig.orbitRadius,
        2,
        Math.sin(angle) * lightConfig.orbitRadius
      );
      
      scene.add(light);
      lights.push(light);

      // Add visible sphere for each light
      const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(light.position);
      scene.add(sphere);
    });

    lightsRef.current = lights;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);

    // Add floor for reflections
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    scene.add(floor);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;

      // Update lights
      lightsRef.current.forEach((light, i) => {
        const lightConfig = config.lights[i];
        const time = timeRef.current * lightConfig.orbitSpeed;
        const angle = (i / config.lights.length) * Math.PI * 2 + time;

        // Orbit movement
        light.position.x = Math.cos(angle) * lightConfig.orbitRadius;
        light.position.z = Math.sin(angle) * lightConfig.orbitRadius;

        // React to audio
        let intensityMultiplier = 1;
        let yOffset = 0;

        switch (lightConfig.reactTo) {
          case "bass":
            intensityMultiplier = 1 + beatData.bass * 3;
            yOffset = beatData.bass * 2;
            break;
          case "mid":
            intensityMultiplier = 1 + beatData.mid * 3;
            yOffset = beatData.mid * 2;
            break;
          case "treble":
            intensityMultiplier = 1 + beatData.treble * 3;
            yOffset = beatData.treble * 2;
            break;
          case "beat":
            intensityMultiplier = beatData.beat ? 4 : 1;
            yOffset = beatData.beat ? 3 : 0;
            break;
        }

        light.position.y = 2 + yOffset;
        light.intensity = lightConfig.intensity * intensityMultiplier;

        // Update visible sphere
        const sphere = scene.children.find(
          child => child instanceof THREE.Mesh && 
                   child.geometry instanceof THREE.SphereGeometry &&
                   child.position.x === light.position.x &&
                   child.position.z === light.position.z
        ) as THREE.Mesh | undefined;
        
        if (sphere) {
          sphere.position.copy(light.position);
          (sphere.material as THREE.MeshBasicMaterial).color.setHSL(
            (Date.now() * 0.0001 + i * 0.1) % 1,
            1,
            0.5 + beatData.rms * 0.3
          );
        }
      });

      // Camera movement on beat
      if (beatData.beat) {
        camera.position.y = 5 + Math.random() * 2;
        camera.position.x = (Math.random() - 0.5) * 2;
      } else {
        camera.position.y += (5 - camera.position.y) * 0.1;
        camera.position.x += (0 - camera.position.x) * 0.1;
      }
      camera.lookAt(0, 0, 0);

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
      
      rendererRef.current?.dispose();
    };
  }, [config, size]);

  // Update light colors based on energy (saturation matching)
  useEffect(() => {
    const energy = beatData.rms;
    
    lightsRef.current.forEach((light, i) => {
      const baseColor = new THREE.Color(config.lights[i].color);
      // Increase saturation with energy
      const hue = baseColor.getHSL({ h: 0, s: 0, l: 0 }).h;
      const saturation = 0.5 + energy * 0.5;
      const lightness = 0.3 + energy * 0.4;
      
      light.color.setHSL(hue, saturation, lightness);
    });
  }, [beatData, config.lights]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full"
      style={{ width: size, height: size }}
    />
  );
}