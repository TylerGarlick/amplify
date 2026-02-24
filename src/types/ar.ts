// ─────────────────────────────────────────
// Visualization type enum (mirrors DB string field)
// ─────────────────────────────────────────

export type VisualizationType =
  | "PARTICLE_SYSTEM"
  | "GEOMETRY_PULSE"
  | "WAVEFORM_RIBBON"
  | "FREQUENCY_BARS"
  | "SHADER_EFFECT"
  | "GLTF_ANIMATOR"
  | "LIGHT_SHOW";

// ─────────────────────────────────────────
// Per-type configuration shapes (stored as JSON in Visualization.configJson)
// ─────────────────────────────────────────

export interface ParticleSystemConfig {
  count: number;         // 100–5000 particles
  color: string;         // hex color, e.g. "#ff00ff"
  size: number;          // particle point size, 0.1–2.0
  spread: number;        // emission sphere radius in meters
  lifetime: number;      // particle TTL in seconds
  beatMultiplier: number; // emission spike on beat event
}

export interface GeometryPulseConfig {
  geometry: "sphere" | "icosahedron" | "torus" | "box" | "octahedron";
  color: string;
  emissiveColor: string;
  wireframe: boolean;
  pulseScale: number;    // max scale multiplier on beat
  rotationSpeed: number; // base radians/sec rotation
}

export interface WaveformRibbonConfig {
  color: string;
  width: number;         // ribbon width in meters
  segments: number;      // number of path points (8–128)
  radius: number;        // how far the ribbon extends from center
}

export interface FrequencyBarsConfig {
  count: number;         // number of frequency bins to render (8–64)
  color: string;
  maxHeight: number;     // max bar height in meters
  arrangement: "line" | "arc" | "circle";
}

export interface ShaderEffectConfig {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, number | string | number[]>;
}

export interface GLTFAnimatorConfig {
  animationName: string; // animation clip name from the .glb
  baseScale: number;
}

export interface LightShowConfig {
  lights: Array<{
    type: "point" | "spot";
    color: string;
    intensity: number;
    orbitRadius: number;
    orbitSpeed: number;  // radians/sec
    reactTo: "bass" | "mid" | "treble" | "beat";
  }>;
}

export type VisualizationConfig =
  | ParticleSystemConfig
  | GeometryPulseConfig
  | WaveformRibbonConfig
  | FrequencyBarsConfig
  | ShaderEffectConfig
  | GLTFAnimatorConfig
  | LightShowConfig;

// ─────────────────────────────────────────
// Enriched types returned from API
// ─────────────────────────────────────────

export interface VisualizationWithConfig {
  id: string;
  stageId: string;
  name: string;
  type: VisualizationType;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  configJson: string;
  config: VisualizationConfig; // parsed from configJson
  assetUrl: string | null;
  reactToFrequency: string;
  reactIntensity: number;
  sortOrder: number;
  isVisible: boolean;
}

export interface StageWithVisualizations {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  altitude: number;
  radius: number;
  musician: { displayName: string };
  visualizations: VisualizationWithConfig[];
  activeTrack: {
    id: string;
    title: string;
    artist: string;
    fileUrl: string;
    bpm: number | null;
  } | null;
  distanceMeters?: number; // populated client-side
}

// ─────────────────────────────────────────
// Audio reactivity data (read every frame by ARVisualization)
// ─────────────────────────────────────────

export interface BeatData {
  bass: number;      // 0–1 normalized
  mid: number;       // 0–1 normalized
  treble: number;    // 0–1 normalized
  beat: boolean;     // true for exactly one frame on each beat
  rms: number;       // overall volume 0–1
  waveform: Float32Array | null; // time-domain samples (for WAVEFORM_RIBBON)
}

// ─────────────────────────────────────────
// World-space position (Three.js ENU local coords)
// ─────────────────────────────────────────

export interface WorldPosition {
  x: number; // East (meters)
  y: number; // Up (meters)
  z: number; // -North (meters, Three.js convention)
}
