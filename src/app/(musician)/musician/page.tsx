import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload, MapPin, Sparkles, Music, Radio, Zap } from "lucide-react";

export default async function MusicianDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const musician = await prisma.musician.findUnique({
    where: { userId },
    include: {
      _count: { select: { tracks: true, stages: true } },
    },
  });

  if (!musician) {
    return (
      <div className="p-8 text-center text-zinc-600">
        <p>Musician profile not found. Contact an admin.</p>
      </div>
    );
  }

  const trackCount = musician._count.tracks;
  const stageCount = musician._count.stages;

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          {musician.status === "APPROVED" ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800/50 uppercase tracking-wider">Verified</span>
          ) : musician.status === "PENDING" ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-400 border border-yellow-800/50 uppercase tracking-wider">Pending Approval</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/50 uppercase tracking-wider">Suspended</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{musician.displayName}</h1>
        {musician.bio && <p className="text-sm text-zinc-400 mt-1">{musician.bio}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Tracks</span>
          </div>
          <p className="text-3xl font-bold text-white">{trackCount}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Stages</span>
          </div>
          <p className="text-3xl font-bold text-white">{stageCount}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="space-y-3">
          <Link href="/musician/tracks/new">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-800/50 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center group-hover:bg-violet-600/30 transition-colors">
                <Upload className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">Upload a Track</p>
                <p className="text-xs text-zinc-500">Add music to your catalog</p>
              </div>
              <Zap className="w-4 h-4 text-zinc-700 ml-auto" />
            </div>
          </Link>

          <Link href="/musician/stages/new">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-800/50 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center group-hover:bg-cyan-600/30 transition-colors">
                <MapPin className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">Create a Stage</p>
                <p className="text-xs text-zinc-500">Place an AR stage at a location</p>
              </div>
              <Zap className="w-4 h-4 text-zinc-700 ml-auto" />
            </div>
          </Link>

          <Link href="/musician/ai-studio">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-pink-800/50 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center group-hover:bg-pink-600/30 transition-colors">
                <Sparkles className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">AI Studio</p>
                <p className="text-xs text-zinc-500">Design visualizations with Claude</p>
              </div>
              <Zap className="w-4 h-4 text-zinc-700 ml-auto" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
