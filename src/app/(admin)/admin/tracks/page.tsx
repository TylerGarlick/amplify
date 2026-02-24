import { prisma } from "@/lib/prisma";
import { Music, Clock, CheckCircle, AlertCircle, Loader } from "lucide-react";

function formatDuration(s: number | null) {
  if (!s) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default async function AdminTracksPage() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    include: { musician: { select: { displayName: true } } },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Tracks</h1>
        <p className="text-sm text-zinc-500">{tracks.length} tracks across all musicians</p>
      </div>

      <div className="space-y-2">
        {tracks.map((track) => (
          <div key={track.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
              <Music className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{track.title}</p>
              <p className="text-xs text-zinc-500">{track.musician.displayName} · {track.artist}</p>
            </div>
            {track.bpm && <span className="text-xs text-zinc-600 font-mono flex-shrink-0">{Math.round(track.bpm)} BPM</span>}
            <div className="flex items-center gap-1 text-xs text-zinc-600 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatDuration(track.duration)}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
              track.status === "READY"
                ? "bg-green-950 text-green-400 border-green-800/50"
                : track.status === "PROCESSING"
                ? "bg-yellow-950 text-yellow-400 border-yellow-800/50"
                : "bg-red-950 text-red-400 border-red-800/50"
            }`}>
              {track.status}
            </span>
          </div>
        ))}
        {tracks.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracks uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
