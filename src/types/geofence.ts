// ─────────────────────────────────────────
// Geofence event types
// ─────────────────────────────────────────

export type GeofenceEventType = "ENTER" | "LEAVE";

export interface GeofenceEvent {
  type: GeofenceEventType;
  stageId: string;
  stageName: string;
  timestamp: number;
  distance: number; // distance from stage center at time of event
}

export interface StageGeofenceData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // detection radius in meters (from Stage.radius)
}

export interface GeofenceState {
  /** Set of stage IDs the user is currently inside */
  insideStageIds: Set<string>;
  /** Stages the user is currently inside, with distance */
  insideStages: Array<StageGeofenceData & { distance: number }>;
  /** Most recent event (ENTER or LEAVE) */
  lastEvent: GeofenceEvent | null;
  /** Whether geofencing is actively tracking */
  isTracking: boolean;
}

export interface GeofenceCallbacks {
  onStageEnter?: (event: GeofenceEvent) => void;
  onStageLeave?: (event: GeofenceEvent) => void;
}

export interface UseGeofenceOptions {
  /** Stages to monitor for geofencing */
  stages: StageGeofenceData[];
  /** User's current latitude */
  userLat: number | null;
  /** User's current longitude */
  userLng: number | null;
  /** Minimum time (ms) between repeated ENTER/LEAVE events for the same stage */
  debounceMs?: number;
  /** Callbacks for enter/leave events */
  callbacks?: GeofenceCallbacks;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseGeofenceReturn extends GeofenceState {
  /** Manually trigger a check (useful when position updates) */
  check: () => void;
}
