import { create } from "zustand";
import type { StageWithVisualizations } from "@/types/ar";

interface ARState {
  activeStageId: string | null;
  sessionActive: boolean;
  nearbyStages: StageWithVisualizations[];
  setNearbyStages: (stages: StageWithVisualizations[]) => void;
  enterStage: (stageId: string) => void;
  exitStage: () => void;
  setSessionActive: (active: boolean) => void;
}

export const useARStore = create<ARState>((set) => ({
  activeStageId: null,
  sessionActive: false,
  nearbyStages: [],

  setNearbyStages: (stages) => set({ nearbyStages: stages }),
  enterStage: (stageId) => set({ activeStageId: stageId }),
  exitStage: () => set({ activeStageId: null }),
  setSessionActive: (active) => set({ sessionActive: active }),
}));
