"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Music, X, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function NewTrackPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("audio/")) setFile(f);
    else toast.error("Please drop an audio file.");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Please select an audio file."); return; }
    if (!title.trim()) { toast.error("Track title is required."); return; }

    setUploading(true);
    setUploadProgress(10);

    // Upload file
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/upload/audio", { method: "POST", body: formData });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      toast.error(err.error ?? "Upload failed.");
      setUploading(false);
      return;
    }
    setUploadProgress(60);

    const { data: uploadData } = await uploadRes.json();

    // Create track record
    const trackRes = await fetch("/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        artist: artist.trim() || "Unknown Artist",
        fileUrl: uploadData.fileUrl,
        mimeType: uploadData.mimeType,
        fileSize: uploadData.fileSize,
      }),
    });

    setUploadProgress(90);

    if (!trackRes.ok) {
      const err = await trackRes.json();
      toast.error(err.error ?? "Failed to save track.");
      setUploading(false);
      return;
    }

    setUploadProgress(100);
    setDone(true);
    toast.success("Track uploaded successfully!");

    // Trigger AI analysis in background
    const { data: trackData } = await trackRes.json();
    fetch("/api/ai/analyze-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: trackData.id }),
    }).catch(() => {});

    setTimeout(() => router.push("/musician/tracks"), 1500);
  }

  if (done) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96">
        <div className="w-16 h-16 rounded-full bg-green-950 border border-green-800/50 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Track uploaded!</h2>
        <p className="text-sm text-zinc-500 mt-1">Redirecting to your tracks…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold text-white mb-1">Upload Track</h1>
      <p className="text-sm text-zinc-500 mb-6">Add a new track to your Amplify catalog</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File dropzone */}
        <div>
          <Label className="text-zinc-300 text-xs tracking-wider uppercase mb-2 block">Audio File</Label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-150 ${
              file
                ? "border-violet-600/50 bg-violet-950/10"
                : "border-zinc-700 bg-zinc-900 hover:border-violet-700/50 hover:bg-zinc-900"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <Music className="w-8 h-8 text-violet-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-2 text-zinc-600 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Drop an audio file here or click to browse</p>
                <p className="text-xs text-zinc-600 mt-1">MP3, WAV, AAC, FLAC — up to 50MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-zinc-300 text-xs tracking-wider uppercase">Track Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midnight Frequency"
            required
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="artist" className="text-zinc-300 text-xs tracking-wider uppercase">Artist Name</Label>
          <Input
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Your artist name"
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-violet-500 h-11"
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-pink-600 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={uploading || !file}
          className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading…</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Upload Track</>
          )}
        </Button>
      </form>
    </div>
  );
}
