"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Music, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MusicianRow {
  id: string;
  userId: string;
  displayName: string;
  status: string;
  createdAt: Date;
  user: { email: string; name: string | null };
  _count: { tracks: number; stages: number };
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-950 text-green-400 border-green-800/50",
  PENDING: "bg-yellow-950 text-yellow-400 border-yellow-800/50",
  SUSPENDED: "bg-red-950 text-red-400 border-red-800/50",
};

export function MusiciansAdminClient({ musicians: initial }: { musicians: MusicianRow[] }) {
  const [musicians, setMusicians] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function setStatus(musicianId: string, userId: string, approve: boolean) {
    setLoading(musicianId);
    const res = await fetch("/api/admin/approve-musician", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: approve ? "approve" : "suspend" }),
    });
    setLoading(null);
    if (!res.ok) { toast.error("Failed."); return; }
    const newStatus = approve ? "APPROVED" : "SUSPENDED";
    setMusicians((prev) => prev.map((m) => (m.id === musicianId ? { ...m, status: newStatus } : m)));
    toast.success(approve ? "Musician approved!" : "Musician suspended.");
  }

  return (
    <div className="space-y-3">
      {musicians.map((musician) => (
        <div key={musician.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {musician.displayName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{musician.displayName}</p>
            <p className="text-xs text-zinc-500">{musician.user.email}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                <Music className="w-3 h-3" /> {musician._count.tracks} tracks
              </span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                <MapPin className="w-3 h-3" /> {musician._count.stages} stages
              </span>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLORS[musician.status] ?? STATUS_COLORS.PENDING}`}>
            {musician.status}
          </span>
          <div className="flex gap-2 flex-shrink-0">
            {musician.status !== "APPROVED" && (
              <Button
                size="sm"
                className="h-7 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-800/30"
                onClick={() => setStatus(musician.id, musician.userId, true)}
                disabled={loading === musician.id}
              >
                {loading === musician.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
              </Button>
            )}
            {musician.status !== "SUSPENDED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-red-800/50 text-red-400 hover:bg-red-950/30"
                onClick={() => setStatus(musician.id, musician.userId, false)}
                disabled={loading === musician.id}
              >
                Suspend
              </Button>
            )}
          </div>
        </div>
      ))}
      {musicians.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No musicians yet.</p>
        </div>
      )}
    </div>
  );
}
