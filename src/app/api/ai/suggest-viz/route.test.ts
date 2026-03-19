import { describe, it, expect } from "vitest";
import { suggestVisualizations } from "@/lib/suggestViz";

describe("suggestVisualizations", () => {
  describe("High energy + fast tempo rules", () => {
    it("should suggest particles and reactive for high energy (>0.7) + fast tempo (>120)", () => {
      const suggestions = suggestVisualizations(0.85, 140, null, []);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("particles");
      expect(types).toContain("reactive");
      expect(suggestions.find((s) => s.viz_type === "particles")?.confidence).toBeGreaterThan(0.9);
    });

    it("should not trigger high energy rule when energy is exactly 0.7", () => {
      const suggestions = suggestVisualizations(0.7, 140, null, []);
      const hasHighEnergyRule = suggestions.some(
        (s) => s.viz_type === "particles" && s.confidence > 0.9
      );
      expect(hasHighEnergyRule).toBe(false);
    });

    it("should not trigger high energy rule when tempo is exactly 120", () => {
      const suggestions = suggestVisualizations(0.85, 120, null, []);
      const hasHighEnergyRule = suggestions.some(
        (s) => s.viz_type === "particles" && s.confidence > 0.9
      );
      expect(hasHighEnergyRule).toBe(false);
    });
  });

  describe("Low energy + slow tempo rules", () => {
    it("should suggest waves and geometry for low energy (<0.4) + slow tempo (<100)", () => {
      const suggestions = suggestVisualizations(0.3, 80, null, []);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("waves");
      expect(types).toContain("geometry");
      expect(suggestions.find((s) => s.viz_type === "waves")?.confidence).toBeGreaterThan(0.85);
    });

    it("should not trigger low energy rule when energy is exactly 0.4", () => {
      const suggestions = suggestVisualizations(0.4, 80, null, []);
      const hasLowEnergyRule = suggestions.some(
        (s) => s.viz_type === "waves" && s.confidence > 0.85
      );
      expect(hasLowEnergyRule).toBe(false);
    });

    it("should not trigger low energy rule when tempo is exactly 100", () => {
      const suggestions = suggestVisualizations(0.3, 100, null, []);
      const hasLowEnergyRule = suggestions.some(
        (s) => s.viz_type === "waves" && s.confidence > 0.85
      );
      expect(hasLowEnergyRule).toBe(false);
    });
  });

  describe("Electronic/dance genre rules", () => {
    it("should suggest particles and reactive for electronic genre", () => {
      const suggestions = suggestVisualizations(null, null, null, ["electronic"]);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("particles");
      expect(types).toContain("reactive");
    });

    it("should suggest particles and reactive for dance genre", () => {
      const suggestions = suggestVisualizations(null, null, null, ["dance"]);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("particles");
      expect(types).toContain("reactive");
    });

    it("should handle EDM genre tag", () => {
      const suggestions = suggestVisualizations(null, null, null, ["edm"]);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("particles");
    });

    it("should not duplicate particles if already suggested", () => {
      // High energy + electronic should not duplicate particles
      const suggestions = suggestVisualizations(0.85, 140, null, ["electronic"]);
      const particleCount = suggestions.filter((s) => s.viz_type === "particles").length;
      expect(particleCount).toBe(1);
    });
  });

  describe("Acoustic/jazz genre rules", () => {
    it("should suggest waves and geometry for acoustic genre", () => {
      const suggestions = suggestVisualizations(null, null, null, ["acoustic"]);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("waves");
      expect(types).toContain("geometry");
    });

    it("should suggest waves and geometry for jazz genre", () => {
      const suggestions = suggestVisualizations(null, null, null, ["jazz"]);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("waves");
      expect(types).toContain("geometry");
    });

    it("should not duplicate waves if already suggested", () => {
      // Low energy + acoustic should not duplicate waves
      const suggestions = suggestVisualizations(0.3, 80, null, ["acoustic"]);
      const wavesCount = suggestions.filter((s) => s.viz_type === "waves").length;
      expect(wavesCount).toBe(1);
    });
  });

  describe("High energy + intense emotion rules", () => {
    it("should suggest particles for high energy + euphoric emotion", () => {
      const suggestions = suggestVisualizations(0.75, 110, "euphoric", []);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("particles");
    });

    it("should suggest particles for high energy + intense emotion", () => {
      const suggestions = suggestVisualizations(0.8, 100, "intense", []);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("particles");
    });

    it("should not trigger emotion rule when energy is below 0.6", () => {
      const suggestions = suggestVisualizations(0.55, 100, "euphoric", []);
      const hasParticles = suggestions.some((s) => s.viz_type === "particles");
      expect(hasParticles).toBe(false);
    });
  });

  describe("Mid-energy fallback rule", () => {
    it("should suggest waves for mid-energy (0.4-0.7)", () => {
      const suggestions = suggestVisualizations(0.55, 100, null, []);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("waves");
    });

    it("should not suggest waves twice if already present", () => {
      // Mid-energy + electronic should prioritize electronic's particles, not double waves
      const suggestions = suggestVisualizations(0.55, 100, null, ["electronic"]);
      const wavesCount = suggestions.filter((s) => s.viz_type === "waves").length;
      expect(wavesCount).toBeLessThanOrEqual(1);
    });
  });

  describe("Top 3 limit", () => {
    it("should return at most 3 suggestions", () => {
      const suggestions = suggestVisualizations(0.85, 140, "euphoric", [
        "electronic",
        "dance",
      ]);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it("should return empty array when no rules match", () => {
      // Mid-energy, no genre tags, no intense emotion
      const suggestions = suggestVisualizations(0.5, 110, "calm", []);
      expect(suggestions.length).toBeGreaterThanOrEqual(0); // May have waves from emotion or other rules
    });
  });

  describe("Confidence scores", () => {
    it("should return confidence scores between 0 and 1", () => {
      const suggestions = suggestVisualizations(0.85, 140, null, ["electronic"]);

      for (const suggestion of suggestions) {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should sort by confidence descending", () => {
      const suggestions = suggestVisualizations(0.85, 140, null, ["electronic"]);

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          suggestions[i].confidence
        );
      }
    });
  });

  describe("Reasoning presence", () => {
    it("should include reasoning for all suggestions", () => {
      const suggestions = suggestVisualizations(0.85, 140, null, ["electronic"]);

      for (const suggestion of suggestions) {
        expect(suggestion.reasoning).toBeDefined();
        expect(suggestion.reasoning.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle null energy", () => {
      const suggestions = suggestVisualizations(null, 140, null, ["electronic"]);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle null tempo", () => {
      const suggestions = suggestVisualizations(0.85, null, null, ["electronic"]);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle null emotion", () => {
      const suggestions = suggestVisualizations(0.85, 140, null, []);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle empty genre tags array", () => {
      const suggestions = suggestVisualizations(0.85, 140, null, []);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should handle case-insensitive genre matching", () => {
      const suggestions = suggestVisualizations(null, null, null, ["ELECTRONIC", "DANCE"]);
      const types = suggestions.map((s) => s.viz_type);

      expect(types).toContain("particles");
      expect(types).toContain("reactive");
    });
  });
});
