"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrackUpload } from "@/components/TrackUpload";
import { Button } from "@/components/ui/button";
import { Music, Loader2, Plus, X, Radio } from "lucide-react";
import { toast } from "sonner";

interface StageTrackUploaderProps {
  stageId: string;
}

interface TrackInfo {
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
}

export function StageTrackUploader({ stageId }: StageTrackUploaderProps) {
  const router = useRouter();
  const [showUploader, setShowUploader] = useState(false);
  const [uploadingToStage, setUploadingToStage] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<TrackInfo | null>(null);

  async function handleTrackUploaded(track: TrackInfo | null) {
    if (!track) {
      setPendingTrack(null);
      return;
    }
    setPendingTrack(track);
  }

  async function handleAddToStage() {
    if (!pendingTrack) return;

    setUploadingToStage(true);

    try {
      // Create track record and link to stage
      const res = await fetch(`/api/stages/${stageId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackUrl: pendingTrack.fileUrl,
          title: pendingTrack.originalName.replace(/\.[^/.]+$/, ""),
          mimeType: pendingTrack.mimeType,
          fileSize: pendingTrack.fileSize,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add track to stage");
      }

      toast.success("Track added to stage!");
      setPendingTrack(null);
      setShowUploader(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add track");
    } finally {
      setUploadingToStage(false);
    }
  }

  if (!showUploader) {
    return (
      <Button
        onClick={() => setShowUploader(true)}
        className="w-full h-10 bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 border border-violet-800/30 text-xs"
      >
        <Plus className="w-3 h-3 mr-1" /> Add Track
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
          <Music className="w-3 h-3" /> Upload Track
        </h3>
        <button
          onClick={() => { setShowUploader(false); setPendingTrack(null); }}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <TrackUpload onTrackUploaded={handleTrackUploaded} maxSizeMB={50} />

      {pendingTrack && (
        <div className="flex items-center gap-2">
          <div className="flex-1 text-xs text-zinc-400 truncate">
            {pendingTrack.originalName}
          </div>
          <Button
            size="sm"
            onClick={handleAddToStage}
            disabled={uploadingToStage}
            className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
          >
            {uploadingToStage ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Radio className="w-3 h-3 mr-1" />
            )}
            Add to Stage
          </Button>
        </div>
      )}
    </div>
  );
}
