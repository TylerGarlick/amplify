"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { haversine } from "@/lib/geo";
import type {
  StageGeofenceData,
  GeofenceEvent,
  GeofenceEventType,
  UseGeofenceOptions,
  UseGeofenceReturn,
  GeofenceState,
  GeofenceCallbacks,
} from "@/types/geofence";

// ─────────────────────────────────────────
// Core geofence engine — pure function
// ─────────────────────────────────────────

/**
 * Given a user position and a list of stages, returns the set of stage IDs
 * the user is currently inside (distance <= stage.radius).
 */
function computeInsideStageIds(
  userLat: number,
  userLng: number,
  stages: StageGeofenceData[]
): Set<string> {
  const inside = new Set<string>();
  for (const stage of stages) {
    const dist = haversine(userLat, userLng, stage.latitude, stage.longitude);
    if (dist <= stage.radius) {
      inside.add(stage.id);
    }
  }
  return inside;
}

/**
 * Given a user position and a set of inside stage IDs, returns enriched
 * inside stage data with current distances.
 */
function enrichInsideStages(
  userLat: number,
  userLng: number,
  insideIds: Set<string>,
  stages: StageGeofenceData[]
): Array<StageGeofenceData & { distance: number }> {
  return stages
    .filter((s) => insideIds.has(s.id))
    .map((s) => ({
      ...s,
      distance: haversine(userLat, userLng, s.latitude, s.longitude),
    }));
}

// ─────────────────────────────────────────
// Context
// ─────────────────────────────────────────

interface GeofenceContextValue {
  /** All stages being monitored */
  stages: StageGeofenceData[];
  /** Current geofence state snapshot */
  state: GeofenceState;
  /** Subscribe to enter/leave events */
  subscribe: (callbacks: GeofenceCallbacks) => () => void;
  /** Trigger a manual re-check (called automatically on position change) */
  check: () => void;
}

const GeofenceContext = createContext<GeofenceContextValue | null>(null);

// ─────────────────────────────────────────
// Provider — wraps RadiusFilterContext
// ─────────────────────────────────────────

interface GeofenceProviderProps {
  children: ReactNode;
  /** Stages to monitor. Defaults to [] (geofencing disabled). */
  stages?: StageGeofenceData[];
  /** Debounce ms before firing repeated events for same stage. Default 5000ms. */
  debounceMs?: number;
  /** Called whenever user enters a stage. */
  onStageEnter?: (event: GeofenceEvent) => void;
  /** Called whenever user leaves a stage. */
  onStageLeave?: (event: GeofenceEvent) => void;
  /** Enable console debug logging. */
  debug?: boolean;
}

export function GeofenceProvider({
  children,
  stages: propStages,
  debounceMs = 5_000,
  onStageEnter,
  onStageLeave,
  debug = false,
}: GeofenceProviderProps) {
  // All registered subscriber callbacks (supports multiple listeners)
  const subscribers = useRef<GeofenceCallbacks[]>(
    onStageEnter || onStageLeave ? [{ onStageEnter, onStageLeave }] : []
  );

  // Current geofence state (mutable ref for instant access in check())
  const stateRef = useRef<GeofenceState>({
    insideStageIds: new Set(),
    insideStages: [],
    lastEvent: null,
    isTracking: false,
  });

  // Last event timestamps per stage (for debouncing)
  const lastEventTimeRef = useRef<Record<string, number>>({});

  // Stages ref (updated on each render)
  const stagesRef = useRef<StageGeofenceData[]>(propStages ?? []);

  // User position ref (updated on each check)
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const log = useCallback(
    (msg: string, ...args: unknown[]) => {
      if (debug) console.debug("[Geofence]", msg, ...args);
    },
    [debug]
  );

  /**
   * Fire ENTER or LEAVE event for a given stage.
   * Respects debounce per stage ID.
   */
  const fireEvent = useCallback(
    (type: GeofenceEventType, stage: StageGeofenceData & { distance: number }) => {
      const now = Date.now();
      const last = lastEventTimeRef.current[stage.id] ?? 0;
      if (now - last < debounceMs) {
        log(`Debounce skip ${type} for stage ${stage.id} (${stage.name})`);
        return;
      }
      lastEventTimeRef.current[stage.id] = now;

      const event: GeofenceEvent = {
        type,
        stageId: stage.id,
        stageName: stage.name,
        timestamp: now,
        distance: stage.distance,
      };

      log(`${type} event: ${stage.name} (${stage.id}), distance: ${Math.round(stage.distance)}m`);

      // Update state
      stateRef.current = {
        ...stateRef.current,
        lastEvent: event,
      };

      // Notify all subscribers
      for (const cb of subscribers.current) {
        if (type === "ENTER") cb.onStageEnter?.(event);
        else cb.onStageLeave?.(event);
      }
    },
    [debounceMs, log]
  );

  /**
   * Core geofence check — called on position updates and manual triggers.
   * Detects ENTER and LEAVE transitions by diffing previous vs new insideStageIds.
   */
  const check = useCallback(() => {
    const pos = userPosRef.current;
    const stages = stagesRef.current;

    if (!pos || stages.length === 0) return;

    const prevInside = stateRef.current.insideStageIds;
    const newInside = computeInsideStageIds(pos.lat, pos.lng, stages);

    // Detect LEAVEs: were inside, now outside
    for (const stageId of prevInside) {
      if (!newInside.has(stageId)) {
        const stage = stages.find((s) => s.id === stageId)!;
        const distance = haversine(pos.lat, pos.lng, stage.latitude, stage.longitude);
        fireEvent("LEAVE", { ...stage, distance });
      }
    }

    // Detect ENTERs: were outside, now inside
    for (const stageId of newInside) {
      if (!prevInside.has(stageId)) {
        const stage = stages.find((s) => s.id === stageId)!;
        const distance = haversine(pos.lat, pos.lng, stage.latitude, stage.longitude);
        fireEvent("ENTER", { ...stage, distance });
      }
    }

    // Update persistent state
    const newInsideStages = enrichInsideStages(pos.lat, pos.lng, newInside, stages);
    stateRef.current = {
      insideStageIds: newInside,
      insideStages: newInsideStages,
      lastEvent: stateRef.current.lastEvent,
      isTracking: true,
    };

    log(
      `Check complete — inside ${newInside.size} stage(s):`,
      [...newInside].join(", ") || "(none)"
    );
  }, [fireEvent, log]);

  /**
   * Subscribe to geofence events. Returns an unsubscribe function.
   */
  const subscribe = useCallback((callbacks: GeofenceCallbacks) => {
    subscribers.current.push(callbacks);
    return () => {
      const idx = subscribers.current.indexOf(callbacks);
      if (idx !== -1) subscribers.current.splice(idx, 1);
    };
  }, []);

  const value = useMemo<GeofenceContextValue>(
    () => ({
      get stages() {
        return stagesRef.current;
      },
      get state() {
        return stateRef.current;
      },
      subscribe,
      check,
    }),
    [subscribe, check]
  );

  return (
    <GeofenceContext.Provider value={value}>
      {children}
    </GeofenceContext.Provider>
  );
}

// ─────────────────────────────────────────
// useGeofence hook — consumer API
// ─────────────────────────────────────────

/**
 * React hook for consuming geofence state and subscribing to events.
 *
 * @example
 * ```tsx
 * const { insideStages, lastEvent, isTracking } = useGeofence();
 * ```
 *
 * For manual position-driven checks (when NOT using GeofenceProvider's
 * automatic position tracking), use useGeofenceWithPosition instead.
 */
export function useGeofence(): GeofenceState {
  const context = useContext(GeofenceContext);
  if (!context) {
    throw new Error("useGeofence must be used within GeofenceProvider");
  }
  // Return a stable snapshot by reading from the mutable ref on each call.
  // This ensures callers always get the latest state without re-render management.
  return context.state;
}

/**
 * Full geofence hook with manual position injection.
 *
 * Use this when you want to drive geofence checks yourself (e.g., from
 * a watchPosition callback or RadiusFilterContext position changes).
 *
 * @example
 * ```tsx
 * const { insideStages, lastEvent, check } = useGeofenceWithPosition({
 *   stages,
 *   userLat: position?.lat ?? null,
 *   userLng: position?.lng ?? null,
 *   callbacks: {
 *     onStageEnter: (e) => toast(`Entered ${e.stageName}!`),
 *     onStageLeave: (e) => toast(`Left ${e.stageName}`),
 *   },
 * });
 *
 * // Trigger check whenever position updates
 * useEffect(() => { check(); }, [userLat, userLng, check]);
 * ```
 */
export function useGeofenceWithPosition(
  options: UseGeofenceOptions
): UseGeofenceReturn {
  const { stages, userLat, userLng, debounceMs = 5_000, callbacks, debug } = options;

  // Refs for stable access in the check callback without causing re-renders
  const stagesRef = useRef(stages);
  const userPosRef = useRef<{ lat: number; lng: number } | null>(
    userLat !== null && userLng !== null ? { lat: userLat, lng: userLng } : null
  );
  const callbacksRef = useRef(callbacks);
  const lastEventTimeRef = useRef<Record<string, number>>({});

  // Always keep refs in sync with latest props
  stagesRef.current = stages;
  callbacksRef.current = callbacks;
  userPosRef.current =
    userLat !== null && userLng !== null ? { lat: userLat, lng: userLng } : null;

  // Mutable state (not reactive — read via ref in check, returned as snapshot)
  const stateRef = useRef<GeofenceState>({
    insideStageIds: new Set(),
    insideStages: [],
    lastEvent: null,
    isTracking: userLat !== null && userLng !== null,
  });

  const log = useCallback(
    (msg: string, ...args: unknown[]) => {
      if (debug) console.debug("[Geofence]", msg, ...args);
    },
    [debug]
  );

  const fireEvent = useCallback(
    (type: GeofenceEventType, stage: StageGeofenceData & { distance: number }) => {
      const now = Date.now();
      const last = lastEventTimeRef.current[stage.id] ?? 0;
      if (now - last < debounceMs) {
        log(`Debounce skip ${type} for stage ${stage.id}`);
        return;
      }
      lastEventTimeRef.current[stage.id] = now;

      const event: GeofenceEvent = {
        type,
        stageId: stage.id,
        stageName: stage.name,
        timestamp: now,
        distance: stage.distance,
      };

      log(`${type}: ${stage.name} at ${Math.round(stage.distance)}m`);

      stateRef.current = { ...stateRef.current, lastEvent: event };

      if (type === "ENTER") callbacksRef.current.onStageEnter?.(event);
      else callbacksRef.current.onStageLeave?.(event);
    },
    [debounceMs, log]
  );

  const check = useCallback(() => {
    const pos = userPosRef.current;
    const stages = stagesRef.current;
    if (!pos || stages.length === 0) return;

    const prevInside = stateRef.current.insideStageIds;
    const newInside = computeInsideStageIds(pos.lat, pos.lng, stages);

    // LEAVEs
    for (const id of prevInside) {
      if (!newInside.has(id)) {
        const stage = stages.find((s) => s.id === id)!;
        fireEvent("LEAVE", {
          ...stage,
          distance: haversine(pos.lat, pos.lng, stage.latitude, stage.longitude),
        });
      }
    }

    // ENTERs
    for (const id of newInside) {
      if (!prevInside.has(id)) {
        const stage = stages.find((s) => s.id === id)!;
        fireEvent("ENTER", {
          ...stage,
          distance: haversine(pos.lat, pos.lng, stage.latitude, stage.longitude),
        });
      }
    }

    const newInsideStages = enrichInsideStages(pos.lat, pos.lng, newInside, stages);
    stateRef.current = {
      insideStageIds: newInside,
      insideStages: newInsideStages,
      lastEvent: stateRef.current.lastEvent,
      isTracking: true,
    };
  }, [fireEvent, log]);

  // Expose stable snapshot of current state
  const stateSnapshot = stateRef.current;

  return { ...stateSnapshot, check };
}
