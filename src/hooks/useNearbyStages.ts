"use client";

import useSWR from "swr";
import { useLocationStore } from "@/stores/locationStore";
import { useARStore } from "@/stores/arStore";
import { useEffect, useRef } from "react";
import type { StageWithVisualizations } from "@/types/ar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const POLL_INTERVAL_MS = 30_000;
const REVALIDATE_DISTANCE_M = 50; // revalidate when user moves >50m

export function useNearbyStages(radius = 500) {
  const { lat, lng } = useLocationStore();
  const { setNearbyStages } = useARStore();
  const lastFetchedPos = useRef<{ lat: number; lng: number } | null>(null);

  const url =
    lat !== null && lng !== null
      ? `/api/ar/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
      : null;

  const { data, error } = useSWR<{ data: StageWithVisualizations[] }>(
    url,
    fetcher,
    {
      refreshInterval: POLL_INTERVAL_MS,
      revalidateOnFocus: false,
      // Only revalidate if user moved more than 50m since last fetch
      revalidateIfStale: (() => {
        if (!lat || !lng || !lastFetchedPos.current) return true;
        const { lat: pLat, lng: pLng } = lastFetchedPos.current;
        const dist = Math.sqrt((lat - pLat) ** 2 + (lng - pLng) ** 2) * 111_000;
        return dist > REVALIDATE_DISTANCE_M;
      })(),
    }
  );

  useEffect(() => {
    if (data?.data) {
      setNearbyStages(data.data);
      if (lat && lng) lastFetchedPos.current = { lat, lng };
    }
  }, [data, setNearbyStages, lat, lng]);

  return { stages: data?.data ?? [], error };
}
