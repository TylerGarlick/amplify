"use client";

import { useEffect, useRef, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyStages } from "@/hooks/useNearbyStages";
import { useARStore } from "@/stores/arStore";
import { Radio, MapPin, Music, Zap, Camera, Navigation, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haversine } from "@/lib/geo";
import type { StageWithVisualizations } from "@/types/ar";

function PermissionPrompt({
  icon: Icon,
  title,
  description,
  onRequest,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onRequest: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-violet-600/10 border border-violet-600/30 flex items-center justify-center">
          <Icon className="w-10 h-10 text-violet-400" />
        </div>
        <div className="absolute -inset-2 rounded-full border border-violet-600/10 animate-ping" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-zinc-400 max-w-xs">{description}</p>
      </div>
      <Button
        onClick={onRequest}
        className="bg-violet-600 hover:bg-violet-500 text-white px-8 shadow-lg shadow-violet-600/30"
      >
        Grant Access
      </Button>
    </div>
  );
}

function StageCard({
  stage,
  userLat,
  userLng,
  onSelect,
  isActive,
}: {
  stage: StageWithVisualizations;
  userLat: number;
  userLng: number;
  onSelect: () => void;
  isActive: boolean;
}) {
  const dist = haversine(userLat, userLng, stage.latitude, stage.longitude);
  const distStr = dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
  const inRange = dist <= stage.radius;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
        isActive
          ? "border-violet-500 bg-violet-950/30"
          : inRange
          ? "border-green-800/50 bg-green-950/10 hover:border-green-600/50"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm truncate">{stage.name}</h3>
            {inRange && (
              <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-wider">
                In Range
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{stage.musician.displayName}</p>
          {stage.activeTrack && (
            <div className="flex items-center gap-1.5 mt-2">
              <Music className="w-3 h-3 text-violet-400 flex-shrink-0" />
              <span className="text-xs text-zinc-400 truncate">{stage.activeTrack.title}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <MapPin className="w-3 h-3" />
            {distStr}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Eye className="w-3 h-3" />
            {stage.visualizations.length} vis.
          </div>
        </div>
      </div>

      {isActive && stage.activeTrack && (
        <div className="mt-3 pt-3 border-t border-violet-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs text-violet-300">Now playing: {stage.activeTrack.title}</span>
          </div>
          <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-500 px-3">
            <Zap className="w-3 h-3 mr-1" />
            Experience
          </Button>
        </div>
      )}
    </button>
  );
}

export function ARViewClient() {
  const { lat, lng, error: gpsError } = useGeolocation();
  const { stages } = useNearbyStages(1000);
  const { activeStageId, enterStage, exitStage } = useARStore();
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check permissions on mount
  useEffect(() => {
    if (lat !== null) setGpsGranted(true);
    if (gpsError) setGpsGranted(false);
  }, [lat, gpsError]);

  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraGranted(true);
    } catch {
      setCameraGranted(false);
    }
  }

  function requestGPS() {
    navigator.geolocation.getCurrentPosition(
      () => setGpsGranted(true),
      () => setGpsGranted(false),
      { enableHighAccuracy: true }
    );
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Prompt for camera first
  if (cameraGranted === null) {
    return (
      <div className="h-screen bg-black flex flex-col">
        <div className="flex items-center gap-2 px-4 pt-12 pb-4">
          <Radio className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-bold text-white tracking-tight">AR View</span>
        </div>
        <PermissionPrompt
          icon={Camera}
          title="Camera Access Required"
          description="Amplify uses your camera to overlay AR visualizations on the real world. Your camera feed stays on your device."
          onRequest={requestCamera}
        />
      </div>
    );
  }

  if (gpsGranted === null || (gpsGranted === false && lat === null)) {
    return (
      <div className="h-screen bg-black flex flex-col">
        <div className="flex items-center gap-2 px-4 pt-12 pb-4">
          <Radio className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-bold text-white tracking-tight">AR View</span>
        </div>
        <PermissionPrompt
          icon={Navigation}
          title="Location Access Required"
          description="Amplify needs your GPS location to show AR stages near you. Your location is never stored."
          onRequest={requestGPS}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Camera / AR viewport */}
      <div className="relative flex-shrink-0 h-[55vh] bg-zinc-950 overflow-hidden">
        {/* Camera feed (works on real devices) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* AR overlay — pulsing gradient to simulate AR in dev */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/5 to-black/60" />

        {/* Animated scan lines */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(167,139,250,0.3) 2px, rgba(167,139,250,0.3) 3px)",
          }}
        />

        {/* Stage AR markers */}
        {lat && lng && stages.slice(0, 4).map((stage, i) => (
          <div
            key={stage.id}
            className="absolute cursor-pointer group"
            style={{
              left: `${20 + (i * 20) % 65}%`,
              top: `${20 + (i * 15) % 50}%`,
            }}
            onClick={() => enterStage(stage.id)}
          >
            <div className="relative flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-violet-500 shadow-lg shadow-violet-500/60 animate-pulse" />
              <div className="mt-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-violet-800/50 text-[10px] text-violet-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {stage.name}
              </div>
            </div>
          </div>
        ))}

        {/* HUD — top */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white/80 font-mono tracking-wider">AR LIVE</span>
          </div>
          {lat && lng && (
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
              <Navigation className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-mono text-white/70">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {/* HUD — bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-center justify-between">
          <div className="text-xs text-white/50 font-mono">{stages.length} stage{stages.length !== 1 ? "s" : ""} nearby</div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-violet-500 animate-pulse"
                style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-10 left-3 w-5 h-5 border-l-2 border-t-2 border-violet-500/50" />
        <div className="absolute top-10 right-3 w-5 h-5 border-r-2 border-t-2 border-violet-500/50" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-violet-500/50" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-violet-500/50" />
      </div>

      {/* Stages near you */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800/50">
          <h2 className="text-xs font-medium text-zinc-400 tracking-widest uppercase">
            Stages Near You
          </h2>
        </div>

        {!lat || !lng ? (
          <div className="p-8 text-center text-zinc-600">
            <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Waiting for GPS signal…</p>
          </div>
        ) : stages.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No stages nearby.</p>
            <p className="text-xs mt-1">Check the Explore tab to find stages.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {stages.map((stage) => (
              <StageCard
                key={stage.id}
                stage={stage as StageWithVisualizations}
                userLat={lat}
                userLng={lng}
                isActive={activeStageId === stage.id}
                onSelect={() =>
                  activeStageId === stage.id ? exitStage() : enterStage(stage.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
