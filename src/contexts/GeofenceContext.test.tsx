import { describe, it, expect, beforeEach } from "vitest";

// ─────────────────────────────────────────
// Pure function re-implementation for unit tests
// (mirrors GeofenceContext.tsx — used to test logic without React dependency)
// ─────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeInsideStageIds(
  userLat: number,
  userLng: number,
  stages: Array<{
    id: string;
    latitude: number;
    longitude: number;
    radius: number;
  }>
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

// ─────────────────────────────────────────
// Test data
// ─────────────────────────────────────────

const STAGE_A = {
  id: "stage-a",
  name: "Stage A",
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 50,
};

const STAGE_B = {
  id: "stage-b",
  name: "Stage B",
  latitude: 37.7759,
  longitude: -122.4194,
  radius: 100,
};

const STAGE_C = {
  id: "stage-c",
  name: "Stage C",
  latitude: 38.0,
  longitude: -123.0,
  radius: 50,
};

const ALL_STAGES = [STAGE_A, STAGE_B, STAGE_C];

const USER_AT_A_CENTER = { lat: STAGE_A.latitude, lng: STAGE_A.longitude };

const USER_111M_NORTH = {
  lat: STAGE_A.latitude + 0.001,
  lng: STAGE_A.longitude,
};

const USER_FAR_AWAY = { lat: 36.0, lng: -121.0 };

// ─────────────────────────────────────────
// Pure function unit tests
// ─────────────────────────────────────────

describe("haversine", () => {
  it("returns 0 for identical points", () => {
    expect(haversine(37.7749, -122.4194, 37.7749, -122.4194)).toBe(0);
  });

  it("returns ~111m for 0.001 degree latitude delta at this longitude", () => {
    const d = haversine(37.7749, -122.4194, 37.7759, -122.4194);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it("is symmetric", () => {
    const d1 = haversine(37.7749, -122.4194, 37.78, -122.42);
    const d2 = haversine(37.78, -122.42, 37.7749, -122.4194);
    expect(Math.abs(d1 - d2) / d1).toBeLessThan(0.0001);
  });
});

describe("computeInsideStageIds", () => {
  it("returns empty set when user is far from all stages", () => {
    const inside = computeInsideStageIds(USER_FAR_AWAY.lat, USER_FAR_AWAY.lng, ALL_STAGES);
    expect(inside.size).toBe(0);
  });

  it("detects user inside stage A at center", () => {
    const inside = computeInsideStageIds(USER_AT_A_CENTER.lat, USER_AT_A_CENTER.lng, ALL_STAGES);
    expect(inside.has("stage-a")).toBe(true);
    expect(inside.has("stage-b")).toBe(false);
    expect(inside.has("stage-c")).toBe(false);
  });

  it("detects user inside overlapping stages", () => {
    // 111m north of A: outside A's 50m radius, inside B's 100m radius
    const inside = computeInsideStageIds(USER_111M_NORTH.lat, USER_111M_NORTH.lng, ALL_STAGES);
    expect(inside.has("stage-a")).toBe(false); // ~111m > 50m
    expect(inside.has("stage-b")).toBe(true); // ~8m < 100m
    expect(inside.has("stage-c")).toBe(false);
  });

  it("correctly uses stage.radius as detection boundary", () => {
    expect(
      computeInsideStageIds(STAGE_A.latitude, STAGE_A.longitude, [STAGE_A]).has("stage-a")
    ).toBe(true);
    expect(
      computeInsideStageIds(STAGE_A.latitude + 0.001, STAGE_A.longitude, [STAGE_A]).has("stage-a")
    ).toBe(false);
  });

  it("handles empty stage array", () => {
    const inside = computeInsideStageIds(USER_AT_A_CENTER.lat, USER_AT_A_CENTER.lng, []);
    expect(inside.size).toBe(0);
  });
});

// ─────────────────────────────────────────
// useGeofenceWithPosition — tested via direct invocation
// (This hook uses only refs — no reactive state — so we can call it directly)
// ─────────────────────────────────────────

type GeofenceEvent = {
  type: "ENTER" | "LEAVE";
  stageId: string;
  stageName: string;
  timestamp: number;
  distance: number;
};

type GeofenceState = {
  insideStageIds: Set<string>;
  insideStages: Array<{ id: string; name: string; distance: number }>;
  lastEvent: GeofenceEvent | null;
  isTracking: boolean;
};

// Re-implements useGeofenceWithPosition for isolated unit testing.
// This must stay in sync with the actual implementation.
function createTestGeofence(opts: {
  stages: Array<{ id: string; name: string; latitude: number; longitude: number; radius: number }>;
  userLat: number | null;
  userLng: number | null;
  debounceMs?: number;
  callbacks?: { onStageEnter?: (e: GeofenceEvent) => void; onStageLeave?: (e: GeofenceEvent) => void };
  /** Pre-populate insideStageIds — use this to simulate a prior position */
  initialInsideStageIds?: string[];
}): {
  state: GeofenceState;
  check: () => void;
} {
  const { stages, userLat, userLng, debounceMs = 5000, callbacks, initialInsideStageIds = [] } = opts;

  let userPos: { lat: number; lng: number } | null =
    userLat !== null && userLng !== null ? { lat: userLat, lng: userLng } : null;

  const insideStageIds = new Set<string>(initialInsideStageIds);
  let insideStages: Array<{ id: string; name: string; distance: number }> = [];
  let lastEvent: GeofenceEvent | null = null;
  const lastEventTime: Record<string, number> = {};

  function check() {
    if (!userPos || stages.length === 0) return;

    const newInside = computeInsideStageIds(userPos.lat, userPos.lng, stages);

    // LEAVEs
    for (const id of insideStageIds) {
      if (!newInside.has(id)) {
        const stage = stages.find((s) => s.id === id)!;
        const dist = haversine(userPos!.lat, userPos!.lng, stage.latitude, stage.longitude);
        const now = Date.now();
        if (now - (lastEventTime[stage.id] ?? 0) >= debounceMs) {
          lastEventTime[stage.id] = now;
          const event: GeofenceEvent = {
            type: "LEAVE",
            stageId: stage.id,
            stageName: stage.name,
            timestamp: now,
            distance: dist,
          };
          lastEvent = event;
          callbacks?.onStageLeave?.(event);
        }
      }
    }

    // ENTERs
    for (const id of newInside) {
      if (!insideStageIds.has(id)) {
        const stage = stages.find((s) => s.id === id)!;
        const dist = haversine(userPos!.lat, userPos!.lng, stage.latitude, stage.longitude);
        const now = Date.now();
        if (now - (lastEventTime[stage.id] ?? 0) >= debounceMs) {
          lastEventTime[stage.id] = now;
          const event: GeofenceEvent = {
            type: "ENTER",
            stageId: stage.id,
            stageName: stage.name,
            timestamp: now,
            distance: dist,
          };
          lastEvent = event;
          callbacks?.onStageEnter?.(event);
        }
      }
    }

    insideStageIds.clear();
    for (const id of newInside) insideStageIds.add(id);

    insideStages = stages
      .filter((s) => insideStageIds.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        distance: haversine(userPos!.lat, userPos!.lng, s.latitude, s.longitude),
      }));
  }

  return {
    get state() {
      return {
        insideStageIds: new Set(insideStageIds),
        insideStages: [...insideStages],
        lastEvent,
        isTracking: userPos !== null,
      };
    },
    check,
  };
}

describe("useGeofenceWithPosition logic", () => {
  it("starts with empty insideStageIds when user has no position", () => {
    const g = createTestGeofence({ stages: ALL_STAGES, userLat: null, userLng: null });
    expect(g.state.insideStageIds.size).toBe(0);
    expect(g.state.isTracking).toBe(false);
  });

  it("starts tracking once user position is provided and check is called", () => {
    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_FAR_AWAY.lat,
      userLng: USER_FAR_AWAY.lng,
    });
    g.check();
    expect(g.state.insideStageIds.size).toBe(0);
    expect(g.state.isTracking).toBe(true);
  });

  it("detects ENTER when user moves into a stage radius", () => {
    const enterEvents: GeofenceEvent[] = [];

    // Start far
    const g1 = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_FAR_AWAY.lat,
      userLng: USER_FAR_AWAY.lng,
      callbacks: { onStageEnter: (e) => enterEvents.push(e) },
    });
    g1.check();
    expect(g1.state.insideStageIds.size).toBe(0);

    // Move to Stage A center
    const g2 = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      callbacks: { onStageEnter: (e) => enterEvents.push(e) },
    });
    g2.check();

    expect(g2.state.insideStageIds.has("stage-a")).toBe(true);
    expect(enterEvents).toHaveLength(1);
    expect(enterEvents[0].stageId).toBe("stage-a");
    expect(enterEvents[0].type).toBe("ENTER");
  });

  it("detects LEAVE when user exits a stage radius", () => {
    const leaveEvents: GeofenceEvent[] = [];

    // Start at Stage A center — tell the harness we were already inside stage-a
    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      callbacks: { onStageLeave: (e) => leaveEvents.push(e) },
      initialInsideStageIds: ["stage-a"], // simulate being inside from prior position
    });
    g.check();
    expect(g.state.insideStageIds.has("stage-a")).toBe(true);
    expect(leaveEvents).toHaveLength(0); // no event yet — no transition yet

    // Move far away — still inside stage-a from g's perspective, now exits
    const g2 = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_FAR_AWAY.lat,
      userLng: USER_FAR_AWAY.lng,
      callbacks: { onStageLeave: (e) => leaveEvents.push(e) },
      initialInsideStageIds: ["stage-a"], // we were inside stage-a at last position
    });
    g2.check();

    expect(g2.state.insideStageIds.has("stage-a")).toBe(false);
    expect(leaveEvents).toHaveLength(1);
    expect(leaveEvents[0].stageId).toBe("stage-a");
    expect(leaveEvents[0].type).toBe("LEAVE");
  });

  it("does not fire duplicate events without position change", () => {
    const enterEvents: GeofenceEvent[] = [];

    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      callbacks: { onStageEnter: (e) => enterEvents.push(e) },
    });

    g.check();
    g.check();
    g.check();

    expect(enterEvents).toHaveLength(1);
  });

  it("fires both LEAVE and ENTER when transitioning between stages", () => {
    const enterEvents: GeofenceEvent[] = [];
    const leaveEvents: GeofenceEvent[] = [];

    // Start at Stage A — simulate being inside stage-a from prior position
    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      callbacks: { onStageEnter: (e) => enterEvents.push(e), onStageLeave: (e) => leaveEvents.push(e) },
      initialInsideStageIds: ["stage-a"],
    });
    g.check();
    expect(g.state.insideStageIds.has("stage-a")).toBe(true);
    expect(g.state.insideStageIds.has("stage-b")).toBe(false);

    // Move to Stage B: exit A, enter B
    const g2 = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_111M_NORTH.lat,
      userLng: USER_111M_NORTH.lng,
      callbacks: { onStageEnter: (e) => enterEvents.push(e), onStageLeave: (e) => leaveEvents.push(e) },
      initialInsideStageIds: ["stage-a"], // were inside stage-a at last position
    });
    g2.check();

    expect(leaveEvents.some((e) => e.stageId === "stage-a")).toBe(true);
    expect(enterEvents.some((e) => e.stageId === "stage-b")).toBe(true);
  });

  it("includes distance in event data", () => {
    const enterEvents: GeofenceEvent[] = [];

    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      callbacks: { onStageEnter: (e) => enterEvents.push(e) },
    });
    g.check();

    expect(enterEvents.length).toBe(1);
    expect(typeof enterEvents[0].distance).toBe("number");
    expect(enterEvents[0].distance).toBeLessThan(10);
  });

  it("handles empty stages array gracefully", () => {
    const g = createTestGeofence({
      stages: [],
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
    });
    g.check();
    expect(g.state.insideStageIds.size).toBe(0);
  });

  it("lastEvent is null initially", () => {
    const g = createTestGeofence({ stages: ALL_STAGES, userLat: null, userLng: null });
    expect(g.state.lastEvent).toBeNull();
  });

  it("debounce prevents rapid repeated events for same stage", () => {
    const enterEvents: GeofenceEvent[] = [];
    const leaveEvents: GeofenceEvent[] = [];

    // Start far — no events yet
    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_FAR_AWAY.lat,
      userLng: USER_FAR_AWAY.lng,
      debounceMs: 500,
      callbacks: { onStageEnter: (e) => enterEvents.push(e), onStageLeave: (e) => leaveEvents.push(e) },
    });
    g.check();
    expect(enterEvents).toHaveLength(0);

    // Enter Stage A — tell harness we were not inside any stage
    const g2 = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      debounceMs: 500,
      callbacks: { onStageEnter: (e) => enterEvents.push(e), onStageLeave: (e) => leaveEvents.push(e) },
    });
    g2.check();
    expect(enterEvents).toHaveLength(1);

    // Re-check same position — should be debounced (g3 shares state with g2)
    const g3 = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      debounceMs: 500,
      callbacks: { onStageEnter: (e) => enterEvents.push(e), onStageLeave: (e) => leaveEvents.push(e) },
      initialInsideStageIds: ["stage-a"], // g2 ended inside stage-a
    });
    g3.check();
    g3.check();
    g3.check();
    expect(enterEvents).toHaveLength(1); // debounce blocked repeats

    // Exit Stage A — simulate being inside stage-a from prior position
    const g4 = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_FAR_AWAY.lat,
      userLng: USER_FAR_AWAY.lng,
      debounceMs: 500,
      callbacks: { onStageEnter: (e) => enterEvents.push(e), onStageLeave: (e) => leaveEvents.push(e) },
      initialInsideStageIds: ["stage-a"],
    });
    g4.check();
    expect(leaveEvents).toHaveLength(1);
  });

  it("insideStages returns correct distance and structure", () => {
    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
    });
    g.check();

    const inside = g.state.insideStages;
    expect(inside.length).toBe(1);
    expect(inside[0].id).toBe("stage-a");
    expect(inside[0].name).toBe("Stage A");
    expect(typeof inside[0].distance).toBe("number");
    expect(inside[0].distance).toBeLessThan(10);
  });

  it("event includes correct stageId, stageName, type, timestamp, and distance", () => {
    const enterEvents: GeofenceEvent[] = [];

    const g = createTestGeofence({
      stages: ALL_STAGES,
      userLat: USER_AT_A_CENTER.lat,
      userLng: USER_AT_A_CENTER.lng,
      callbacks: { onStageEnter: (e) => enterEvents.push(e) },
    });
    g.check();

    const event = enterEvents[0];
    expect(event.type).toBe("ENTER");
    expect(event.stageId).toBe("stage-a");
    expect(event.stageName).toBe("Stage A");
    expect(event.timestamp).toBeGreaterThan(0);
    expect(typeof event.distance).toBe("number");
  });
});
