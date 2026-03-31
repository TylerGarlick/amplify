import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/shared/LogoutButton";
import Link from "next/link";
import { Music, Calendar, ChevronRight, Mic } from "lucide-react";

export default async function MusicianProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const musician = await prisma.musician.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true } },
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

  const statusColors: Record<string, string> = {
    APPROVED: "bg-green-950 text-green-400 border-green-800/50",
    PENDING: "bg-yellow-950 text-yellow-400 border-yellow-800/50",
    SUSPENDED: "bg-red-950 text-red-400 border-red-800/50",
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 bg-gradient-to-b from-violet-950/20 to-transparent">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-violet-600/30">
            {musician.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{musician.displayName}</h1>
            <p className="text-sm text-zinc-500">{musician.user?.email}</p>
          </div>
          <span className={`text-[10px] px-3 py-1 rounded-full border font-medium tracking-wider uppercase ${statusColors[musician.status] ?? statusColors.PENDING}`}>
            {musician.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Tracks</span>
          </div>
          <p className="text-3xl font-bold text-white">{musician._count.tracks}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Stages</span>
          </div>
          <p className="text-3xl font-bold text-white">{musician._count.stages}</p>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 space-y-3 mb-6">
        {musician.bio && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <Music className="w-4 h-4 text-violet-400" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Bio</p>
              <p className="text-sm text-white">{musician.bio}</p>
            </div>
          </div>
        )}
        {musician.createdAt && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Member Since</p>
              <p className="text-sm text-white">{new Date(musician.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 space-y-3">
        <Link href="/musician">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight className="w-4 h-4 text-zinc-400" />
              <p className="text-sm font-medium text-white">Dashboard</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </div>
        </Link>
      </div>

      {/* Logout */}
      <div className="px-4 pt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
