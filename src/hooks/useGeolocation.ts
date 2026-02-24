"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";

export function useGeolocation() {
  const { setLocation, setError, lat, lng, heading, accuracy, error } =
    useLocationStore();

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation(pos),
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setLocation, setError]);

  return { lat, lng, heading, accuracy, error };
}
