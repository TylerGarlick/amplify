import { create } from "zustand";
import type { BeatData } from "@/types/ar";

interface AudioState {
  currentTrackId: string | null;
  isPlaying: boolean;
  beatData: BeatData | null;
  setCurrentTrack: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setBeatData: (data: BeatData) => void;
  emitBeat: () => void;
}

const DEFAULT_BEAT: BeatData = {
  bass: 0,
  mid: 0,
  treble: 0,
  beat: false,
  rms: 0,
  waveform: null,
};

export const useAudioStore = create<AudioState>((set, get) => ({
  currentTrackId: null,
  isPlaying: false,
  beatData: DEFAULT_BEAT,

  setCurrentTrack: (id) => set({ currentTrackId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setBeatData: (data) => set({ beatData: data }),

  // Called by Tone.js Transport on each quarter note.
  // Sets beat=true for one frame, then resets via rAF.
  emitBeat: () => {
    const current = get().beatData ?? DEFAULT_BEAT;
    set({ beatData: { ...current, beat: true } });
    requestAnimationFrame(() => {
      const after = get().beatData;
      if (after) set({ beatData: { ...after, beat: false } });
    });
  },
}));
