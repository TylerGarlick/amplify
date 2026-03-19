"use client";

import { useState } from "react";
import { Check, Sparkles, Activity, Waves, Box } from "lucide-react";
import { cn } from "@/lib/utils";

export type VizStyle = "particles" | "waves" | "geometry" | "reactive";

export interface VizStyleOption {
  id: VizStyle;
  name: string;
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  recommendedFor: string[];
}

const VIZ_STYLES: VizStyleOption[] = [
  {
    id: "particles",
    name: "Particles",
    description: "FLOATING ENERGY PARTICLES",
    icon: <Sparkles className="w-5 h-5" />,
    recommendedFor: ["ambient", "electronic", "chill"],
    preview: (
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-violet-950/50 to-transparent">
        {/* Particle dots */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-violet-400 animate-pulse"
              style={{
                left: `${15 + (i * 37) % 70}%`,
                top: `${20 + (i * 23) % 60}%`,
                animationDelay: `${i * 0.1}s`,
                opacity: 0.4 + (i % 3) * 0.2,
              }}
            />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`inner-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse"
              style={{
                left: `${25 + (i * 29) % 50}%`,
                top: `${30 + (i * 17) % 40}%`,
                animationDelay: `${i * 0.15}s`,
                opacity: 0.6 + (i % 2) * 0.2,
              }}
            />
          ))}
        </div>
        {/* Central glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-violet-500/30 blur-xl animate-pulse" />
        </div>
      </div>
    ),
  },
  {
    id: "waves",
    name: "Waves",
    description: "SOUND WAVES & RIBBONS",
    icon: <Waves className="w-5 h-5" />,
    recommendedFor: ["bass-heavy", "EDM", "concerts"],
    preview: (
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-cyan-950/50 to-transparent">
        {/* Wave lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M 0 ${20 + i * 6} Q 25 ${15 + i * 3 + (i % 2) * 8} 50 ${20 + i * 6} T 100 ${20 + i * 6}`}
              fill="none"
              stroke="rgba(34, 211, 238, 0.4)"
              strokeWidth={0.8 - i * 0.1}
              className="animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <path
              key={`inner-${i}`}
              d={`M 0 ${25 + i * 5} Q 30 ${30 + i * 2} 50 ${25 + i * 5} T 100 ${25 + i * 5}`}
              fill="none"
              stroke="rgba(6, 182, 212, 0.6)"
              strokeWidth={1 - i * 0.15}
              className="animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </svg>
        {/* Center line highlight */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
      </div>
    ),
  },
  {
    id: "geometry",
    name: "Geometry",
    description: "PULSING 3D SHAPES",
    icon: <Box className="w-5 h-5" />,
    recommendedFor: ["minimal", "techno", "geometric"],
    preview: (
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-pink-950/50 to-transparent">
        {/* Isometric cube */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative w-10 h-10"
            style={{
              transform: "rotateX(55deg) rotateZ(45deg)",
              animation: "spin 8s linear infinite",
            }}
          >
            {/* Top face */}
            <div
              className="absolute inset-0 bg-pink-500/40 border border-pink-400/60"
              style={{ transform: "translateZ(20px)" }}
            />
            {/* Front face */}
            <div
              className="absolute inset-0 bg-pink-600/50 border border-pink-400/40"
              style={{ transform: "rotateX(-90deg) translateZ(20px)" }}
            />
            {/* Right face */}
            <div
              className="absolute inset-0 bg-pink-700/50 border border-pink-400/30"
              style={{ transform: "rotateY(90deg) translateZ(20px)" }}
            />
            {/* Glow */}
            <div className="absolute inset-0 blur-lg bg-pink-500/30" />
          </div>
        </div>
        {/* Floating squares */}
        {[
          { left: "10%", top: "20%", size: 6, delay: "0s" },
          { left: "75%", top: "15%", size: 4, delay: "0.5s" },
          { left: "80%", top: "65%", size: 5, delay: "1s" },
          { left: "15%", top: "70%", size: 4, delay: "1.5s" },
        ].map((sq, i) => (
          <div
            key={i}
            className="absolute border border-pink-400/40 animate-pulse"
            style={{
              left: sq.left,
              top: sq.top,
              width: sq.size,
              height: sq.size,
              animationDelay: sq.delay,
              transform: `rotate(${i * 15}deg)`,
            }}
          />
        ))}
      </div>
    ),
  },
  {
    id: "reactive",
    name: "Reactive",
    description: "FULL AUDIO REACTIVITY",
    icon: <Activity className="w-5 h-5" />,
    recommendedFor: ["live", "interactive", "dynamic"],
    preview: (
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-amber-950/50 to-transparent">
        {/* Frequency bars */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-0.5 px-2">
          {Array.from({ length: 24 }).map((_, i) => {
            const heights = [30, 45, 60, 75, 90, 60, 45, 30, 15, 30, 45, 60, 75, 90, 75, 60, 45, 30, 15, 30, 45, 60, 45, 30];
            return (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-amber-500 to-amber-300 animate-pulse rounded-t-sm"
                style={{
                  height: `${heights[i] * 0.4}%`,
                  animationDelay: `${i * 0.05}s`,
                  opacity: 0.5 + (i % 4) * 0.1,
                }}
              />
            );
          })}
        </div>
        {/* Central orb */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-amber-400/60 blur-sm animate-pulse" />
        </div>
      </div>
    ),
  },
];

interface ARStageVizSelectorProps {
  selectedStyle: VizStyle | null;
  onSelect: (style: VizStyle) => void;
  disabled?: boolean;
  className?: string;
}

export function ARStageVizSelector({
  selectedStyle,
  onSelect,
  disabled = false,
  className,
}: ARStageVizSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 uppercase tracking-wider">
          Visualization Style
        </span>
        {selectedStyle && (
          <span className="text-xs text-violet-400 font-medium">
            {VIZ_STYLES.find((s) => s.id === selectedStyle)?.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {VIZ_STYLES.map((style) => {
          const isSelected = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onSelect(style.id)}
              disabled={disabled}
              className={cn(
                "group relative rounded-xl border overflow-hidden transition-all duration-200",
                "hover:border-zinc-600 hover:bg-zinc-900/50",
                isSelected
                  ? "border-violet-500 bg-violet-950/30 ring-1 ring-violet-500/50"
                  : "border-zinc-800 bg-zinc-900/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Preview thumbnail */}
              <div className="aspect-video w-full">{style.preview}</div>

              {/* Content overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Info section */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "transition-colors",
                      isSelected ? "text-violet-400" : "text-zinc-400"
                    )}
                  >
                    {style.icon}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isSelected ? "text-white" : "text-zinc-300"
                    )}
                  >
                    {style.name}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider leading-tight">
                  {style.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {style.recommendedFor.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      {selectedStyle && (
        <p className="text-xs text-zinc-500 text-center">
          Selected: {VIZ_STYLES.find((s) => s.id === selectedStyle)?.name} style.
          You can customize further in the visualization editor.
        </p>
      )}
    </div>
  );
}

export { VIZ_STYLES };
