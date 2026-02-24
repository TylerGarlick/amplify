import { create } from "zustand";

interface LocationState {
  lat: number | null;
  lng: number | null;
  heading: number | null; // compass bearing 0–360
  accuracy: number | null;
  error: string | null;
  setLocation: (pos: GeolocationPosition) => void;
  setHeading: (degrees: number) => void;
  setError: (msg: string) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  heading: null,
  accuracy: null,
  error: null,

  setLocation: (pos) =>
    set({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading,
      accuracy: pos.coords.accuracy,
      error: null,
    }),

  setHeading: (degrees) => set({ heading: degrees }),

  setError: (msg) => set({ error: msg }),
}));
