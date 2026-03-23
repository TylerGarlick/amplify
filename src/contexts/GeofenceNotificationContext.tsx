"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyStages } from "@/hooks/useNearbyStages";
import { useGeofenceWithPosition } from "@/contexts/GeofenceContext";
import type { GeofenceEvent, StageGeofenceData } from "@/types/geofence";

interface GeofenceNotificationOptions {
  /** Stages to monitor. Defaults to fetching nearby stages automatically. */
  stages?: StageGeofenceData[];
  /** Radius in meters for nearby stages fetch. Default 2000. */
  nearbyRadius?: number;
  /** Minimum ms between repeated notifications for the same stage. Default 10s. */
  debounceMs?: number;
  /** Override the default enter notification message. */
  renderEnterMessage?: (event: GeofenceEvent) => string;
  /** Override the default leave notification message. */
  renderLeaveMessage?: (event: GeofenceEvent) => string;
  /** Set to false to disable notifications (e.g., user disabled in settings). */
  enabled?: boolean;
}

/**
 * Formats the distance from a geofence event into a human-readable string.
 */
function formatEventDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

/**
 * Default enter notification message.
 */
function defaultEnterMessage(event: GeofenceEvent): string {
  return `🎵 You just entered ${event.stageName} — ${formatEventDistance(event.distance)}`;
}

/**
 * Default leave notification message.
 */
function defaultLeaveMessage(event: GeofenceEvent): string {
  return `👋 You left ${event.stageName}. Hope you had a great time!`;
}

/**
 * GeofenceNotificationProvider
 *
 * Bridges the geofence engine (GeofenceContext) with the notification system (sonner).
 * Automatically fetches nearby stages and fires toast notifications when the user
 * enters or leaves a geofenced stage area.
 *
 * Requires: useGeolocation, useNearbyStages hooks to be available (they use Zustand stores).
 *
 * @example
 * ```tsx
 * // In your app layout or AR page:
 * <GeofenceNotificationProvider nearbyRadius={2000}>
 *   <ARViewClient />
 * </GeofenceNotificationProvider>
 * ```
 */
export function GeofenceNotificationProvider({
  children,
  stages,
  nearbyRadius = 2000,
  debounceMs = 10_000,
  renderEnterMessage,
  renderLeaveMessage,
  enabled = true,
}: {
  children: React.ReactNode;
} & GeofenceNotificationOptions) {
  // Get user's current position
  const { lat, lng } = useGeolocation();

  // Fetch nearby stages automatically if not provided
  const { stages: fetchedStages } = useNearbyStages(nearbyRadius);

  // Resolve which stages to monitor
  const monitoredStages = stages ?? fetchedStages;

  // Track whether we've shown the initial enter for stages the user
  // is already inside when the provider mounts (avoid spamming on load)
  const initialCheckDone = useRef(false);

  // Wire up geofence with position + callbacks
  const { check } = useGeofenceWithPosition({
    stages: monitoredStages,
    userLat: lat,
    userLng: lng,
    debounceMs,
    callbacks: {
      onStageEnter: enabled
        ? (event: GeofenceEvent) => {
            // Skip if this is the initial check (user was already inside)
            if (!initialCheckDone.current) return;
            toast.success(
              renderEnterMessage?.(event) ?? defaultEnterMessage(event),
              {
                id: `geofence-enter-${event.stageId}`,
                duration: 4000,
              }
            );
          }
        : undefined,
      onStageLeave: enabled
        ? (event: GeofenceEvent) => {
            // Skip if this is the initial check
            if (!initialCheckDone.current) return;
            toast.info(
              renderLeaveMessage?.(event) ?? defaultLeaveMessage(event),
              {
                id: `geofence-leave-${event.stageId}`,
                duration: 4000,
              }
            );
          }
        : undefined,
    },
    debug: false,
  });

  // Run an initial check once we have position data to seed the inside state
  useEffect(() => {
    if (lat !== null && lng !== null && !initialCheckDone.current) {
      // Small tick to let useGeofenceWithPosition initialize first
      const timer = setTimeout(() => {
        check();
        initialCheckDone.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lat, lng, check]);

  // Re-check whenever position or stages change
  useEffect(() => {
    check();
  }, [lat, lng, monitoredStages.length, check]);

  return <>{children}</>;
}
