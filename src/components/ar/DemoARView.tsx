"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, Camera, Music, Zap, Sparkles, X } from "lucide-react";

// Global audio context
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let audioSource: OscillatorNode | null = null;
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
  
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  if (!velocitiesRef.current) {
    velocitiesRef.current = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      velocitiesRef.current[i] = (Math.random() - 0.5) * 0.02;
    }
  }
  const velocities = velocitiesRef.current;
  
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 2 + Math.random() * 3;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    
    colors[i * 3] = 0.5 + Math.random() * 0.5;
    colors[i * 3 + 1] = 0.2 + Math.random() * 0.3;
    colors[i * 3 + 2] = 1.0;
    
    sizes[i] = Math.random() * 0.1;
  }
  
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;
    
    const pulseScale = 1 + audioData.bass * 2;
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] *= 1 + (audioData.bass - 0.5) * 0.15;
      positions[i * 3 + 1] *= 1 + (audioData.bass - 0.5) * 0.15;
      positions[i * 3 + 2] *= 1 + (audioData.bass - 0.5) * 0.15;
      
      positions[i * 3] += velocities[i * 3] * (1 + audioData.treble * 2);
      positions[i * 3 + 1] += velocities[i * 3 + 1] * (1 + audioData.treble * 2);
      positions[i * 3 + 2] += velocities[i * 3 + 2] * (1 + audioData.treble * 2);
      
      sizes[i] = (0.08 + Math.random() * 0.15) * (1 + audioData.amplitude * 3);
      
      const dist = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2
      );
      if (dist > 10) {
        positions[i * 3] *= 0.92;
        positions[i * 3 + 1] *= 0.92;
        positions[i * 3 + 2] *= 0.92;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    
    particlesRef.current.rotation.y += delta * 0.15 * (1 + audioData.mid);
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry attach="geometry" {...geometry} />
      <pointsMaterial
        attach="material"
        size={0.15}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function AudioReactiveRing({ audioData }: { audioData: AudioData }) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!ringRef.current) return;
    
    const scale = 1 + audioData.bass * 2.5;
    ringRef.current.scale.set(scale, scale, scale);
    
    ringRef.current.rotation.z += delta * 0.6 * (1 + audioData.treble);
    ringRef.current.rotation.x += delta * 0.3 * (1 + audioData.mid);
    
    const hue = (state.clock.elapsedTime * 0.15 + audioData.amplitude) % 1;
    const material = ringRef.current.material as THREE.MeshStandardMaterial;
    material.color.setHSL(hue, 0.9, 0.6);
    material.emissive.setHSL(hue, 0.9, 0.4);
  });
  
  return (
    <mesh ref={ringRef} position={[0, 0, -3]} rotation={[0.2, 0, 0]}>
      <torusGeometry attach="geometry" args={[3, 0.15, 24, 120]} />
      <meshStandardMaterial
        attach="material"
        color="#8b5cf6"
        emissive="#8b5cf6"
        emissiveIntensity={0.8}
        transparent
        opacity={0.95}
        toneMapped={false}
      />
    </mesh>
  );
}

function ARScene({ audioData, isPlaying }: { audioData: AudioData; isPlaying: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      
      {isPlaying ? (
        <>
          <AudioReactiveParticles audioData={audioData} />
          <AudioReactiveRing audioData={audioData} />
        </>
      ) : (
        <mesh position={[0, 0, -3]}>
          <sphereGeometry attach="geometry" args={[1.5, 32, 32]} />
          <meshStandardMaterial 
            attach="material" 
            color="#8b5cf6" 
            emissive="#8b5cf6" 
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        autoRotate={isPlaying} 
        autoRotateSpeed={1.5}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
}

export function DemoARView() {
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioData = useAudioAnalyzer();
  
  const startAR = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      setStream(mediaStream);
      setCameraGranted(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      // Auto-start audio after camera is ready
      setTimeout(() => {
        startAudio();
      }, 500);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please allow camera permission and try again.");
      setCameraGranted(false);
    }
  }, []);
  
  const startAudio = useCallback(() => {
    if (isPlaying) return;
    
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(110, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 1.5);
    oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 3);
    
    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 3);
    
    oscillator.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);
    
    oscillator.start();
    audioSource = oscillator;
    
    setTimeout(() => {
      if (oscillator && !oscillator.frequency.value) {
        oscillator.stop();
        isPlaying = false;
      }
    }, 30000);
    
    isPlaying = true;
  }, []);
  
  const stopExperience = useCallback(() => {
    if (audioSource) {
      audioSource.stop();
      audioSource = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    isPlaying = false;
    setCameraGranted(false);
    setError(null);
  }, [stream]);
  
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
      {/* Camera Feed - Background Layer */}
      {cameraGranted && stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
      )}
      
      {/* 3D AR Overlay - Transparent Canvas */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <Canvas
          camera={{ position: [0, 0, 0], fov: 75 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ARScene audioData={audioData} isPlaying={isPlaying} />
        </Canvas>
      </div>
      
      {/* UI Overlay - Top Layer */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span className="text-white font-semibold">AR Demo</span>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
              <Music className="w-4 h-4 text-violet-400 animate-pulse" />
              <span className="text-xs text-violet-300">Live</span>
            </div>
          )}
          {cameraGranted && (
            <button
              onClick={stopExperience}
              className="bg-black/60 backdrop-blur-md rounded-full p-2 hover:bg-black/80 transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
        
        {/* Center - Start Button or Instructions */}
        {!cameraGranted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="text-center p-8 bg-black/70 backdrop-blur-md rounded-2xl max-w-sm mx-4 border border-violet-600/30">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="w-20 h-20 rounded-full bg-violet-600/20 border-2 border-violet-500 flex items-center justify-center animate-pulse">
                  <Camera className="w-10 h-10 text-violet-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">AR Music Experience</h2>
              <p className="text-zinc-400 mb-6 text-sm">
                See a life-size 3D stage with audio-reactive visuals in your actual space.
              </p>
              {error ? (
                <div className="space-y-3">
                  <p className="text-red-400 text-sm">{error}</p>
                  <Button
                    onClick={startAR}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white px-8 py-6 text-lg shadow-lg shadow-violet-600/40"
                  >
                    <Camera className="w-6 h-6 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={startAR}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white px-8 py-6 text-lg shadow-lg shadow-violet-600/40"
                >
                  <Sparkles className="w-6 h-6 mr-2" />
                  Start AR Experience
                </Button>
              )}
              <p className="text-zinc-500 text-xs mt-4">
                One tap to enable camera + start demo
              </p>
            </div>
          </div>
        )}
        
        {/* Bottom - Playing Controls */}
        {cameraGranted && isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4 pointer-events-auto">
            <div className="bg-black/60 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-sm font-medium">AR Active</span>
              <span className="text-zinc-400 text-xs">•</span>
              <span className="text-zinc-400 text-xs">Audio reactive</span>
            </div>
          </div>
        )}
        
        {/* Instructions Overlay */}
        {cameraGranted && !isPlaying && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-md rounded-xl px-6 py-4 border border-violet-600/30">
              <p className="text-white text-sm">Starting audio...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
