"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import type * as THREE from "three";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Maximize2, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export interface StageElement {
  id: string;
  type: "platform" | "speaker" | "light" | "screen" | "crowd";
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  config: Record<string, unknown>;
  isVisible: boolean;
}

interface VisualizerElementProps {
  element: StageElement;
  audioData?: { bass: number; mid: number; treble: number };
}

function VisualizerElement({ element, audioData }: VisualizerElementProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    // React to audio if available
    if (audioData && element.config.reactToFrequency) {
      const freq = element.config.reactToFrequency as string;
      const audioValue = audioData[freq as keyof typeof audioData] || 0;
      const intensity = element.config.reactIntensity 
        ? (element.config.reactIntensity as number) * audioValue 
        : audioValue;
      
      if (element.type === "light" && lightRef.current) {
        lightRef.current.intensity = (element.config.intensity as number || 2) * (0.5 + intensity);
      }
      
      // Pulse effect on elements
      const baseScale = element.scale[0];
      const pulseScale = baseScale * (1 + intensity * 0.3);
      meshRef.current.scale.setScalar(pulseScale);
    }
  });

  const getGeometry = () => {
    switch (element.type) {
      case "platform":
        return <boxGeometry args={[element.scale[0], 0.2, element.scale[2]]} />;
      case "speaker":
        return <boxGeometry args={[0.6, 1.2, 0.4]} />;
      case "light":
        return <coneGeometry args={[0.3, 0.6, 8]} />;
      case "screen":
        return <boxGeometry args={[element.scale[0], element.scale[1], 0.1]} />;
      case "crowd":
        return <cylinderGeometry args={[element.scale[0], element.scale[0], 0.1, 16]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  if (!element.isVisible) return null;

  return (
    <group position={element.position} rotation={element.rotation}>
      <mesh ref={meshRef} scale={element.scale}>
        {getGeometry()}
        {element.type === "light" ? (
          <>
            <meshStandardMaterial
              color={element.color}
              emissive={element.color}
              emissiveIntensity={2}
            />
            <pointLight
              ref={lightRef}
              color={element.color}
              intensity={element.config.intensity as number || 2}
              distance={10}
            />
          </>
        ) : (
          <meshStandardMaterial
            color={element.color}
            metalness={0.3}
            roughness={0.7}
          />
        )}
      </mesh>
    </group>
  );
}

function PreviewScene({ elements, audioData }: { elements: StageElement[]; audioData?: { bass: number; mid: number; treble: number } }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[30, 30, "#27272a", "#18181b"]} position={[0, 0.01, 0]} />

      {elements.map(element => (
        <VisualizerElement key={element.id} element={element} audioData={audioData} />
      ))}

      <OrbitControls 
        makeDefault 
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={3}
        maxDistance={25}
      />
    </>
  );
}

interface StagePreviewProps {
  elements: StageElement[];
  trackUrl?: string;
  stageName: string;
}

export function StagePreview({ elements, trackUrl, stageName }: StagePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioData, setAudioData] = useState({ bass: 0, mid: 0, treble: 0 });
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Initialize audio analyzer
  useEffect(() => {
    if (!trackUrl || !audioRef.current) return;

    const audio = audioRef.current;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    return () => {
      audioContext.close();
    };
  }, [trackUrl]);

  // Audio visualization loop
  useEffect(() => {
    if (!analyserRef.current || !isPlaying) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateVisualization = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate frequency bands
      const bass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / (10 * 255);
      const mid = dataArray.slice(10, 50).reduce((a, b) => a + b, 0) / (40 * 255);
      const treble = dataArray.slice(50, 100).reduce((a, b) => a + b, 0) / (50 * 255);
      
      setAudioData({ bass, mid, treble });
      animationRef.current = requestAnimationFrame(updateVisualization);
    };

    updateVisualization();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
      setIsMuted(value[0] === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume[0] / 100;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`relative bg-zinc-950 ${isFullscreen ? "fixed inset-0 z-50" : "rounded-xl overflow-hidden"}`}>
      {/* 3D Canvas */}
      <div className="w-full h-full" style={{ minHeight: isFullscreen ? "100vh" : "400px" }}>
        <Canvas camera={{ position: [8, 6, 8], fov: 50 }}>
          <Suspense fallback={null}>
            <PreviewScene elements={elements} audioData={audioData} />
          </Suspense>
        </Canvas>
      </div>

      {/* Stage name overlay */}
      <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur px-4 py-2 rounded-lg">
        <h3 className="text-white font-medium">{stageName}</h3>
        <p className="text-xs text-zinc-400">AR Preview</p>
      </div>

      {/* Audio controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-transparent p-4 pt-12">
        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            min={0}
            max={duration || 100}
            step={0.1}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
              onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handlePlayPause}
              size="icon"
              className="bg-white text-black hover:bg-zinc-200 rounded-full w-10 h-10"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
              onClick={() => audioRef.current && (audioRef.current.currentTime += 10)}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume[0]]}
              onValueChange={handleVolumeChange}
              min={0}
              max={100}
              className="flex-1"
            />
          </div>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <X className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Audio element */}
      {trackUrl && (
        <audio
          ref={audioRef}
          src={trackUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          crossOrigin="anonymous"
        />
      )}

      {/* Visual feedback for audio */}
      {isPlaying && (
        <div className="absolute top-4 right-4 flex gap-1">
          {[audioData.bass, audioData.mid, audioData.treble].map((val, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-violet-500 to-pink-500 rounded-full transition-all duration-75"
              style={{ height: `${20 + val * 40}px` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}