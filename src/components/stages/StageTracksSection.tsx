"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StageTrackUploader } from "@/components/stages/StageTrackUploader";
import { Music, Plus, Radio, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface TrackSummary {
  id: string;
  title: string;
  artist: string;
  duration: number | null;
  bpm: number | null;
  fileUrl: string | null;
}

interface StageData {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  stageTrackLinks: { id: string; track: TrackSummary; loopMode?: string }[];
}

interface StageTracksSectionProps {
  stage: StageData;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || isNaN(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StageTracksSection({ stage }: StageTracksSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
          <Radio className="w-3 h-3" /> Tracks ({stage.stageTrackLinks.length})
        </h2>
      </div>
      {stage.stageTrackLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-zinc-600 text-sm mb-3">No tracks linked to this stage yet.</p>
          <StageTrackUploader stageId={stage.id} />
        </div>
      ) : (
        <div className="space-y-2">
          {stage.stageTrackLinks.map((link) => (
            <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              {/* Play button or no-URL placeholder */}
              {link.track.fileUrl ? (
                <button
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600/30 hover:bg-violet-600/50 flex items-center justify-center transition-colors"
                  title={`Play ${link.track.title}`}
                  onClick={() => {
                    const audio = new Audio(link.track.fileUrl!);
                    audio.play().catch(() => toast.error("Playback failed"));
                  }}
                >
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none" className="ml-0.5">
                    <path d="M1 1.5L9 6L1 10.5V1.5Z" fill="currentColor" className="text-violet-300" />
                  </svg>
                </button>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center" title="No audio URL">
                  <span className="text-xs text-zinc-600">—</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{link.track.title}</p>
                <p className="text-xs text-zinc-500">{link.track.artist}</p>
              </div>
              {link.track.bpm && (
                <span className="text-xs text-zinc-600 font-mono">{Math.round(link.track.bpm)} BPM</span>
              )}
              <span className="text-xs text-zinc-600 font-mono tabular-nums">
                {formatDuration(link.track.duration)}
              </span>
            </div>
          ))}
          <StageTrackUploader stageId={stage.id} />
        </div>
      )}
    </div>
  );
}
