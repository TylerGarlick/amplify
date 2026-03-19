/**
 * Audio-reactive particle system visualization using Three.js
 */

import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import type { BeatData, ParticleSystemConfig } from "@/types/ar";

interface AudioReactiveParticlesProps {
  beatData: BeatData;
  config: ParticleSystemConfig;
  size?: number;
}

export function AudioReactiveParticles({
  beatData,
  config,
  size = 10,
}: AudioReactiveParticlesProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Create particle geometry and material
  const { positions, velocities, colors, geometry } = useMemo(() => {
    const count = config.count;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const baseColor = new THREE.Color(config.color);
    
    for (let i = 0; i < count; i++) {
      // Random positions in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * config.spread;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Random velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      
      // Colors with slight variation
      const colorVariation = 0.8 + Math.random() * 0.4;
      colors[i * 3] = baseColor.r * colorVariation;
      colors[i * 3 + 1] = baseColor.g * colorVariation;
      colors[i * 3 + 2] = baseColor.b * colorVariation;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    
    return { positions, velocities, colors, geometry };
  }, [config.count, config.color, config.spread]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.1);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      size / size,
      0.1,
      1000
    );
    camera.position.z = 15;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create particles
    const material = new THREE.PointsMaterial({
      size: config.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;

      if (particlesRef.current) {
        const posAttr = particlesRef.current.geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;

        // Audio-reactive movement
        const bassIntensity = beatData.bass;
        const beatPulse = beatData.beat ? config.beatMultiplier : 1;

        for (let i = 0; i < config.count; i++) {
          // Expand on beat
          const expansion = 1 + bassIntensity * 0.5 * beatPulse;
          
          posArray[i * 3] += velocities[i * 3] * expansion;
          posArray[i * 3 + 1] += velocities[i * 3 + 1] * expansion;
          posArray[i * 3 + 2] += velocities[i * 3 + 2] * expansion;

          // Reset particles that go too far
          const dist = Math.sqrt(
            posArray[i * 3] ** 2 + 
            posArray[i * 3 + 1] ** 2 + 
            posArray[i * 3 + 2] ** 2
          );

          if (dist > config.spread * 2) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.random() * config.spread;
            
            posArray[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            posArray[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            posArray[i * 3 + 2] = r * Math.cos(phi);
          }
        }

        posAttr.needsUpdate = true;

        // Rotate entire system based on bass
        particlesRef.current.rotation.y += 0.002 + bassIntensity * 0.01;
        particlesRef.current.rotation.x += 0.001 + bassIntensity * 0.005;
      }

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
      (particlesRef.current?.material as THREE.Material)?.dispose();
      rendererRef.current?.dispose();
    };
  }, [config, beatData, geometry, size]);

  // Update particle behavior when beat changes
  useEffect(() => {
    if (!particlesRef.current) return;

    const material = particlesRef.current.material as THREE.PointsMaterial;
    
    // Pulse size on beat
    const baseSize = config.size;
    const beatSize = baseSize * (beatData.beat ? 2 : 1);
    material.size = baseSize + (beatSize - baseSize) * 0.3;

    // Adjust opacity based on energy
    material.opacity = 0.5 + beatData.rms * 0.5;
  }, [beatData, config.size]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full"
      style={{ width: size, height: size }}
    />
  );
}