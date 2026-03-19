/**
 * Track Analysis Service
 * AI-powered audio analysis pipeline to extract:
 * - tempo (BPM)
 * - key (musical key)
 * - energy (0-1)
 * - emotion (e.g., energetic, melancholic, euphoric)
 * - genreTags (array of genre strings)
 */

import { claude } from "@/lib/claude";

export interface TrackAnalysisResult {
  tempo: number | null;       // BPM
  key: string | null;          // Musical key (e.g., "C major", "F# minor")
  energy: number | null;       // 0-1 scale
  emotion: string | null;      // e.g., "energetic", "melancholic", "euphoric", "calm"
  genreTags: string[];         // e.g., ["electronic", "ambient", "upbeat"]
  aiDescription: string | null;
}

export interface AnalyzeTrackOptions {
  trackId: string;
  title: string;
  artist: string;
  fileUrl?: string;
  existingBpm?: number | null;
  existingKey?: string | null;
  existingEnergy?: number | null;
}

/**
 * Full analysis pipeline for a music track.
 * Uses AI (Claude) to analyze based on metadata and return structured results.
 * Returns all analysis fields.
 */
export async function analyzeTrack(options: AnalyzeTrackOptions): Promise<TrackAnalysisResult> {
  const { trackId, title, artist, existingBpm, existingKey, existingEnergy } = options;

  // Build analysis prompt with available metadata
  const metadataStr = [
    `Title: "${title}"`,
    `Artist: "${artist}"`,
    existingBpm ? `BPM: ${existingBpm}` : null,
    existingKey ? `Key: ${existingKey}` : null,
    existingEnergy != null ? `Energy: ${existingEnergy}` : null,
  ].filter(Boolean).join(", ");

  const response = await claude.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `You are a expert music analysis AI. Analyze the provided track metadata and return a complete structured analysis. Be precise and realistic based on the metadata. Return ONLY valid JSON, no markdown, no explanation.`,
    messages: [{
      role: "user",
      content: `Analyze this music track and return a complete JSON analysis:

${metadataStr}

Return JSON with this exact shape:
{
  "tempo": number or null,        // Estimated BPM (60-200 range)
  "key": string or null,           // Musical key (e.g., "C major", "A minor", "F# minor")
  "energy": number or null,        // Energy level 0.0 to 1.0
  "emotion": string or null,       // Primary emotion: "energetic" | "calm" | "euphoric" | "melancholic" | "dark" | "playful" | "romantic" | "aggressive"
  "genreTags": string[],           // Top 3-5 genre tags
  "aiDescription": string          // 1-2 sentence description of the track's sound and feel
}`
    }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";

  // Parse JSON response
  let parsed: Partial<TrackAnalysisResult> = {};
  try {
    // Try to extract JSON from response (in case of extra text)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall back to defaults
  }

  const result: TrackAnalysisResult = {
    tempo: typeof parsed.tempo === "number" ? parsed.tempo : existingBpm ?? null,
    key: parsed.key ?? existingKey ?? null,
    energy: typeof parsed.energy === "number" ? Math.max(0, Math.min(1, parsed.energy)) : existingEnergy ?? null,
    emotion: parsed.emotion ?? null,
    genreTags: Array.isArray(parsed.genreTags) ? parsed.genreTags.slice(0, 5) : [],
    aiDescription: parsed.aiDescription ?? null,
  };

  return result;
}

/**
 * Quick genre classification only (lighter weight analysis)
 */
export async function classifyGenre(title: string, artist: string, description?: string): Promise<string[]> {
  try {
    const response = await claude.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 256,
      system: "You are a music genre classification expert. Return ONLY a JSON array of genre tags, no explanation.",
      messages: [{
        role: "user",
        content: `Classify the genre tags for this track: Title="${title}", Artist="${artist}"${description ? `, Description="${description}"` : ""}. Return a JSON array of 2-5 genre strings (e.g., ["electronic", "ambient", "upbeat"]).`
      }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = rawText.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (err) {
    console.error("[classifyGenre] error:", err);
  }
  return [];
}
