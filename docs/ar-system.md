# AR System

The AR experience is the core of Amplify. It overlays 3D audio-reactive visualizations on a live camera feed, anchored to real-world GPS coordinates.

---

## Overview

1. The user opens `/ar` on their phone
2. The app requests camera and GPS permissions
3. `useGeolocation` begins watching the user's position
4. `useNearbyStages` polls `/api/ar/nearby` every 30s, updating `arStore`
5. When a stage is within its detection `radius`, the user can enter it
6. Entering a stage starts the `ARCanvas` render loop and `AudioEngine`
7. Visualizations render in Three.js, positioned relative to the user's GPS origin

---

## Coordinate System

GPS coordinates are converted to 3D world space using **ENU (East-North-Up)** mapping.

The user's current position is always the world origin `(0, 0, 0)`.

| Real-world direction | Three.js axis |
|---|---|
| East | +X |
| Up (altitude) | +Y |
| North | -Z |

This matches Three.js's default right-handed coordinate system where the camera looks down -Z.

### Key function: `gpsToWorldPosition`

Located in `src/lib/geo.ts`:

```ts
gpsToWorldPosition(
  userLat, userLng,         // user's current GPS position (world origin)
  stageLat, stageLng,       // stage GPS coordinates
  stageAltitude             // meters above sea level
): { x, y, z }
```

The delta between user and stage coordinates is converted to meters using the Haversine formula, then mapped to ENU axes.

### Visualization Offsets

Each `Visualization` has `offsetX/Y/Z` (in meters, ENU space) relative to the stage center. These are applied on top of the stage's world position when placing the Three.js object.

---

## Render Loop

`src/components/ar/ARCanvas.tsx` runs the main 60fps loop:

```
requestAnimationFrame
  ↓
Read locationStore (user position)
Read audioStore (beat data)
Read arStore (active stage + visualizations)
  ↓
Update each Visualization object
  ↓
renderer.render(scene, camera)
```

Stores are accessed via `getState()` — not React hooks — to avoid triggering React re-renders at 60fps:

```ts
// Correct: no React re-render
const { beatData } = useAudioStore.getState();
```

The camera feed from `getUserMedia` is rendered as a Three.js background texture behind all visualizations.

---

## Audio Engine

`AudioEngine` (referenced by `ARCanvas`) wires up the Web Audio API and Tone.js:

1. **`getUserMedia` audio** — or a track loaded via Tone.js `Player`
2. **`AnalyserNode`** — FFT size 2048, reads frequency data every frame
3. **Band splitting** — the frequency array is divided into bass / mid / treble ranges
4. **Beat detection** — Tone.js `Transport` fires beat events at the track's BPM
5. **`audioStore.setBeatData()`** — called every frame with current values

### BeatData shape

```ts
interface BeatData {
  bass: number;        // 0–1, low frequency energy
  mid: number;         // 0–1, mid frequency energy
  treble: number;      // 0–1, high frequency energy
  beat: boolean;       // true for exactly one frame on beat
  rms: number;         // 0–1, overall loudness
  waveform: Float32Array;  // time-domain samples for WAVEFORM_RIBBON
}
```

---

## Visualization Types

Each visualization reads from `beatData` based on its `reactToFrequency` setting and `reactIntensity` scale factor.

### PARTICLE_SYSTEM
Emits particles from a point. On beat, burst size and speed multiply. Config controls count, color, size, spread, lifetime, and beat multiplier.

### GEOMETRY_PULSE
A Three.js geometry (sphere, box, or torus) that scales up on beat and returns to resting size. Supports wireframe and emissive color. `pulseScale` sets the beat scaling factor; `rotationSpeed` applies continuous rotation.

### WAVEFORM_RIBBON
A ribbon mesh whose vertices are displaced by `beatData.waveform` (time-domain samples from the `AnalyserNode`). Gives a real-time oscilloscope visual tied to audio amplitude.

### FREQUENCY_BARS
Bars representing the frequency spectrum, arranged in a `line`, `arc`, or `circle` layout. Bar heights are driven by FFT magnitude at corresponding frequency bins.

### SHADER_EFFECT
Raw GLSL shaders. `configJson` contains `vertexShader`, `fragmentShader`, and `uniforms`. The audio band value (bass/mid/treble/rms) is injected as a `uAudio` uniform each frame.

### GLTF_ANIMATOR
Loads a `.glb` model from `assetUrl` and plays named animation clips. Animation playback speed is scaled by the selected audio band value.

### LIGHT_SHOW
Creates multiple colored `PointLight`s that orbit the stage center. Orbit radius and light intensity pulse with the audio band.

---

## Nearby Stage Discovery

`useNearbyStages(radius = 500)` in `src/hooks/useNearbyStages.ts`:

- Uses SWR to fetch `/api/ar/nearby?lat=...&lng=...&radius=...`
- Polls every **30 seconds** automatically
- Only re-fetches if the user has moved more than **50 meters** since the last fetch
- On success, calls `arStore.setNearbyStages(stages)`

A stage enters the "enterable" state when `distanceMeters <= stage.radius`. The default detection radius is **50 meters**.

---

## Permissions

The AR view requests two permissions on mount:

1. **Camera** — `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
2. **Geolocation** — `navigator.geolocation.watchPosition(...)`

If either is denied, the user sees an error state with instructions to grant access in browser settings. The app does not fall back to a non-AR mode.
