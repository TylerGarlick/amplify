import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createMusicianSchema = z.object({
  displayName: z.string().min(2),
  bio: z.string().optional(),
});

export const createTrackSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  fileUrl: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
});

export const createStageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional().default(0),
  radius: z.number().positive().optional().default(50),
  isPublic: z.boolean().optional().default(true),
});

const VISUALIZATION_TYPES = [
  "PARTICLE_SYSTEM",
  "GEOMETRY_PULSE",
  "WAVEFORM_RIBBON",
  "FREQUENCY_BARS",
  "SHADER_EFFECT",
  "GLTF_ANIMATOR",
  "LIGHT_SHOW",
] as const;

export const createVisualizationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(VISUALIZATION_TYPES),
  offsetX: z.number().optional().default(0),
  offsetY: z.number().optional().default(0),
  offsetZ: z.number().optional().default(0),
  rotationX: z.number().optional().default(0),
  rotationY: z.number().optional().default(0),
  rotationZ: z.number().optional().default(0),
  scaleX: z.number().positive().optional().default(1),
  scaleY: z.number().positive().optional().default(1),
  scaleZ: z.number().positive().optional().default(1),
  configJson: z.string(),
  assetUrl: z.string().optional(),
  reactToFrequency: z
    .enum(["bass", "mid", "treble", "all"])
    .optional()
    .default("bass"),
  reactIntensity: z.number().min(0).max(10).optional().default(1),
  aiPrompt: z.string().optional(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().optional().default(500),
});
