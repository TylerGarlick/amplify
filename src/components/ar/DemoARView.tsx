"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, Camera, Music, Zap, Sparkles } from "lucide-react";

// Demo audio context and analyser
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let audioSource: AudioBufferSourceNode | null = null;
let isPlaying = false;

interface AudioData {
  bass: number;
  mid: number;
  treble: number;
  amplitude: number;
}

function useAudioAnalyzer() {
  const [audioData, setAudioData] = useState<AudioData>({
    bass: 0,
    mid: 0,
    treble: 0,
    amplitude: 0,
  });

  useEffect(() => {
    if (!analyser || !isPlaying) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateAudioData = () => {
      analyser!.getByteFrequencyData(dataArray);
      
      // Split into frequency bands
      const bassEnd = Math.floor(dataArray.length * 0.1);
      const midEnd = Math.floor(dataArray.length * 0.5);
      
      let bassSum = 0, midSum = 0, trebleSum = 0;
      
      for (let i = 0; i < bassEnd; i++) bassSum += dataArray[i];
      for (let i = bassEnd; i < midEnd; i++) midSum += dataArray[i];
      for (let i = midEnd; i < dataArray.length; i++) trebleSum += dataArray[i];
      
      const bass = bassSum / bassEnd / 255;
      const mid = midSum / (midEnd - bassEnd) / 255;
      const treble = trebleSum / (dataArray.length - midEnd) / 255;
      const amplitude = (bass + mid + treble) / 3;
      
      setAudioData({ bass, mid, treble, amplitude });
      requestAnimationFrame(updateAudioData);
    };
    
    updateAudioData();
  }, []);

  return audioData;
}

function AudioReactiveParticles({ audioData }: { audioData: AudioData }) {
  const particlesRef = useRef<THREE.Points>(null);
  const [particleCount] = useState(500);
  const velocitiesRef = useRef<Float32Array | null>(null);
  
  // Create particle geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  // Initialize velocities once
  if (!velocitiesRef.current) {
    velocitiesRef.current = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      velocitiesRef.current[i] = (Math.random() - 0.5) * 0.02;
    }
  }
  const velocities = velocitiesRef.current;
  
  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 2 + Math.random() * 3;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    
    colors[i * 3] = 0.5 + Math.random() * 0.5; // R
    colors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // G
    colors[i * 3 + 2] = 1.0; // B (violet/purple)
    
    sizes[i] = Math.random() * 0.1;
    
    velocities[i * 3] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
  }
  
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  
  // Animation loop
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;
    
    // Pulse particles with bass
    const pulseScale = 1 + audioData.bass * 1.5;
    
    for (let i = 0; i < particleCount; i++) {
      // Expand/contract with bass
      positions[i * 3] *= 1 + (audioData.bass - 0.5) * 0.1;
      positions[i * 3 + 1] *= 1 + (audioData.bass - 0.5) * 0.1;
      positions[i * 3 + 2] *= 1 + (audioData.bass - 0.5) * 0.1;
      
      // Add velocity
      positions[i * 3] += velocities[i * 3] * (1 + audioData.treble);
      positions[i * 3 + 1] += velocities[i * 3 + 1] * (1 + audioData.treble);
      positions[i * 3 + 2] += velocities[i * 3 + 2] * (1 + audioData.treble);
      
      // Update size with amplitude
      sizes[i] = (0.05 + Math.random() * 0.1) * (1 + audioData.amplitude * 2);
      
      // Reset if too far
      const dist = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2
      );
      if (dist > 8) {
        positions[i * 3] *= 0.9;
        positions[i * 3 + 1] *= 0.9;
        positions[i * 3 + 2] *= 0.9;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    
    // Rotate entire system with mid frequencies
    particlesRef.current.rotation.y += delta * 0.1 * (1 + audioData.mid);
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry attach="geometry" {...geometry} />
      <pointsMaterial
        attach="material"
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function AudioReactiveRing({ audioData }: { audioData: AudioData }) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!ringRef.current) return;
    
    // Scale with bass
    const scale = 1 + audioData.bass * 2;
    ringRef.current.scale.set(scale, scale, scale);
    
    // Rotate with treble
    ringRef.current.rotation.z += delta * 0.5 * (1 + audioData.treble);
    ringRef.current.rotation.x += delta * 0.2 * (1 + audioData.mid);
    
    // Color shift with amplitude
    const hue = (state.clock.elapsedTime * 0.2 + audioData.amplitude) % 1;
    ringRef.current.material.color.setHSL(hue, 0.8, 0.6);
  });
  
  return (
    <mesh ref={ringRef}>
      <torusGeometry attach="geometry" args={[2, 0.05, 16, 100]} />
      <meshStandardMaterial
        attach="material"
        color="#8b5cf6"
        emissive="#8b5cf6"
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function ARScene({ audioData, isPlaying }: { audioData: AudioData; isPlaying: boolean }) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {isPlaying ? (
        <>
          <AudioReactiveParticles audioData={audioData} />
          <AudioReactiveRing audioData={audioData} />
        </>
      ) : (
        <mesh>
          <sphereGeometry attach="geometry" args={[1, 32, 32]} />
          <meshStandardMaterial attach="material" color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} />
        </mesh>
      )}
      
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={isPlaying} autoRotateSpeed={2} />
    </>
  );
}

export function DemoARView() {
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioData = useAudioAnalyzer();
  
  const requestCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      setCameraGranted(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraGranted(false);
    }
  }, []);
  
  const toggleAudio = useCallback(async () => {
    if (isPlaying) {
      // Stop audio
      if (audioSource) {
        audioSource.stop();
        audioSource = null;
      }
      isPlaying = false;
    } else {
      // Start audio with oscillator (demo tone)
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      
      // Create demo audio (sine wave that modulates)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 2);
      oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 4);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioContext.destination);
      
      oscillator.start();
      audioSource = oscillator;
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (oscillator) {
          oscillator.stop();
          isPlaying = false;
        }
      }, 30000);
      
      isPlaying = true;
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioSource) {
        audioSource.stop();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [stream]);
  
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Camera Feed */}
      {cameraGranted && stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      {/* 3D AR Overlay */}
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }} className="absolute inset-0">
        <ARScene audioData={audioData} isPlaying={isPlaying} />
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span className="text-white font-semibold">AR Demo</span>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              <Music className="w-4 h-4 text-violet-400 animate-pulse" />
              <span className="text-xs text-violet-300">Audio Reactive</span>
            </div>
          )}
        </div>
        
        {/* Center Message */}
        {!cameraGranted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="text-center p-8 bg-black/70 backdrop-blur-md rounded-2xl max-w-sm mx-4">
              <Camera className="w-16 h-16 text-violet-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">AR Demo Experience</h2>
              <p className="text-zinc-400 mb-6">
                See audio-reactive 3D visualizations in augmented reality. No login required!
              </p>
              <Button
                onClick={requestCamera}
                className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-6 text-lg shadow-lg shadow-violet-600/30"
              >
                <Camera className="w-6 h-6 mr-2" />
                Enable Camera
              </Button>
            </div>
          </div>
        )}
        
        {/* Bottom Controls */}
        {cameraGranted && (
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4 pointer-events-auto">
            <Button
              onClick={toggleAudio}
              size="lg"
              className={`px-8 py-6 text-lg shadow-lg ${
                isPlaying
                  ? "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/30"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-6 h-6 mr-2" />
                  Stop Demo
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-2" />
                  Play Demo Audio
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Instructions */}
        {cameraGranted && (
          <div className="absolute top-20 left-0 right-0 text-center pointer-events-none">
            <p className="text-white/80 text-sm bg-black/30 backdrop-blur-sm inline-block px-4 py-2 rounded-full">
              {isPlaying ? "🎵 Watch the particles dance to the music!" : "Tap 'Play Demo Audio' to start"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
