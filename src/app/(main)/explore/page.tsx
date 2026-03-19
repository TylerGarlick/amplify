"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Radio, Music, Navigation, Loader2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stage {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  isPublic: boolean;
  musician: { displayName: string };
  visualizations: { id: string }[];
  stageTrackLinks: { track: { title: string; artist: string } }[];
  distance?: number;
}

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showNearby, setShowNearby] = useState(false);

  useEffect(() => {
    fetchStages();
  }, [searchParams]);

  async function fetchStages() {
    setLoading(true);
    const params = new URLSearchParams();
    
    if (userLat && userLng) {
      params.set("latitude", userLat.toString());
      params.set("longitude", userLng.toString());
      params.set("radius", "10000"); // 10km default
    }

    try {
      const res = await fetch(`/api/stages?${params.toString()}`);
      const data = await res.json();
      setStages(data.data || []);
    } catch (err) {
      console.error("Failed to fetch stages:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setShowNearby(true);
        setLocationLoading(false);
      },
      (err) => {
        alert(`Could not get location: ${err.message}`);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }

  function clearLocation() {
    setUserLat(null);
    setUserLng(null);
    setShowNearby(false);
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-violet-400" />
              <h1 className="text-lg font-bold text-white tracking-tight">Discover Stages</h1>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {showNearby && userLat ? "Nearby stages" : `${stages.length} active stages worldwide`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className={`h-8 text-xs border-zinc-700 ${showNearby ? "bg-violet-600/20 text-violet-400 border-violet-800" : "bg-zinc-800 text-zinc-300"}`}
              onClick={showNearby ? clearLocation : handleUseMyLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : showNearby ? (
                <MapPin className="w-3 h-3 mr-1" />
              ) : (
                <Navigation className="w-3 h-3 mr-1" />
              )}
              {showNearby ? "Clear" : "Near Me"}
            </Button>
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="relative h-52 bg-zinc-950 border-b border-zinc-800/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-950/30 via-transparent to-transparent" />
          {/* Stage dots */}
          {stages.slice(0, 8).map((stage, i) => (
            <div
              key={stage.id}
              className="absolute w-3 h-3 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50 animate-pulse"
              style={{
                left: `${20 + (i * 37) % 60}%`,
                top: `${25 + (i * 23) % 50}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
          <span className="text-xs text-zinc-600 z-10 bg-black/50 px-3 py-1 rounded-full border border-zinc-800">
            Interactive map — open in AR view for GPS
          </span>
        </div>
      </div>

      {/* Stage list */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-violet-500 animate-spin" />
            <p className="text-sm text-zinc-500">Loading stages...</p>
          </div>
        ) : stages.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No stages found.</p>
            <p className="text-xs mt-1">
              {showNearby ? "No stages within 10km. Try a different location." : "Musicians will create stages at venues."}
            </p>
          </div>
        ) : (
          stages.map((stage) => (
            <div
              key={stage.id}
              className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-violet-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{stage.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{stage.musician.displayName}</p>
                  {stage.stageTrackLinks[0]?.track && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Music className="w-3 h-3 text-violet-400 flex-shrink-0" />
                      <span className="text-xs text-zinc-400 truncate">
                        {stage.stageTrackLinks[0].track.title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800/50">
                    LIVE
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {stage.visualizations.length} vis.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <MapPin className="w-3 h-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-600 font-mono">
                  {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}
                </span>
                {stage.distance !== undefined && (
                  <span className="text-[10px] text-violet-400 ml-2">
                    {stage.distance < 1000
                      ? `${Math.round(stage.distance)}m`
                      : `${(stage.distance / 1000).toFixed(1)}km`}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}