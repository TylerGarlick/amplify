"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Music, Loader2, CheckCircle, XCircle, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type WaveSurfer from "wavesurfer.js";

interface UploadedTrack {
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  title: string;
}

interface MusicUploaderProps {
  onTrackUploaded?: (track: UploadedTrack | null) => void;
  maxSizeMB?: number;
}

export function MusicUploader({ onTrackUploaded, maxSizeMB = 50 }: MusicUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedTrack, setUploadedTrack] = useState<UploadedTrack | null>(null);
  const [isGeneratingWaveform, setIsGeneratingWaveform] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Generate waveform using WaveSurfer.js
  const generateWaveform = useCallback(async (file: File) => {
    if (!waveformRef.current) return;

    setIsGeneratingWaveform(true);

    // Cleanup previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    try {
      const WaveSurfer = (await import("wavesurfer.js")).default;
      const audioUrl = URL.createObjectURL(file);
      audioUrlRef.current = audioUrl;

      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#7c3aed",
        progressColor: "#ec4899",
        cursorColor: "#ffffff",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 64,
        normalize: true,
        backend: "WebAudio",
        mediaControls: false,
        interact: true,
        hideScrollbar: true,
      });

      wavesurferRef.current = wavesurfer;

      await new Promise<void>((resolve, reject) => {
        wavesurfer.on("ready", () => {
          setIsGeneratingWaveform(false);
          resolve();
        });
        wavesurfer.on("error", (err) => {
          setIsGeneratingWaveform(false);
          reject(err);
        });
        wavesurfer.load(audioUrl);
      });

      wavesurfer.on("play", () => setIsPlaying(true));
      wavesurfer.on("pause", () => setIsPlaying(false));
    } catch (err) {
      console.error("Waveform generation failed:", err);
      setIsGeneratingWaveform(false);
      toast.warning("Could not generate waveform visualization");
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/ogg", "audio/flac", "audio/aac", "audio/m4a", "audio/mp4"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Use MP3, WAV, FLAC, OGG, or AAC.");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadedTrack(null);

    // Cleanup previous waveform
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/audio", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { data } = await res.json();
      const trackData = {
        ...data,
        title: file.name.replace(/\.[^/.]+$/, ""),
      };
      
      setUploadedTrack(trackData);
      onTrackUploaded?.(trackData);
      toast.success("Track uploaded successfully!");

      // Generate waveform
      await generateWaveform(file);
    } catch (err) {
      setProgress(0);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setUploadedTrack(null);
    setIsPlaying(false);
    onTrackUploaded?.(null);
  }

  if (uploadedTrack) {
    return (
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white truncate max-w-[200px]">{uploadedTrack.title}</p>
              <p className="text-xs text-zinc-500">{formatFileSize(uploadedTrack.fileSize)}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Waveform visualization with WaveSurfer.js */}
        <div className="relative">
          {isGeneratingWaveform ? (
            <div className="h-16 flex items-center justify-center gap-2 bg-zinc-800/30 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <span className="text-xs text-zinc-500">Generating waveform…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayback}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </button>
              <div ref={waveformRef} className="flex-1" />
            </div>
          )}
        </div>

        {/* Fallback audio element */}
        {uploadedTrack.fileUrl && !isGeneratingWaveform && (
          <audio
            controls
            className="w-full h-8 mt-1"
            src={uploadedTrack.fileUrl}
            preload="metadata"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
        id="audio-upload"
      />
      
      <label
        htmlFor="audio-upload"
        className={`
          flex flex-col items-center justify-center gap-3 p-6 
          rounded-xl border-2 border-dashed cursor-pointer 
          transition-all duration-200
          ${uploading 
            ? "border-zinc-700 bg-zinc-900/50 cursor-not-allowed" 
            : "border-zinc-700 hover:border-violet-500 hover:bg-zinc-900/50"
          }
        `}
      >
        {uploading ? (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Drop your track or click to upload</p>
              <p className="text-xs text-zinc-500 mt-1">MP3, WAV, FLAC, OGG up to {maxSizeMB}MB</p>
            </div>
          </>
        )}
      </label>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
