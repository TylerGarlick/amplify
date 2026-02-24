import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Music, Clock, CheckCircle, AlertCircle, Loader } from "lucide-react";

function TrackStatusBadge({ status }: { status: string }) {
  if (status === "READY") return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800/50">
      <CheckCircle className="w-2.5 h-2.5" /> Ready
    </span>
  );
  if (status === "PROCESSING") return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-400 border border-yellow-800/50">
      <Loader className="w-2.5 h-2.5 animate-spin" /> Processing
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/50">
      <AlertCircle className="w-2.5 h-2.5" /> Error
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function TracksPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const musician = await prisma.musician.findUnique({ where: { userId } });
  if (!musician) redirect("/musician");

  const tracks = await prisma.track.findMany({
    where: { musicianId: musician.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Tracks</h1>
          <p className="text-sm text-zinc-500">{tracks.length} track{tracks.length !== 1 ? "s" : ""} in your catalog</p>
        </div>
        <Link href="/musician/tracks/new">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20">
            <Plus className="w-4 h-4 mr-2" /> Upload Track
          </Button>
        </Link>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center">
          <Music className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No tracks yet.</p>
          <Link href="/musician/tracks/new">
            <Button variant="ghost" className="mt-4 text-violet-400 hover:text-violet-300">
              Upload your first track →
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{track.title}</p>
                <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
              </div>
              {track.bpm && (
                <div className="text-xs text-zinc-600 font-mono flex-shrink-0">{Math.round(track.bpm)} BPM</div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {formatDuration(track.duration)}
              </div>
              <TrackStatusBadge status={track.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
