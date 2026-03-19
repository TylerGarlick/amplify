"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MapPin, List, Eye, Radio, Loader2 } from "lucide-react";

// Fix leaflet default marker icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Stage {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  musician?: { displayName: string };
  _count?: { visualizations: number; stageTrackLinks: number };
  distance?: number;
}

interface StageListProps {
  stages: Stage[];
  showMusicianName?: boolean;
  showDistance?: boolean;
}

export function StageList({ stages, showMusicianName = false, showDistance = false }: StageListProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Get user location for map centering
  useEffect(() => {
    if (viewMode === "map" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLocation(null)
      );
    }
  }, [viewMode]);

  // Calculate map center
  const getMapCenter = (): [number, number] => {
    if (userLocation) return userLocation;
    if (stages.length > 0) {
      const avgLat = stages.reduce((sum, s) => sum + s.latitude, 0) / stages.length;
      const avgLng = stages.reduce((sum, s) => sum + s.longitude, 0) / stages.length;
      return [avgLat, avgLng];
    }
    return [37.7749, -122.4194]; // Default SF
  };

  if (stages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center">
        <MapPin className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
        <p className="text-zinc-500 text-sm">No stages found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* View Toggle */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <Button
          size="sm"
          variant={viewMode === "list" ? "default" : "ghost"}
          className={`h-8 text-xs ${viewMode === "list" ? "bg-violet-600" : "text-zinc-400"}`}
          onClick={() => setViewMode("list")}
        >
          <List className="w-3 h-3 mr-1" /> List
        </Button>
        <Button
          size="sm"
          variant={viewMode === "map" ? "default" : "ghost"}
          className={`h-8 text-xs ${viewMode === "map" ? "bg-violet-600" : "text-zinc-400"}`}
          onClick={() => setViewMode("map")}
        >
          <MapPin className="w-3 h-3 mr-1" /> Map
        </Button>
      </div>

      {viewMode === "list" ? (
        <div className="space-y-3">
          {stages.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              showMusicianName={showMusicianName}
              showDistance={showDistance}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-zinc-800 h-[400px]">
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-[1000]">
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading map...</span>
              </div>
            </div>
          )}
          <MapContainer
            center={getMapCenter()}
            zoom={12}
            className="h-full w-full"
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stages.map((stage) => (
              <Marker key={stage.id} position={[stage.latitude, stage.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{stage.name}</p>
                    {showMusicianName && stage.musician && (
                      <p className="text-zinc-500">by {stage.musician.displayName}</p>
                    )}
                    {showDistance && stage.distance !== undefined && (
                      <p className="text-violet-400">{Math.round(stage.distance)}m away</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

function StageCard({ stage, showMusicianName, showDistance }: {
  stage: Stage;
  showMusicianName: boolean;
  showDistance: boolean;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white">{stage.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${
              stage.isActive
                ? "bg-green-950 text-green-400 border-green-800/50"
                : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}>
              {stage.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {stage.description && (
            <p className="text-xs text-zinc-500 mb-2 line-clamp-1">{stage.description}</p>
          )}
          <div className="flex items-center gap-1 flex-wrap">
            <MapPin className="w-3 h-3 text-zinc-600" />
            <span className="text-[10px] font-mono text-zinc-600">
              {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}
            </span>
            <span className="text-[10px] text-zinc-700 ml-2">r={stage.radius}m</span>
            {showMusicianName && stage.musician && (
              <span className="text-[10px] text-zinc-500 ml-2">by {stage.musician.displayName}</span>
            )}
            {showDistance && stage.distance !== undefined && (
              <span className="text-[10px] text-violet-400 ml-2">{Math.round(stage.distance)}m away</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {stage._count && (
            <div className="flex items-center gap-3 text-xs text-zinc-600">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{stage._count.visualizations}</span>
              <span className="flex items-center gap-1"><Radio className="w-3 h-3" />{stage._count.stageTrackLinks}</span>
            </div>
          )}
          <Link href={`/musician/stages/${stage.id}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white">
              View
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}