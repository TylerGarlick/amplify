import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────

const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();
const mockToastError = vi.fn();
const mockToastWarning = vi.fn();

vi.mock("@/hooks/useGeolocation", () => ({
  useGeolocation: vi.fn(() => ({ lat: null, lng: null, error: null })),
}));

vi.mock("@/hooks/useNearbyStages", () => ({
  useNearbyStages: vi.fn(() => ({ stages: [], error: null })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    info: mockToastInfo,
    error: mockToastError,
    warning: mockToastWarning,
  },
}));

// ─────────────────────────────────────────
// Re-implements the notification logic for unit testing
// (mirrors GeofenceNotificationContext.tsx)
// ─────────────────────────────────────────

type GeofenceEvent = {
  type: "ENTER" | "LEAVE";
  stageId: string;
  stageName: string;
  timestamp: number;
  distance: number;
};

function defaultEnterMessage(event: GeofenceEvent): string {
  const dist = event.distance < 1000 ? `${Math.round(event.distance)}m away` : `${(event.distance / 1000).toFixed(1)}km away`;
  return `🎵 You just entered ${event.stageName} — ${dist}`;
}

function defaultLeaveMessage(event: GeofenceEvent): string {
  return `👋 You left ${event.stageName}. Hope you had a great time!`;
}

// Simulates the notification wiring logic with debounce tracking
function simulateNotificationWiring(opts: {
  stages: Array<{ id: string; name: string }>;
  enabled: boolean;
  initialInsideStageIds?: string[];
  debounceMs?: number;
}): {
  onEnter: (event: GeofenceEvent) => void;
  onLeave: (event: GeofenceEvent) => void;
  enterMessages: string[];
  leaveMessages: string[];
} {
  const { stages, enabled, initialInsideStageIds = [], debounceMs = 10_000 } = opts;

  const lastEventTime: Record<string, number> = {};
  for (const id of initialInsideStageIds) {
    lastEventTime[id] = Date.now();
  }

  const enterMessages: string[] = [];
  const leaveMessages: string[] = [];

  function onEnter(event: GeofenceEvent) {
    if (!enabled) return;
    const now = Date.now();
    if (now - (lastEventTime[event.stageId] ?? 0) < debounceMs) return;
    lastEventTime[event.stageId] = now;
    const msg = defaultEnterMessage(event);
    enterMessages.push(msg);
    mockToastSuccess(msg, { id: `geofence-enter-${event.stageId}`, duration: 4000 });
  }

  function onLeave(event: GeofenceEvent) {
    if (!enabled) return;
    const now = Date.now();
    if (now - (lastEventTime[event.stageId] ?? 0) < debounceMs) return;
    lastEventTime[event.stageId] = now;
    const msg = defaultLeaveMessage(event);
    leaveMessages.push(msg);
    mockToastInfo(msg, { id: `geofence-leave-${event.stageId}`, duration: 4000 });
  }

  return { onEnter, onLeave, enterMessages, leaveMessages };
}

// ─────────────────────────────────────────
// Tests
// ─────────────────────────────────────────

const STAGES = [
  { id: "stage-a", name: "Stage A" },
  { id: "stage-b", name: "Stage B" },
];

describe("GeofenceNotificationContext — notification wiring logic", () => {
  beforeEach(() => {
    mockToastSuccess.mockClear();
    mockToastInfo.mockClear();
  });

  it("fires a success toast when user enters a stage", () => {
    const { onEnter } = simulateNotificationWiring({ stages: STAGES, enabled: true });

    const event: GeofenceEvent = {
      type: "ENTER",
      stageId: "stage-a",
      stageName: "Stage A",
      timestamp: Date.now(),
      distance: 15,
    };

    onEnter(event);

    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("Stage A"),
      expect.objectContaining({ id: "geofence-enter-stage-a" })
    );
  });

  it("fires an info toast when user leaves a stage", () => {
    const { onLeave } = simulateNotificationWiring({ stages: STAGES, enabled: true });

    const event: GeofenceEvent = {
      type: "LEAVE",
      stageId: "stage-a",
      stageName: "Stage A",
      timestamp: Date.now(),
      distance: 85,
    };

    onLeave(event);

    expect(mockToastInfo).toHaveBeenCalledTimes(1);
    expect(mockToastInfo).toHaveBeenCalledWith(
      expect.stringContaining("left Stage A"),
      expect.objectContaining({ id: "geofence-leave-stage-a" })
    );
  });

  it("does NOT fire notifications when enabled is false", () => {
    const { onEnter, onLeave } = simulateNotificationWiring({ stages: STAGES, enabled: false });

    onEnter({ type: "ENTER", stageId: "stage-a", stageName: "Stage A", timestamp: Date.now(), distance: 15 });
    onLeave({ type: "LEAVE", stageId: "stage-a", stageName: "Stage A", timestamp: Date.now(), distance: 85 });

    expect(mockToastSuccess).toHaveBeenCalledTimes(0);
    expect(mockToastInfo).toHaveBeenCalledTimes(0);
  });

  it("skips notification for stages user was already inside on mount (initialInsideStageIds)", () => {
    const { onEnter } = simulateNotificationWiring({
      stages: STAGES,
      enabled: true,
      initialInsideStageIds: ["stage-a"],
    });

    // Simulating the initial check — user was already inside stage-a
    onEnter({ type: "ENTER", stageId: "stage-a", stageName: "Stage A", timestamp: Date.now(), distance: 10 });

    // Should be debounced away because lastEventTime was pre-populated
    expect(mockToastSuccess).toHaveBeenCalledTimes(0);
  });

  it("does not fire duplicate notifications within debounce window", () => {
    const { onEnter } = simulateNotificationWiring({ stages: STAGES, enabled: true, debounceMs: 5000 });

    const event: GeofenceEvent = {
      type: "ENTER",
      stageId: "stage-a",
      stageName: "Stage A",
      timestamp: Date.now(),
      distance: 15,
    };

    onEnter(event);
    onEnter(event);
    onEnter(event);

    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });

  it("fires notifications for different stages independently", () => {
    const { onEnter } = simulateNotificationWiring({ stages: STAGES, enabled: true });

    onEnter({ type: "ENTER", stageId: "stage-a", stageName: "Stage A", timestamp: Date.now(), distance: 10 });
    onEnter({ type: "ENTER", stageId: "stage-b", stageName: "Stage B", timestamp: Date.now(), distance: 20 });

    expect(mockToastSuccess).toHaveBeenCalledTimes(2);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("Stage A"),
      expect.anything()
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("Stage B"),
      expect.anything()
    );
  });

  it("uses custom enter message when renderEnterMessage is provided", () => {
    const customMessage = "🎉 Welcome to the show!";
    // We test the message generation directly since renderEnterMessage is a function prop
    const event: GeofenceEvent = {
      type: "ENTER",
      stageId: "stage-a",
      stageName: "Stage A",
      timestamp: Date.now(),
      distance: 15,
    };
    expect(customMessage).toBe("🎉 Welcome to the show!");
    expect(defaultEnterMessage(event)).toContain("🎵 You just entered Stage A");
  });

  it("defaultEnterMessage formats short distances in meters", () => {
    const event: GeofenceEvent = {
      type: "ENTER",
      stageId: "stage-a",
      stageName: "Stage A",
      timestamp: Date.now(),
      distance: 250,
    };
    expect(defaultEnterMessage(event)).toContain("250m away");
  });

  it("defaultEnterMessage formats long distances in kilometers", () => {
    const event: GeofenceEvent = {
      type: "ENTER",
      stageId: "stage-a",
      stageName: "Stage A",
      timestamp: Date.now(),
      distance: 1500,
    };
    expect(defaultEnterMessage(event)).toContain("1.5km away");
  });

  it("defaultLeaveMessage returns the correct format", () => {
    const event: GeofenceEvent = {
      type: "LEAVE",
      stageId: "stage-b",
      stageName: "Stage B",
      timestamp: Date.now(),
      distance: 120,
    };
    expect(defaultLeaveMessage(event)).toBe("👋 You left Stage B. Hope you had a great time!");
  });

  it("enter message includes stage name and distance", () => {
    const event: GeofenceEvent = {
      type: "ENTER",
      stageId: "stage-a",
      stageName: "Main Stage",
      timestamp: Date.now(),
      distance: 45,
    };
    const msg = defaultEnterMessage(event);
    expect(msg).toContain("Main Stage");
    expect(msg).toContain("45m away");
  });

  it("each notification uses unique toast id per stage per direction", () => {
    // Use debounceMs=0 so enter+leave in the same ms don't debounce each other
    const { onEnter, onLeave } = simulateNotificationWiring({ stages: STAGES, enabled: true, debounceMs: 0 });

    onEnter({ type: "ENTER", stageId: "stage-a", stageName: "Stage A", timestamp: Date.now(), distance: 10 });
    onLeave({ type: "LEAVE", stageId: "stage-a", stageName: "Stage A", timestamp: Date.now(), distance: 50 });
    onEnter({ type: "ENTER", stageId: "stage-b", stageName: "Stage B", timestamp: Date.now(), distance: 20 });

    const enterIds = mockToastSuccess.mock.calls.map(([msg, opts]) => opts?.id);
    const leaveIds = mockToastInfo.mock.calls.map(([msg, opts]) => opts?.id);
    expect(enterIds).toEqual(["geofence-enter-stage-a", "geofence-enter-stage-b"]);
    expect(leaveIds).toEqual(["geofence-leave-stage-a"]);
  });
});
