"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StageTrackUploader } from "@/components/stages/StageTrackUploader";
import { Music, Plus, Radio, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TrackSummary {
  id: string;
  title: string;
  artist: string;
  duration: number | null;
  bpm: number | null;
}

interface StageData {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  stageTrackLinks: { id: string; track: TrackSummary }[];
}

interface StageTracksSectionProps {
  stage: StageData;
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
              <Music className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{link.track.title}</p>
                <p className="text-xs text-zinc-500">{link.track.artist}</p>
              </div>
              {link.track.bpm && (
                <span className="text-xs text-zinc-600 font-mono">{Math.round(link.track.bpm)} BPM</span>
              )}
            </div>
          ))}
          <StageTrackUploader stageId={stage.id} />
        </div>
      )}
    </div>
  );
}
