"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, X, Play } from "lucide-react";

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
    const beatThreshold = 200;
    
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
      
      // Detect beats (bass spikes)
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

function BeatPulsingSphere({ audioData }: { audioData: AudioData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const particleSystemRef = useRef<THREE.Points>(null);
  
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
    
    // Violet to cyan gradient
    colors[i * 3] = 0.5 + Math.random() * 0.5;
    colors[i * 3 + 1] = 0.3 + Math.random() * 0.4;
    colors[i * 3 + 2] = 1.0;
  }
  
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  
  useFrame((state, delta) => {
    if (!meshRef.current || !particleSystemRef.current) return;
    
    // Pulse sphere with bass
    const targetScale = 1 + audioData.bass * 1.8;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    
    // Rotate on beat
    if (audioData.beat) {
      meshRef.current.rotation.y += 0.3;
    }
    
    // Color shift with amplitude
    const hue = (state.clock.elapsedTime * 0.1 + audioData.amplitude * 0.5) % 1;
    (meshRef.current.material as THREE.MeshStandardMaterial).color.setHSL(hue, 0.8, 0.5);
    (meshRef.current.material as THREE.MeshStandardMaterial).emissive.setHSL(hue, 0.8, 0.3);
    
    // Animate particles
    const particlePositions = particleSystemRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      // Expand on beat
      const expansion = 1 + audioData.bass * 0.5;
      particlePositions[i * 3] *= 1 + (expansion - 1) * 0.1;
      particlePositions[i * 3 + 1] *= 1 + (expansion - 1) * 0.1;
      particlePositions[i * 3 + 2] *= 1 + (expansion - 1) * 0.1;
      
      // Gentle rotation
      const angle = state.clock.elapsedTime * 0.2;
      const x = particlePositions[i * 3];
      const z = particlePositions[i * 3 + 2];
      particlePositions[i * 3] = x * Math.cos(angle) - z * Math.sin(angle);
      particlePositions[i * 3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);
    }
    particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <>
      <mesh ref={meshRef} position={[0, 0, -4]}>
        <sphereGeometry attach="geometry" args={[1.2, 64, 64]} />
        <meshStandardMaterial
          attach="material"
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.95}
        />
      </mesh>
      
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
    </>
  );
}

function ARScene({ audioData, isPlaying }: { audioData: AudioData; isPlaying: boolean }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#06b6d4" />
      
      {isPlaying ? (
        <BeatPulsingSphere audioData={audioData} />
      ) : (
        <mesh position={[0, 0, -4]}>
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
      )}
    </>
  );
}

export function DemoARView() {
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioData = useAudioAnalyzer();
  
  const startAR = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    
    try {
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
      
      // Start audio after camera is ready
      setTimeout(() => {
        startBeatMusic();
        setIsStarting(false);
      }, 800);
      
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please allow camera permission in your browser settings.");
      setCameraGranted(false);
      setIsStarting(false);
    }
  }, []);
  
  const startBeatMusic = useCallback(() => {
    if (isPlaying) return;
    
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    
    // Create a simple beat pattern
    const now = audioContext.currentTime;
    const bpm = 100;
    const beatInterval = 60 / bpm;
    
    // Bass drum (kick)
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
    
    // Hi-hat
    const createHat = (time: number) => {
      const bufferSize = audioContext!.sampleRate * 0.1;
      const buffer = audioContext!.createBuffer(1, bufferSize, audioContext!.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioContext!.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioContext!.createHighpassFilter();
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
    
    // Snare
    const createSnare = (time: number) => {
      const noiseBuffer = audioContext!.createBuffer(1, audioContext!.sampleRate * 0.2, audioContext!.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioContext!.createBufferSource();
      noise.buffer = noiseBuffer;
      
      const filter = audioContext!.createBandpassFilter();
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
    
    // Bass line
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
    
    // Schedule beats for 30 seconds
    const duration = 30;
    const numBeats = Math.floor(duration / beatInterval);
    
    for (let i = 0; i < numBeats; i++) {
      const beatTime = now + i * beatInterval;
      
      // Kick on every beat
      createKick(beatTime);
      
      // Snare on 2 and 4
      if (i % 4 === 2 || i % 4 === 3) {
        createSnare(beatTime);
      }
      
      // Hi-hat on off-beats
      createHat(beatTime + beatInterval / 2);
      
      // Bass line (simple progression)
      const bassFreqs = [110, 110, 130.81, 98]; // A2, A2, C3, G2
      createBass(beatTime, bassFreqs[i % 4]);
    }
    
    // Stop after 30 seconds
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
    isPlaying = false;
    setCameraGranted(false);
    setError(null);
    setIsStarting(false);
  }, [stream]);
  
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [stream]);
  
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Camera Feed - MUST be visible */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ 
          display: cameraGranted ? "block" : "none",
          transform: "scaleX(-1)",
          zIndex: 0
        }}
      />
      
      {/* 3D AR Overlay */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <Canvas
          camera={{ position: [0, 0, 0], fov: 75 }}
          style={{ background: "transparent" }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
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
            <span className="text-white font-semibold">AR Music Demo</span>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
              <div className={`w-2 h-2 rounded-full ${audioData.beat ? 'bg-green-400' : 'bg-violet-400'} animate-pulse`} />
              <span className="text-xs text-violet-300">Beat Active</span>
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
              <h2 className="text-xl font-bold text-white mb-2">AR Music Experience</h2>
              <p className="text-zinc-400 mb-6 text-sm">
                A life-size 3D stage that pulses and dances to the beat. In your actual space.
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
              <p className="text-zinc-500 text-xs mt-4">
                Tap once to enable camera + start music
              </p>
            </div>
          </div>
        )}
        
        {/* Starting State */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/80 backdrop-blur-md rounded-xl px-8 py-6 border border-violet-600/40">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-white font-medium">Starting AR...</span>
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
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-400 rounded-full transition-all duration-100"
                    style={{
                      height: `${8 + audioData.amplitude * 16 + Math.random() * 8}px`,
                      opacity: 0.5 + audioData.bass * 0.5
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
