# State Management

Amplify uses **Zustand** for client-side state. Three stores cover the three real-time data domains: location, audio, and AR session.

---

## Stores

### `locationStore` — GPS State

`src/stores/locationStore.ts`

```ts
interface LocationState {
  lat: number | null;
  lng: number | null;
  heading: number | null;    // compass degrees, 0 = North
  accuracy: number | null;   // meters
  error: string | null;
  setLocation(pos: GeolocationPosition): void;
  setHeading(degrees: number): void;
  setError(msg: string): void;
}
```

Updated by `useGeolocation` hook whenever the device reports a new GPS position. The AR render loop reads this to compute stage world positions each frame.

---

### `audioStore` — Audio / Beat State

`src/stores/audioStore.ts`

```ts
interface AudioState {
  currentTrackId: string | null;
  isPlaying: boolean;
  beatData: BeatData;
  setCurrentTrack(id: string | null): void;
  setIsPlaying(playing: boolean): void;
  setBeatData(data: BeatData): void;
  emitBeat(): void;  // sets beat=true for one render frame
}

interface BeatData {
  bass: number;           // 0–1
  mid: number;            // 0–1
  treble: number;         // 0–1
  beat: boolean;          // true for one frame on beat event
  rms: number;            // 0–1, overall volume
  waveform: Float32Array; // time-domain audio samples
}
```

`AudioEngine` calls `setBeatData()` every animation frame with fresh FFT analysis. `emitBeat()` is called by the Tone.js Transport on each scheduled beat — it sets `beat: true`, which the render loop reads on that frame, then resets to `false` next frame.

---

### `arStore` — AR Session State

`src/stores/arStore.ts`

```ts
interface ARState {
  activeStageId: string | null;
  sessionActive: boolean;
  nearbyStages: StageWithVisualizations[];
  setNearbyStages(stages: StageWithVisualizations[]): void;
  enterStage(stageId: string): void;
  exitStage(): void;
  setSessionActive(active: boolean): void;
}
```

`useNearbyStages` hook updates `nearbyStages` when the API returns results. The AR view calls `enterStage` when the user taps a stage card, and `exitStage` when they leave.

---

## Critical Pattern: Render Loop Access

React hooks cannot be called inside `requestAnimationFrame` callbacks. To read store values in the 60fps render loop without causing React re-renders, use `getState()`:

```ts
// Inside ARCanvas render loop — CORRECT
function renderFrame() {
  const { lat, lng } = useLocationStore.getState();
  const { beatData } = useAudioStore.getState();
  const { nearbyStages, activeStageId } = useARStore.getState();

  // ... update Three.js objects
  requestAnimationFrame(renderFrame);
}
```

```ts
// In a React component — CORRECT (subscribe to re-renders)
function StageInfo() {
  const nearbyStages = useARStore((s) => s.nearbyStages);
  return <div>{nearbyStages.length} stages nearby</div>;
}
```

Using `useXxxStore()` hooks in a render loop would call React hooks outside the component tree and trigger thousands of state subscriptions per second.

---

## Data Flow

```
GPS position
  → useGeolocation hook
  → locationStore.setLocation()
  → (render loop reads via getState)
  → Three.js camera / stage positions update

Audio frame
  → AudioEngine AnalyserNode FFT
  → audioStore.setBeatData()
  → (render loop reads via getState)
  → visualization uniforms / scales update

Nearby stages
  → useNearbyStages SWR hook (every 30s)
  → arStore.setNearbyStages()
  → ARViewClient re-renders stage cards
  → (render loop reads active stage via getState)
```
