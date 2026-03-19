"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Music, Loader2, CheckCircle, XCircle, AudioLines } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface TrackUploadResult {
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
}

interface TrackUploadProps {
  onTrackUploaded?: (track: TrackUploadResult) => void;
  maxSizeMB?: number;
  accept?: string;
}

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/m4a",
  "audio/mp4",
];

export function TrackUpload({
  onTrackUploaded,
  maxSizeMB = 100,
  accept = ".mp3,.wav,.flac,.m4a,.aac,.ogg",
}: TrackUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedTrack, setUploadedTrack] = useState<TrackUploadResult | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateWaveform = useCallback(() => {
    const bars = 64;
    const data: number[] = [];
    for (let i = 0; i < bars; i++) {
      const x = i / bars;
      const envelope = Math.sin(x * Math.PI);
      const noise = Math.random() * 0.5 + 0.5;
      const beat = Math.sin(i / 8) * 0.3 + 0.7;
      data.push(Math.min(1, envelope * noise * beat + 0.2));
    }
    return data;
  }, []);

  useEffect(() => {
    if (uploadedTrack) {
      setWaveformData(generateWaveform());
    }
  }, [uploadedTrack, generateWaveform]);

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
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

      const res = await fetch("/api/tracks/upload", {
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
      const trackData: TrackUploadResult = {
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        originalName: data.originalName,
      };

      setUploadedTrack(trackData);
      onTrackUploaded?.(trackData);
      toast.success("Track uploaded successfully!");
    } catch (err) {
      setProgress(0);
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function validateAndUpload(file: File) {
    const validTypes = ALLOWED_TYPES;
    if (!validTypes.includes(file.type)) {
      const msg = "Invalid file type. Use MP3, WAV, FLAC, M4A, or AAC.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const msg = `File exceeds ${maxSizeMB}MB limit`;
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    uploadFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    validateAndUpload(file);
  }

  function handleRemove() {
    setUploadedTrack(null);
    setWaveformData([]);
    setError(null);
    onTrackUploaded?.(null as any);
  }

  function handleClick() {
    if (!uploading) {
      fileInputRef.current?.click();
    }
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
              <p className="text-sm font-medium text-white truncate max-w-[200px]">
                {uploadedTrack.originalName.replace(/\.[^/.]+$/, "")}
              </p>
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

        {/* Waveform visualization */}
        <div className="h-16 flex items-end justify-center gap-[2px] px-2">
          {waveformData.map((height, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-violet-600 to-pink-500 rounded-t"
              style={{
                height: `${height * 100}%`,
                opacity: 0.7 + height * 0.3,
              }}
            />
          ))}
        </div>

        <audio
          controls
          className="w-full h-8 mt-2"
          src={uploadedTrack.fileUrl}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        id="track-upload-input"
      />

      <label
        htmlFor="track-upload-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-3 p-6
          rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200 select-none
          ${isDragOver
            ? "border-violet-500 bg-violet-950/20"
            : uploading
            ? "border-zinc-700 bg-zinc-900/50 cursor-not-allowed"
            : error
            ? "border-red-800/50 bg-red-950/10 hover:border-red-700/50"
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
        ) : error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-950/50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-red-400">Upload failed</p>
              <p className="text-xs text-zinc-500 mt-1">{error}</p>
              <p className="text-xs text-zinc-600 mt-1">Click to try again</p>
            </div>
          </>
        ) : isDragOver ? (
          <>
            <div className="w-12 h-12 rounded-full bg-violet-600/30 flex items-center justify-center">
              <AudioLines className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-violet-400">Drop your track here</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Drop your track or click to upload</p>
              <p className="text-xs text-zinc-500 mt-1">MP3, WAV, FLAC, M4A up to {maxSizeMB}MB</p>
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
