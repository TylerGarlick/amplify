"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Radio, Music, Navigation, Loader2, Map, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageMap, StageMapStage } from "@/components/stages/StageMap";
import { RadiusFilterProvider, useRadiusFilter, RADIUS_OPTIONS, formatDistance } from "@/contexts/RadiusFilterContext";
import { haversine } from "@/lib/geo";

interface Stage extends StageMapStage {}

function ExploreContent() {
  const searchParams = useSearchParams();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const { radius, setRadius, setUserLocation } = useRadiusFilter();

  useEffect(() => {
    fetchStages();
  }, [searchParams, showNearby]);

  async function fetchStages() {
    setLoading(true);
    const params = new URLSearchParams();
    
    if (showNearby && userLat && userLng) {
      params.set("latitude", userLat.toString());
      params.set("longitude", userLng.toString());
      params.set("radius", "10000");
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
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
        setShowNearby(true);
        setLocationLoading(false);
      },
      (err) => {
        alert(`Could not get location: ${err.message}`);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        // Privacy: reuse cached location to avoid repeated GPS pings
        maximumAge: 5 * 60 * 1000, // 5 minutes
      }
    );
  }

  function clearLocation() {
    setUserLat(null);
    setUserLng(null);
    setShowNearby(false);
    setSelectedStageId(null);
  }

  function handleStageSelect(stage: StageMapStage) {
    setSelectedStageId(stage.id);
  }

  // Filter and sort stages by distance
  const filteredStages = useMemo(() => {
    if (!userLat || !userLng) {
      return stages.map((stage) => ({ ...stage, distance: 0 }));
    }

    const radiusMeters = RADIUS_OPTIONS.find((r) => r.value === radius)?.meters ?? 25 * 1609.34;

    return stages
      .map((stage) => ({
        ...stage,
        distance: haversine(userLat, userLng, stage.latitude, stage.longitude),
      }))
      .filter((stage) => stage.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);
  }, [stages, userLat, userLng, radius]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-violet-400" />
              <h1 className="text-lg font-bold text-white tracking-tight">Discover Stages</h1>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {showNearby && userLat ? `${filteredStages.length} stages within ${radius} mi` : `${stages.length} active stages worldwide`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showNearby && userLat && (
              <div className="flex items-center gap-1 bg-zinc-800/90 rounded-md p-0.5 backdrop-blur-sm">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRadius(option.value)}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      radius === option.value
                        ? "bg-violet-600 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
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

      {/* Map */}
      <div className="relative flex-1 min-h-[300px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-sm text-zinc-500">Loading stages...</p>
            </div>
          </div>
        ) : filteredStages.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
            <div className="flex flex-col items-center gap-3 text-zinc-600">
              <Radio className="w-10 h-10 opacity-30" />
              <p className="text-sm">No stages found.</p>
              <p className="text-xs mt-1">
                {showNearby ? `No stages within ${radius} miles. Try a different radius.` : "Musicians will create stages at venues."}
              </p>
            </div>
          </div>
        ) : null}

        <StageMap
          stages={filteredStages}
          userLat={showNearby ? userLat : null}
          userLng={showNearby ? userLng : null}
          onStageSelect={handleStageSelect}
          selectedStageId={selectedStageId}
          height="100%"
        />
      </div>

      {/* Stage list */}
      <div className="bg-black border-t border-zinc-800/50 max-h-[50vh] overflow-y-auto">
        <div className="p-4 space-y-3">
          {filteredStages.map((stage) => (
            <div
              key={stage.id}
              className={`rounded-xl bg-zinc-900 border p-4 hover:border-violet-800/50 transition-all cursor-pointer ${
                selectedStageId === stage.id ? "border-violet-600 bg-violet-950/20" : "border-zinc-800"
              }`}
              onClick={() => setSelectedStageId(stage.id === selectedStageId ? null : stage.id)}
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
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-600" />
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}
                  </span>
                  {stage.distance !== undefined && stage.distance > 0 && (
                    <span className="text-[10px] text-violet-400 ml-2">
                      {formatDistance(stage.distance)}
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${selectedStageId === stage.id ? "rotate-90" : ""}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <RadiusFilterProvider>
      <ExploreContent />
    </RadiusFilterProvider>
  );
}
