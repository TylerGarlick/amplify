"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tribe {
  id: string;
  name: string;
  color: string;
}

interface Territory {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isEnhanced: boolean;
  owningTribe?: Tribe | null;
  stage: {
    id: string;
    name: string;
    musician: {
      displayName: string;
    };
  };
}

interface TerritoryMapProps {
  userLatitude?: number;
  userLongitude?: number;
  onTerritoryClick?: (territory: Territory) => void;
}

export function TerritoryMap({ userLatitude, userLongitude, onTerritoryClick }: TerritoryMapProps) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTerritories();
  }, []);

  const fetchTerritories = async () => {
    try {
      const res = await fetch("/api/territories");
      const data = await res.json();
      setTerritories(data);
    } catch (error) {
      console.error("Failed to load territories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Simple mock map display (in production, integrate with Mapbox/Google Maps)
  const handleTerritoryClick = (territory: Territory) => {
    setSelectedTerritory(territory);
    onTerritoryClick?.(territory);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Map Background */}
      <div 
        ref={mapRef}
        className="relative w-full h-96 bg-zinc-900 rounded-xl overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 70%)`,
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* User location marker (if provided) */}
        {userLatitude && userLongitude && (
          <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            <div className="absolute inset-0 w-4 h-4 bg-white/30 rounded-full animate-ping" />
          </div>
        )}

        {/* Territory markers */}
        {territories.map((territory, index) => {
          // Simple positioning based on coordinates (in production use proper map)
          const x = 20 + ((territory.longitude + 180) % 360) / 360 * 60;
          const y = 20 + ((90 - territory.latitude) % 180) / 180 * 60;
          
          return (
            <button
              key={territory.id}
              onClick={() => handleTerritoryClick(territory)}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
                "hover:scale-110 hover:z-10"
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="relative">
                <MapPin 
                  className="w-8 h-8 drop-shadow-lg"
                  style={{ 
                    color: territory.owningTribe?.color || '#666',
                    fill: territory.owningTribe?.color ? `${territory.owningTribe.color}40` : 'transparent'
                  }}
                />
                {territory.isEnhanced && (
                  <Zap className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
                )}
                {territory.owningTribe && (
                  <Crown 
                    className="absolute -top-2 -right-2 w-4 h-4"
                    style={{ color: territory.owningTribe.color }}
                    fill="currentColor"
                  />
                )}
              </div>
            </button>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur rounded-lg p-3 text-xs space-y-1">
          <div className="flex items-center gap-2 text-zinc-400">
            <MapPin className="w-4 h-4" />
            <span>Territory</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Crown className="w-4 h-4" />
            <span>Owner</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Enhanced (2x)</span>
          </div>
        </div>
      </div>

      {/* Selected Territory Info */}
      {selectedTerritory && (
        <div className="mt-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {selectedTerritory.owningTribe && (
                  <Crown 
                    className="w-5 h-5"
                    style={{ color: selectedTerritory.owningTribe.color }}
                    fill="currentColor"
                  />
                )}
                {selectedTerritory.name}
                {selectedTerritory.isEnhanced && (
                  <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                )}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {selectedTerritory.stage.musician.displayName} • {selectedTerritory.stage.name}
              </p>
            </div>
            {selectedTerritory.owningTribe && (
              <div 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: selectedTerritory.owningTribe.color + '20',
                  color: selectedTerritory.owningTribe.color 
                }}
              >
                {selectedTerritory.owningTribe.name}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}