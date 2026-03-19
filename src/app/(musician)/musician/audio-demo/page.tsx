/**
 * Audio demo page - showcases audio playback with reactive Three.js visualizations
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { useAudioAnalyzer } from "@/lib/audio/useAudioAnalyzer";
import { AudioReactiveParticles } from "@/components/visualizations/AudioReactiveParticles";
import { FrequencyBars } from "@/components/visualizations/FrequencyBars";
import { AudioReactiveLightShow } from "@/components/visualizations/AudioReactiveLightShow";
import type { BeatData, ParticleSystemConfig, FrequencyBarsConfig, LightShowConfig } from "@/types/ar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, Pause, Upload, Volume2, Activity, Zap, 
  Disc3, Radio, Waves, Sparkles 
} from "lucide-react";

type VisualizationType = "particles" | "bars" | "lights" | "all";

// Sample track URLs (royalty-free EDM samples)
const SAMPLE_TRACKS = [
  {
    id: "sample-1",
    title: "EDM Beat 128 BPM",
    artist: "Amplify Demo",
    bpm: 128,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "sample-2",
    title: "Electronic Pulse",
    artist: "Amplify Demo",
    bpm: 140,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "sample-3",
    title: "Synth Wave",
    artist: "Amplify Demo",
    bpm: 120,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

// Default configs
const PARTICLE_CONFIG: ParticleSystemConfig = {
  count: 2000,
  color: "#7c3aed",
  size: 0.15,
  spread: 8,
  lifetime: 3,
  beatMultiplier: 2.5,
};

const BARS_CONFIG: FrequencyBarsConfig = {
  count: 32,
  color: "#ec4899",
  maxHeight: 8,
  arrangement: "arc",
};

const LIGHT_CONFIG: LightShowConfig = {
  lights: [
    { type: "point", color: "#7c3aed", intensity: 2, orbitRadius: 5, orbitSpeed: 1.5, reactTo: "bass" },
    { type: "point", color: "#06b6d4", intensity: 2, orbitRadius: 5, orbitSpeed: 1.2, reactTo: "mid" },
    { type: "point", color: "#ec4899", intensity: 2, orbitRadius: 5, orbitSpeed: 0.8, reactTo: "treble" },
    { type: "point", color: "#f59e0b", intensity: 2, orbitRadius: 5, orbitSpeed: 2, reactTo: "beat" },
  ],
};

export default function AudioDemoPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<typeof SAMPLE_TRACKS[0] | null>(null);
  const [customTrackUrl, setCustomTrackUrl] = useState<string | null>(null);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>("particles");
  const [volume, setVolume] = useState([0.7]);

  const {
    beatData,
    isPlaying,
    isReady,
    bpm,
    energy,
    toggle,
    setVolume: setAudioVolume,
  } = useAudioAnalyzer({
    audioRef,
    config: {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      beatThreshold: 0.5,
      beatCooldown: 100,
    },
  });

  // Update volume
  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    setAudioVolume(value[0]);
  };

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomTrackUrl(url);
      setSelectedTrack(null);
    }
  }, []);

  // Handle track selection
  const handleTrackSelect = (track: typeof SAMPLE_TRACKS[0]) => {
    setSelectedTrack(track);
    setCustomTrackUrl(null);
  };

  const trackUrl = customTrackUrl || selectedTrack?.url;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Audio Reactivity Demo</h1>
            <p className="text-xs text-zinc-500">Experience visualizations synced to music</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Panel: Audio Controls */}
        <div className="w-80 border-r border-zinc-800 p-6 space-y-6">
          {/* Track Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Select Track
            </h3>
            
            {/* Sample Tracks */}
            <div className="space-y-2">
              {SAMPLE_TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleTrackSelect(track)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTrack?.id === track.id
                      ? "border-violet-500 bg-violet-950/30"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Disc3 className={`w-8 h-8 ${selectedTrack?.id === track.id ? "text-violet-400" : "text-zinc-600"}`} />
                    <div>
                      <p className="text-sm font-medium">{track.title}</p>
                      <p className="text-xs text-zinc-500">{track.artist} • {track.bpm} BPM</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* File Upload */}
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-violet-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Custom Track
              </Button>
              {customTrackUrl && (
                <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                  <Waves className="w-3 h-3" />
                  Custom track loaded
                </p>
              )}
            </div>
          </div>

          {/* Audio Player */}
          {trackUrl && (
            <div className="space-y-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <audio
                ref={audioRef}
                src={trackUrl}
                crossOrigin="anonymous"
                className="hidden"
              />
              
              <div className="flex items-center justify-center">
                <Button
                  onClick={toggle}
                  disabled={!isReady}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </Button>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-zinc-500" />
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.01}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Visualization Selector */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Visualization
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "particles" as const, label: "Particles", icon: Sparkles },
                { id: "bars" as const, label: "Frequency Bars", icon: Activity },
                { id: "lights" as const, label: "Light Show", icon: Zap },
                { id: "all" as const, label: "All", icon: Radio },
              ].map((viz) => (
                <button
                  key={viz.id}
                  onClick={() => setVisualizationType(viz.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    visualizationType === viz.id
                      ? "border-violet-500 bg-violet-950/30"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <viz.icon className={`w-4 h-4 ${visualizationType === viz.id ? "text-violet-400" : "text-zinc-500"}`} />
                  <span className="text-sm">{viz.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Audio Analysis
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="BPM" value={bpm.toString()} />
              <StatCard label="Energy" value={(energy * 100).toFixed(0) + "%"} />
              <StatCard label="Bass" value={(beatData.bass * 100).toFixed(0) + "%"} color="red" />
              <StatCard label="Mid" value={(beatData.mid * 100).toFixed(0) + "%"} color="yellow" />
              <StatCard label="Treble" value={(beatData.treble * 100).toFixed(0) + "%"} color="blue" />
              <StatCard 
                label="Beat" 
                value={beatData.beat ? "HIT!" : "—"} 
                highlight={beatData.beat} 
                color="green" 
              />
            </div>
          </div>
        </div>

        {/* Right Panel: Visualization */}
        <div className="flex-1 p-6">
          {!trackUrl ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Radio className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Select or upload a track to start</p>
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-180px)] grid gap-6" style={{
              gridTemplateColumns: visualizationType === "all" ? "1fr 1fr" : "1fr",
              gridTemplateRows: visualizationType === "all" ? "1fr 1fr" : "1fr",
            }}>
              {(visualizationType === "particles" || visualizationType === "all") && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 relative">
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-violet-950/50 border border-violet-800/50 text-xs text-violet-300">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Particle System
                  </div>
                  <AudioReactiveParticles beatData={beatData} config={PARTICLE_CONFIG} size={400} />
                </div>
              )}
              
              {(visualizationType === "bars" || visualizationType === "all") && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 relative">
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-pink-950/50 border border-pink-800/50 text-xs text-pink-300">
                    <Activity className="w-3 h-3 inline mr-1" />
                    Frequency Bars
                  </div>
                  <FrequencyBars beatData={beatData} config={BARS_CONFIG} size={400} />
                </div>
              )}
              
              {(visualizationType === "lights" || visualizationType === "all") && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 relative">
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-cyan-950/50 border border-cyan-800/50 text-xs text-cyan-300">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Light Show
                  </div>
                  <AudioReactiveLightShow beatData={beatData} config={LIGHT_CONFIG} size={400} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  color, 
  highlight 
}: { 
  label: string; 
  value: string; 
  color?: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    red: "text-red-400",
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    green: "text-green-400",
  };

  return (
    <div className={`p-3 rounded-lg border ${highlight ? "border-green-500 bg-green-950/30" : "border-zinc-800 bg-zinc-900"}`}>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${color ? colorMap[color] : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}