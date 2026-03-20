"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Music, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haversine } from "@/lib/geo";

// Fix leaflet default marker icon (required for bundlers)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom violet stage marker icon
function createStageIcon(isActive: boolean) {
  const color = isActive ? "#8b5cf6" : "#52525b";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        transform: rotate(-45deg);
        border: 2px solid ${isActive ? "#a78bfa" : "#71717a"};
        box-shadow: 0 0 12px ${isActive ? "rgba(139,92,246,0.6)" : "rgba(0,0,0,0.4)"};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
          transform: rotate(45deg);
          opacity: ${isActive ? "1" : "0.6"};
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32],
  });
}

// User location marker icon
function createUserIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #06b6d4;
        border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(6,182,212,0.3), 0 2px 8px rgba(0,0,0,0.5);
        position: relative;
      ">
        <div style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid rgba(6,182,212,0.4);
          animation: pulse 2s ease-out infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

interface StageMarker {
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

interface MapViewProps {
  stages: StageMarker[];
  userLat: number | null;
  userLng: number | null;
  onMarkerClick?: (stage: StageMarker) => void;
  className?: string;
}

function MapCenterUpdater({
  userLat,
  userLng,
  stages,
}: {
  userLat: number | null;
  userLng: number | null;
  stages: StageMarker[];
}) {
  const map = useMap();

  useEffect(() => {
    if (userLat !== null && userLng !== null) {
      map.setView([userLat, userLng], Math.max(map.getZoom(), 13), { animate: true });
    } else if (stages.length > 0) {
      const avgLat = stages.reduce((sum, s) => sum + s.latitude, 0) / stages.length;
      const avgLng = stages.reduce((sum, s) => sum + s.longitude, 0) / stages.length;
      map.setView([avgLat, avgLng], 12, { animate: true });
    }
  }, [userLat, userLng, stages, map]);

  return null;
}

export function MapView({ stages, userLat, userLng, onMarkerClick, className = "" }: MapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);

  // Calculate map center
  function getMapCenter(): [number, number] {
    if (userLat !== null && userLng !== null) return [userLat, userLng];
    if (stages.length > 0) {
      const avgLat = stages.reduce((sum, s) => sum + s.latitude, 0) / stages.length;
      const avgLng = stages.reduce((sum, s) => sum + s.longitude, 0) / stages.length;
      return [avgLat, avgLng];
    }
    return [37.7749, -122.4194]; // SF default
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => setLocating(false),
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  }

  function formatDistance(meters?: number) {
    if (meters === undefined) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-zinc-800 ${className}`}>
      {/* Map controls overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 border-zinc-700 bg-zinc-900/80 backdrop-blur-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={handleUseMyLocation}
          disabled={locating}
          title="Center on my location"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      {/* Loading state */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-[1000]">
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Loading map…</span>
          </div>
        </div>
      )}

      <MapContainer
        center={getMapCenter()}
        zoom={13}
        className="h-full w-full"
        whenReady={() => setMapReady(true)}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCenterUpdater userLat={userLat} userLng={userLng} stages={stages} />

        {/* User location marker */}
        {userLat !== null && userLng !== null && (
          <Marker
            position={[userLat, userLng]}
            icon={createUserIcon()}
          >
            <Popup>
              <div className="text-sm flex items-center gap-1.5 text-cyan-600 font-medium">
                <Navigation className="w-3.5 h-3.5" />
                Your Location
              </div>
            </Popup>
          </Marker>
        )}

        {/* Stage markers */}
        {stages.map((stage) => (
          <Marker
            key={stage.id}
            position={[stage.latitude, stage.longitude]}
            icon={createStageIcon(stage.isActive)}
            eventHandlers={{
              click: () => onMarkerClick?.(stage),
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                {/* Stage name */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-semibold text-zinc-900 text-sm leading-tight">{stage.name}</h3>
                  <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                    stage.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {stage.isActive ? "Live" : "Offline"}
                  </span>
                </div>

                {/* Musician */}
                <p className="text-xs text-zinc-500 mb-1.5">{stage.musician.displayName}</p>

                {/* Active track */}
                {stage.stageTrackLinks[0]?.track && (
                  <div className="flex items-center gap-1.5 bg-violet-50 rounded-md px-2 py-1 mb-1.5">
                    <Music className="w-3 h-3 text-violet-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-violet-700 truncate">
                        {stage.stageTrackLinks[0].track.title}
                      </p>
                      <p className="text-[10px] text-violet-500 truncate">
                        {stage.stageTrackLinks[0].track.artist}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {stage.description && (
                  <p className="text-xs text-zinc-400 mb-1.5 line-clamp-2">{stage.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-mono">
                      {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}
                    </span>
                  </div>
                  {stage.distance !== undefined && (
                    <span className="text-[10px] text-violet-600 font-medium">
                      {formatDistance(stage.distance)}
                    </span>
                  )}
                </div>

                {/* Visualizations count */}
                <div className="mt-1 text-[10px] text-zinc-400">
                  {stage.visualizations.length} visualization{stage.visualizations.length !== 1 ? "s" : ""}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
