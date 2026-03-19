/**
 * Pure function to suggest AR visualization types based on track audio analysis.
 * No external dependencies - can be used in tests and API routes.
 */

export interface VizSuggestion {
  viz_type: string;
  confidence: number;
  reasoning: string;
}

export function suggestVisualizations(
  energy: number | null,
  tempo: number | null,
  emotion: string | null,
  genreTags: string[]
): VizSuggestion[] {
  const suggestions: VizSuggestion[] = [];

  const hasElectronicGenre = genreTags.some((g) =>
    /^(electronic|dance|edm|house|techno|trance|dubstep|synth|electro|disco)$/i.test(g)
  );
  const hasAcousticGenre = genreTags.some((g) =>
    /^(acoustic|jazz|classical|folk|swing|bebop|bossa\s*nova)$/i.test(g)
  );
  const hasIntenseEmotion =
    emotion && /^(euphoric|intense|energetic|aggressive|powerful|excited)$/i.test(emotion);

  // Rule: High energy (>0.7) + fast tempo (>120) → "particles" or "reactive"
  if (energy !== null && energy > 0.7 && tempo !== null && tempo > 120) {
    suggestions.push({
      viz_type: "particles",
      confidence: 0.92,
      reasoning: `High energy (${(energy * 100).toFixed(0)}%) combined with fast tempo (${tempo} BPM) creates intense, dynamic visuals best represented by a particle system.`,
    });
    suggestions.push({
      viz_type: "reactive",
      confidence: 0.85,
      reasoning: `Fast, high-energy track with ${tempo} BPM and ${(energy * 100).toFixed(0)}% energy responds well to reactive visualization that pulses with the beat.`,
    });
  }

  // Rule: Low energy (<0.4) + slow tempo (<100) → "waves" or "geometry"
  if (energy !== null && energy < 0.4 && tempo !== null && tempo < 100) {
    suggestions.push({
      viz_type: "waves",
      confidence: 0.9,
      reasoning: `Low energy (${(energy * 100).toFixed(0)}%) and slow tempo (${tempo} BPM) call for calming, flowing wave visualizations.`,
    });
    suggestions.push({
      viz_type: "geometry",
      confidence: 0.8,
      reasoning: `Minimalist, slow-paced track suits geometric shapes that evolve gently over time.`,
    });
  }

  // Rule: Electronic/dance genre → "particles" or "reactive"
  if (hasElectronicGenre) {
    if (!suggestions.find((s) => s.viz_type === "particles")) {
      suggestions.push({
        viz_type: "particles",
        confidence: 0.88,
        reasoning: `Electronic/dance genre detected, best visualized with dynamic particle systems that react to synthesizer rhythms.`,
      });
    }
    if (!suggestions.find((s) => s.viz_type === "reactive")) {
      suggestions.push({
        viz_type: "reactive",
        confidence: 0.82,
        reasoning: `Dance music pairs well with beat-reactive effects that pulse with bass and drums.`,
      });
    }
  }

  // Rule: Acoustic/jazz genre → "waves" or "geometry"
  if (hasAcousticGenre) {
    if (!suggestions.find((s) => s.viz_type === "waves")) {
      suggestions.push({
        viz_type: "waves",
        confidence: 0.87,
        reasoning: `Acoustic/jazz ambiance is best captured by smooth, organic wave patterns.`,
      });
    }
    if (!suggestions.find((s) => s.viz_type === "geometry")) {
      suggestions.push({
        viz_type: "geometry",
        confidence: 0.75,
        reasoning: `Jazz harmonies and complex chord progressions complement evolving geometric structures.`,
      });
    }
  }

  // Rule: High energy + emotional "euphoric" or "intense" → "particles"
  if (energy !== null && energy > 0.6 && hasIntenseEmotion) {
    if (!suggestions.find((s) => s.viz_type === "particles")) {
      suggestions.push({
        viz_type: "particles",
        confidence: 0.89,
        reasoning: `High energy with ${emotion} emotion calls for explosive particle effects that match the intensity.`,
      });
    }
  }

  // Rule: Mid-energy + any tempo → "waves"
  if (
    energy !== null &&
    energy >= 0.4 &&
    energy <= 0.7 &&
    !suggestions.some((s) => s.viz_type === "waves")
  ) {
    suggestions.push({
      viz_type: "waves",
      confidence: 0.78,
      reasoning: `Mid-energy track (${(energy * 100).toFixed(0)}%) suits balanced wave visualizations that adapt to any tempo.`,
    });
  }

  // Sort by confidence descending and return top 3
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
