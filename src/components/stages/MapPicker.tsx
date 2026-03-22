"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getConfiguredTileProvider,
  getTileUrl,
  getApiKey,
  TILE_PROVIDERS,
} from "@/lib/map-tile-config";

// Fix leaflet default marker icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  radius?: number;
}

function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);
  return null;
}

export function MapPicker({ latitude, longitude, onLocationChange, radius = 50 }: MapPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [currentLat, setCurrentLat] = useState(latitude);
  const [currentLng, setCurrentLng] = useState(longitude);
  const [mapReady, setMapReady] = useState(false);

  // Memoize tile config to avoid repeated calls on re-render
  const tileProvider = useMemo(() => getConfiguredTileProvider(), []);
  const tileConfig = TILE_PROVIDERS[tileProvider];
  const tileUrl = useMemo(
    () => getTileUrl(tileProvider, getApiKey(tileProvider)),
    [tileProvider]
  );

  // Update state when props change
  useEffect(() => {
    setCurrentLat(latitude);
    setCurrentLng(longitude);
  }, [latitude, longitude]);

  const handleLocationChange = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    onLocationChange(lat, lng);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationChange(pos.coords.latitude, pos.coords.longitude);
        setIsLocating(false);
        toast.success("Location captured!");
      },
      (err) => {
        toast.error(`Could not get location: ${err.message}`);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        // Privacy: reuse cached location to avoid repeated GPS pings
        maximumAge: 5 * 60 * 1000, // 5 minutes
      }
    );
  };

  // Calculate default center (default to SF if no coords provided)
  const defaultCenter: [number, number] = latitude && longitude ? [latitude, longitude] : [37.7749, -122.4194];

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-400">
          <MapPin className="w-4 h-4" />
          <span className="text-xs tracking-wider uppercase">Pin Your Stage</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          onClick={handleUseMyLocation}
          disabled={isLocating}
        >
          {isLocating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Navigation className="w-3 h-3 mr-1" />}
          Use My Location
        </Button>
      </div>

      <div className="relative h-[300px]">
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-[1000]">
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading map...</span>
            </div>
          </div>
        )}
        <MapContainer
          center={defaultCenter}
          zoom={15}
          className="h-full w-full"
          whenReady={() => setMapReady(true)}
        >
          {/* Privacy: Use configured tile provider (Stadia by default, not OSM) */}
          <TileLayer
            attribution={tileConfig.attribution}
            url={tileUrl}
            maxZoom={tileConfig.maxZoom}
          />
          <MapClickHandler onLocationChange={handleLocationChange} />
          <MapUpdater latitude={currentLat} longitude={currentLng} />
          <Marker position={[currentLat, currentLng]} />
          
          {/* Radius indicator */}
          <Circle radius={radius} center={[currentLat, currentLng]} />
        </MapContainer>
      </div>

      <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span>Lat: {currentLat.toFixed(6)}</span>
            <span className="text-zinc-700">|</span>
            <span>Lng: {currentLng.toFixed(6)}</span>
          </div>
          <span className="text-[10px] text-zinc-600">Click map to reposition</span>
        </div>
      </div>
    </div>
  );
}

// Simple circle component
function Circle({ center, radius }: { center: [number, number]; radius: number }) {
  const circleRef = useRef<L.Circle | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (circleRef.current) {
      circleRef.current.setLatLng(center);
    } else {
      circleRef.current = L.circle(center, {
        radius,
        color: "#8b5cf6",
        fillColor: "#8b5cf6",
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(map);
    }

    return () => {
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    };
  }, [map, center, radius]);

  return null;
}