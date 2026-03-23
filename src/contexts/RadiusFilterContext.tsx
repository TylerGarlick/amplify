"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { haversine } from "@/lib/geo";

export type RadiusOption = 5 | 10 | 25 | 50;

export const RADIUS_OPTIONS: { value: RadiusOption; label: string; meters: number }[] = [
  { value: 5, label: "5 mi", meters: 5 * 1609.34 },
  { value: 10, label: "10 mi", meters: 10 * 1609.34 },
  { value: 25, label: "25 mi", meters: 25 * 1609.34 },
  { value: 50, label: "50 mi", meters: 50 * 1609.34 },
];

interface RadiusFilterContextValue {
  radius: RadiusOption;
  setRadius: (radius: RadiusOption) => void;
  userLat: number | null;
  userLng: number | null;
  setUserLocation: (lat: number, lng: number) => void;
  hasLocation: boolean;
}

const RadiusFilterContext = createContext<RadiusFilterContextValue | null>(null);

export function RadiusFilterProvider({ children }: { children: ReactNode }) {
  const [radius, setRadius] = useState<RadiusOption>(25);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const setUserLocation = useCallback((lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
  }, []);

  const value = useMemo(
    () => ({
      radius,
      setRadius,
      userLat,
      userLng,
      setUserLocation,
      hasLocation: userLat !== null && userLng !== null,
    }),
    [radius, userLat, userLng, setUserLocation]
  );

  return (
    <RadiusFilterContext.Provider value={value}>
      {children}
    </RadiusFilterContext.Provider>
  );
}

export function useRadiusFilter() {
  const context = useContext(RadiusFilterContext);
  if (!context) {
    throw new Error("useRadiusFilter must be used within RadiusFilterProvider");
  }
  return context;
}

export function useFilteredStages<T extends { latitude: number; longitude: number }>(
  stages: T[]
): (T & { distance: number })[] {
  const { userLat, userLng, radius, hasLocation } = useRadiusFilter();

  return useMemo(() => {
    if (!hasLocation || userLat === null || userLng === null) {
      return stages.map((stage) => ({
        ...stage,
        distance: 0,
      }));
    }

    const radiusMeters = RADIUS_OPTIONS.find((r) => r.value === radius)?.meters ?? 25 * 1609.34;

    return stages
      .map((stage) => ({
        ...stage,
        distance: haversine(userLat, userLng, stage.latitude, stage.longitude),
      }))
      .filter((stage) => stage.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);
  }, [stages, userLat, userLng, radius, hasLocation]);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    return `${Math.round(meters)}m`;
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}
