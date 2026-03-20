"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { MapPin, Navigation, Loader2, Music, Radio, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RADIUS_OPTIONS, formatDistance, useRadiusFilter } from "@/contexts/RadiusFilterContext";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export interface StageMapStage {
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

interface StageMapProps {
  stages: StageMapStage[];
  userLat?: number | null;
  userLng?: number | null;
  onStageSelect?: (stage: StageMapStage) => void;
  selectedStageId?: string | null;
  height?: string;
}

function MapClickHandler({ onLocationChange }: { onLocationChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RadiusSelector() {
  const { radius, setRadius, hasLocation } = useRadiusFilter();

  if (!hasLocation) return null;

  return (
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
  );
}

function UserLocationMarker({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    const customIcon = L.divIcon({
      html: `
        <div class="user-location-marker">
          <div class="user-location-pulse"></div>
          <div class="user-location-dot"></div>
        </div>
      `,
      className: "user-location-wrapper",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    return () => {
      marker.remove();
    };
  }, [lat, lng, map]);

  return null;
}

function FitBoundsToMarkers({ stages, map }: { stages: StageMapStage[]; map: L.Map }) {
  useEffect(() => {
    if (stages.length === 0) return;
    const bounds = L.latLngBounds(stages.map((s) => [s.latitude, s.longitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [stages, map]);
  return null;
}

function createStageIcon(isSelected: boolean, isActive: boolean) {
  const color = isActive ? "#8b5cf6" : "#6b7280";
  const size = isSelected ? 44 : 36;
  const innerSize = isSelected ? 16 : 12;

  return L.divIcon({
    html: `
      <div class="stage-marker ${isSelected ? "selected" : ""} ${isActive ? "active" : ""}" 
           style="width:${size}px;height:${size}px;--marker-color:${color}">
        <div class="stage-marker-inner" style="width:${innerSize}px;height:${innerSize}px;background:${color}">
          <svg width="${innerSize}" height="${innerSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
      </div>
    `,
    className: "stage-marker-wrapper",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function StagePopupContent({ stage }: { stage: StageMapStage }) {
  return (
    <div className="stage-popup">
      <div className="stage-popup-header">
        <h3 className="stage-popup-title">{stage.name}</h3>
        <span className={`stage-popup-badge ${stage.isActive ? "active" : "inactive"}`}>
          {stage.isActive ? "LIVE" : "OFFLINE"}
        </span>
      </div>
      <p className="stage-popup-musician">{stage.musician.displayName}</p>
      {stage.stageTrackLinks[0]?.track && (
        <div className="stage-popup-track">
          <Music className="w-3 h-3" />
          <span>{stage.stageTrackLinks[0].track.title}</span>
        </div>
      )}
      <div className="stage-popup-coords">
        <MapPin className="w-3 h-3" />
        <span>{stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}</span>
      </div>
      {stage.distance !== undefined && (
        <div className="stage-popup-distance">
          {formatDistance(stage.distance)} away
        </div>
      )}
    </div>
  );
}

export function StageMap({
  stages,
  userLat,
  userLng,
  onStageSelect,
  selectedStageId,
  height = "100%",
}: StageMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [center, setCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [currentUserLat, setCurrentUserLat] = useState<number | null>(userLat ?? null);
  const [currentUserLng, setCurrentUserLng] = useState<number | null>(userLng ?? null);
  const [selectedStage, setSelectedStage] = useState<StageMapStage | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Determine center
  useEffect(() => {
    if (userLat && userLng) {
      setCenter([userLat, userLng]);
      setCurrentUserLat(userLat);
      setCurrentUserLng(userLng);
    } else if (stages.length > 0) {
      const avgLat = stages.reduce((sum, s) => sum + s.latitude, 0) / stages.length;
      const avgLng = stages.reduce((sum, s) => sum + s.longitude, 0) / stages.length;
      setCenter([avgLat, avgLng]);
    }
  }, [userLat, userLng, stages]);

  // Handle stage selection
  useEffect(() => {
    if (selectedStageId && mapRef.current) {
      const stage = stages.find((s) => s.id === selectedStageId);
      if (stage) {
        setSelectedStage(stage);
        mapRef.current.setView([stage.latitude, stage.longitude], 15, { animate: true });
      }
    }
  }, [selectedStageId, stages]);

  const { setUserLocation } = useRadiusFilter();

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentUserLat(latitude);
        setCurrentUserLng(longitude);
        setUserLocation(latitude, longitude);
        setCenter([latitude, longitude]);
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 14);
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleMarkerClick = (stage: StageMapStage) => {
    setSelectedStage(stage);
    onStageSelect?.(stage);
  };

  return (
    <div className="stage-map-container" style={{ height }}>
      {/* Map controls */}
      <div className="stage-map-controls">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs border-zinc-700 bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 backdrop-blur-sm"
          onClick={handleUseMyLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Navigation className="w-3 h-3 mr-1" />
          )}
          My Location
        </Button>
        <RadiusSelector />
      </div>

      {/* Stage count badge */}
      <div className="stage-map-badge">
        <Radio className="w-3 h-3" />
        <span>{stages.length} stage{stages.length !== 1 ? "s" : ""}</span>
      </div>

      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        whenReady={() => setMapReady(true)}
        ref={(map) => {
          if (map) mapRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler />

        {mapReady && stages.length > 0 && mapRef.current && (
          <FitBoundsToMarkers stages={stages} map={mapRef.current} />
        )}

        {/* User location marker */}
        {currentUserLat && currentUserLng && (
          <UserLocationMarker lat={currentUserLat} lng={currentUserLng} />
        )}

        {/* Stage markers */}
        {stages.map((stage) => (
          <Marker
            key={stage.id}
            position={[stage.latitude, stage.longitude]}
            icon={createStageIcon(selectedStage?.id === stage.id, stage.isActive)}
            eventHandlers={{
              click: () => handleMarkerClick(stage),
            }}
          >
            <Popup className="stage-popup-container">
              <StagePopupContent stage={stage} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Selected stage info panel */}
      {selectedStage && (
        <div className="stage-info-panel">
          <div className="stage-info-panel-header">
            <div>
              <h3 className="stage-info-title">{selectedStage.name}</h3>
              <p className="stage-info-musician">{selectedStage.musician.displayName}</p>
            </div>
            <button
              className="stage-info-close"
              onClick={() => setSelectedStage(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedStage.description && (
            <p className="stage-info-desc">{selectedStage.description}</p>
          )}
          {selectedStage.stageTrackLinks[0]?.track && (
            <div className="stage-info-track">
              <Music className="w-4 h-4 text-violet-400" />
              <div>
                <span className="stage-info-track-title">{selectedStage.stageTrackLinks[0].track.title}</span>
                <span className="stage-info-track-artist">{selectedStage.stageTrackLinks[0].track.artist}</span>
              </div>
            </div>
          )}
          <div className="stage-info-meta">
            <div className="stage-info-coords">
              <MapPin className="w-3 h-3" />
              <span>{selectedStage.latitude.toFixed(5)}, {selectedStage.longitude.toFixed(5)}</span>
            </div>
            {selectedStage.distance !== undefined && (
              <span className="stage-info-distance">
                {selectedStage.distance < 1000
                  ? `${Math.round(selectedStage.distance)}m`
                  : `${(selectedStage.distance / 1000).toFixed(1)}km`}
              </span>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .user-location-wrapper {
          background: none !important;
          border: none !important;
        }
        .user-location-marker {
          position: relative;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-location-pulse {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.3);
          animation: pulse 2s ease-out infinite;
        }
        .user-location-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
        }
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .stage-marker-wrapper {
          background: none !important;
          border: none !important;
        }
        .stage-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .stage-marker.selected {
          transform: scale(1.2);
          z-index: 1000 !important;
        }
        .stage-marker-inner {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        .stage-marker.selected .stage-marker-inner {
          box-shadow: 0 0 0 3px var(--marker-color), 0 4px 16px rgba(139, 92, 246, 0.4);
        }
        .stage-popup-container :global(.leaflet-popup-content-wrapper) {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 0;
          min-width: 200px;
        }
        .stage-popup-container :global(.leaflet-popup-content) {
          margin: 0;
          color: #e4e4e7;
        }
        .stage-popup-container :global(.leaflet-popup-tip) {
          background: #18181b;
          border: 1px solid #27272a;
        }
        .stage-popup {
          padding: 12px;
        }
        .stage-popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }
        .stage-popup-title {
          font-size: 14px;
          font-weight: 600;
          color: #fafafa;
          margin: 0;
        }
        .stage-popup-badge {
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stage-popup-badge.active {
          background: #166534;
          color: #4ade80;
          border: 1px solid #166534;
        }
        .stage-popup-badge.inactive {
          background: #3f3f46;
          color: #a1a1aa;
          border: 1px solid #3f3f46;
        }
        .stage-popup-musician {
          font-size: 11px;
          color: #71717a;
          margin: 0 0 8px 0;
        }
        .stage-popup-track {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.1);
          padding: 6px 8px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .stage-popup-track svg {
          flex-shrink: 0;
          color: #8b5cf6;
        }
        .stage-popup-coords {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #52525b;
          font-family: monospace;
        }
        .stage-popup-distance {
          font-size: 11px;
          color: #8b5cf6;
          margin-top: 6px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
