"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, X, Compass } from "lucide-react";

// Global audio state
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let isPlaying = false;

interface AudioData {
  bass: number;
  mid: number;
  treble: number;
  amplitude: number;
  beat: boolean;
}

interface DeviceOrientation {
  alpha: number; // Z-axis rotation (compass direction)
  beta: number;  // X-axis rotation (front-back tilt)
  gamma: number; // Y-axis rotation (left-right tilt)
}

function useAudioAnalyzer() {
  const [audioData, setAudioData] = useState<AudioData>({
    bass: 0,
    mid: 0,
    treble: 0,
    amplitude: 0,
    beat: false,
  });

  useEffect(() => {
    if (!analyser || !isPlaying) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let lastBeatTime = 0;
    
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
      
      const now = Date.now();
      const beat = bass > 0.7 && (now - lastBeatTime > 200);
      if (beat) lastBeatTime = now;
      
      setAudioData({ bass, mid, treble, amplitude, beat });
      requestAnimationFrame(updateAudioData);
    };
    
    updateAudioData();
  }, []);

  return audioData;
}

function FixedStage({ audioData }: { audioData: AudioData }) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const particleSystemRef = useRef<THREE.Points>(null);
  const platformRef = useRef<THREE.Mesh>(null);
  
  // Create particles
  const particlesGeometry = new THREE.BufferGeometry();
  const particleCount = 800;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 3 + Math.random() * 2;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    
    colors[i * 3] = 0.5 + Math.random() * 0.5;
    colors[i * 3 + 1] = 0.3 + Math.random() * 0.4;
    colors[i * 3 + 2] = 1.0;
  }
  
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  
  useFrame((state, delta) => {
    if (!sphereRef.current || !particleSystemRef.current || !platformRef.current) return;
    
    // Pulse sphere with bass
    const targetScale = 1 + audioData.bass * 1.8;
    sphereRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    
    // Rotate sphere on beat
    if (audioData.beat) {
      sphereRef.current.rotation.y += 0.3;
      sphereRef.current.rotation.x += 0.15;
    }
    
    // Slow continuous rotation
    sphereRef.current.rotation.y += delta * 0.2;
    
    // Color shift with amplitude
    const hue = (state.clock.elapsedTime * 0.1 + audioData.amplitude * 0.5) % 1;
    (sphereRef.current.material as THREE.MeshStandardMaterial).color.setHSL(hue, 0.8, 0.5);
    (sphereRef.current.material as THREE.MeshStandardMaterial).emissive.setHSL(hue, 0.8, 0.4);
    
    // Animate particles
    const particlePositions = particleSystemRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const expansion = 1 + audioData.bass * 0.5;
      particlePositions[i * 3] *= 1 + (expansion - 1) * 0.1;
      particlePositions[i * 3 + 1] *= 1 + (expansion - 1) * 0.1;
      particlePositions[i * 3 + 2] *= 1 + (expansion - 1) * 0.1;
      
      const angle = state.clock.elapsedTime * 0.15;
      const x = particlePositions[i * 3];
      const z = particlePositions[i * 3 + 2];
      particlePositions[i * 3] = x * Math.cos(angle) - z * Math.sin(angle);
      particlePositions[i * 3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);
    }
    particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Platform glow pulse
    const platformScale = 1 + audioData.bass * 0.3;
    platformRef.current.scale.set(platformScale, 1, platformScale);
    (platformRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + audioData.amplitude * 0.5;
  });
  
  return (
    <group ref={groupRef} position={[0, -1, -5]}>
      {/* Platform/Base */}
      <mesh ref={platformRef} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry attach="geometry" args={[2.5, 2.5, 0.1, 64]} />
        <meshStandardMaterial
          attach="material"
          color="#1e1b4b"
          emissive="#4c1d95"
          emissiveIntensity={0.4}
          roughness={0.4}
          metalness={0.9}
        />
      </mesh>
      
      {/* Support columns */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh key={i} position={[
          Math.cos(angle) * 2,
          1.5,
          Math.sin(angle) * 2
        ]} rotation={[0, 0, angle]}>
          <cylinderGeometry attach="geometry" args={[0.15, 0.15, 3, 16]} />
          <meshStandardMaterial
            attach="material"
            color="#6b7280"
            emissive="#8b5cf6"
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
      
      {/* Main sphere */}
      <mesh ref={sphereRef} position={[0, 1.5, 0]}>
        <sphereGeometry attach="geometry" args={[1.2, 64, 64]} />
        <meshStandardMaterial
          attach="material"
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.9}
          transparent
          opacity={0.95}
        />
      </mesh>
      
      {/* Particle system */}
      <points ref={particleSystemRef}>
        <bufferGeometry attach="geometry" {...particlesGeometry} />
        <pointsMaterial
          attach="material"
          size={0.08}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      
      {/* Ring around sphere */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry attach="geometry" args={[2, 0.05, 16, 100]} />
        <meshStandardMaterial
          attach="material"
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

function ARScene({ audioData, isPlaying }: { audioData: AudioData; isPlaying: boolean }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, 3, -5]} intensity={0.8} color="#06b6d4" />
      <pointLight position={[5, 3, -5]} intensity={0.8} color="#8b5cf6" />
      
      {isPlaying ? (
        <FixedStage audioData={audioData} />
      ) : (
        <group position={[0, -1, -5]}>
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry attach="geometry" args={[1.2, 32, 32]} />
            <meshStandardMaterial 
              attach="material" 
              color="#6b7280" 
              emissive="#6b7280" 
              emissiveIntensity={0.2}
              transparent
              opacity={0.5}
            />
          </mesh>
        </group>
      )}
    </>
  );
}

export function DemoARView() {
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [orientation, setOrientation] = useState<DeviceOrientation | null>(null);
  const [orientationSupported, setOrientationSupported] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioData = useAudioAnalyzer();
  
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    setOrientation({
      alpha: event.alpha || 0,
      beta: event.beta || 0,
      gamma: event.gamma || 0,
    });
  }, []);
  
  const requestOrientation = useCallback(async () => {
    // Request device orientation permission (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
          setOrientationSupported(true);
        } else {
          setOrientationSupported(false);
        }
      } catch (e) {
        console.error("Orientation permission error:", e);
        setOrientationSupported(false);
      }
    } else {
      // Non-iOS devices
      window.addEventListener('deviceorientation', handleOrientation);
      setOrientationSupported(true);
    }
  }, [handleOrientation]);
  
  const startAR = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    
    try {
      // Request orientation first
      await requestOrientation();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      });
      
      setStream(mediaStream);
      setCameraGranted(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.style.display = "block";
        await videoRef.current.play().catch(err => {
          console.error("Video play error:", err);
          setError("Could not start camera feed. Please try again.");
          setCameraGranted(false);
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        });
      }
      
      setTimeout(() => {
        startBeatMusic();
        setIsStarting(false);
      }, 800);
      
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please allow camera permission.");
      setCameraGranted(false);
      setIsStarting(false);
    }
  }, [requestOrientation]);
  
  const startBeatMusic = useCallback(() => {
    if (isPlaying) return;
    
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    
    const now = audioContext.currentTime;
    const bpm = 100;
    const beatInterval = 60 / bpm;
    
    const createKick = (time: number) => {
      const osc = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      osc.connect(gain);
      gain.connect(analyser!);
      analyser!.connect(audioContext!.destination);
      
      osc.start(time);
      osc.stop(time + 0.5);
    };
    
    const createHat = (time: number) => {
      const bufferSize = audioContext!.sampleRate * 0.1;
      const buffer = audioContext!.createBuffer(1, bufferSize, audioContext!.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioContext!.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioContext!.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 8000;
      
      const gain = audioContext!.createGain();
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(analyser!);
      analyser!.connect(audioContext!.destination);
      
      noise.start(time);
    };
    
    const createSnare = (time: number) => {
      const noiseBuffer = audioContext!.createBuffer(1, audioContext!.sampleRate * 0.2, audioContext!.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioContext!.createBufferSource();
      noise.buffer = noiseBuffer;
      
      const filter = audioContext!.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2000;
      filter.Q.value = 1;
      
      const gain = audioContext!.createGain();
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(analyser!);
      analyser!.connect(audioContext!.destination);
      
      noise.start(time);
    };
    
    const createBass = (time: number, freq: number) => {
      const osc = audioContext!.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      
      const gain = audioContext!.createGain();
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.linearRampToValueAtTime(0.3, time + beatInterval * 0.8);
      
      osc.connect(gain);
      gain.connect(analyser!);
      analyser!.connect(audioContext!.destination);
      
      osc.start(time);
      osc.stop(time + beatInterval);
    };
    
    const duration = 30;
    const numBeats = Math.floor(duration / beatInterval);
    
    for (let i = 0; i < numBeats; i++) {
      const beatTime = now + i * beatInterval;
      
      createKick(beatTime);
      
      if (i % 4 === 2 || i % 4 === 3) {
        createSnare(beatTime);
      }
      
      createHat(beatTime + beatInterval / 2);
      
      const bassFreqs = [110, 110, 130.81, 98];
      createBass(beatTime, bassFreqs[i % 4]);
    }
    
    setTimeout(() => {
      isPlaying = false;
    }, duration * 1000);
    
    isPlaying = true;
  }, []);
  
  const stopExperience = useCallback(() => {
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    window.removeEventListener('deviceorientation', handleOrientation);
    isPlaying = false;
    setCameraGranted(false);
    setError(null);
    setIsStarting(false);
  }, [stream, handleOrientation]);
  
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [stream, handleOrientation]);
  
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ 
          display: cameraGranted ? "block" : "none",
          zIndex: 0
        }}
      />
      
      {/* 3D AR Overlay - Fixed Stage */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <Canvas
          camera={{ 
            position: [0, 0, 0], 
            fov: 75,
            rotation: orientation ? {
              x: (orientation.beta || 0) * Math.PI / 180,
              y: -(orientation.alpha || 0) * Math.PI / 180,
              z: -(orientation.gamma || 0) * Math.PI / 180
            } : undefined
          }}
          style={{ background: "transparent" }}
          gl={{ alpha: true, antialias: true }}
        >
          <ARScene audioData={audioData} isPlaying={isPlaying} />
        </Canvas>
      </div>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span className="text-white font-semibold">AR Stage</span>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
              <div className={`w-2 h-2 rounded-full ${audioData.beat ? 'bg-green-400' : 'bg-violet-400'} animate-pulse`} />
              <span className="text-xs text-violet-300">Live</span>
            </div>
          )}
          {orientationSupported && (
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5">
              <Compass className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-400">Fixed</span>
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
        
        {/* Start Screen */}
        {!cameraGranted && !isStarting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="text-center p-8 bg-black/80 backdrop-blur-md rounded-2xl max-w-sm mx-4 border border-violet-600/40">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-600/30 border-2 border-violet-500 flex items-center justify-center">
                <Camera className="w-10 h-10 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Fixed AR Stage</h2>
              <p className="text-zinc-400 mb-6 text-sm">
                A life-size stage anchored in your space. Walk around it. View from any angle.
              </p>
              {error ? (
                <div className="space-y-3">
                  <p className="text-red-400 text-sm">{error}</p>
                  <Button
                    onClick={startAR}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white px-6 py-5 text-base"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={startAR}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white px-6 py-5 text-base shadow-lg shadow-violet-600/40"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start AR Experience
                </Button>
              )}
              <div className="mt-4 text-zinc-500 text-xs space-y-1">
                <p>📍 Stage stays fixed in space</p>
                <p>🚶 Walk around to view from all angles</p>
                <p>🎵 30-second beat experience</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Starting State */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/80 backdrop-blur-md rounded-xl px-8 py-6 border border-violet-600/40">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-white font-medium">Anchoring stage...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Active State */}
        {cameraGranted && isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center pointer-events-auto">
            <div className="bg-black/60 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${audioData.beat ? 'bg-green-400 scale-125' : 'bg-violet-400'} transition-all`} />
                <span className="text-white text-sm font-medium">
                  {audioData.beat ? '♪ Beat!' : 'Playing...'}
                </span>
              </div>
              <div className="w-px h-4 bg-zinc-600" />
              <span className="text-zinc-400 text-xs">Walk around the stage</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
