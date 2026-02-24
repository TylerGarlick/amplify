import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, Radio, Plus, ArrowLeft, Music } from "lucide-react";

export default async function StageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const musician = await prisma.musician.findUnique({ where: { userId } });
  if (!musician) redirect("/musician");

  const stage = await prisma.stage.findUnique({
    where: { id },
    include: {
      visualizations: { orderBy: { sortOrder: "asc" } },
      stageTrackLinks: {
        orderBy: { sortOrder: "asc" },
        include: { track: { select: { id: true, title: true, artist: true, duration: true, bpm: true } } },
      },
    },
  });

  if (!stage || stage.musicianId !== musician.id) notFound();

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/musician/stages" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-4 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Back to stages
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{stage.name}</h1>
          {stage.description && <p className="text-sm text-zinc-400 mt-1">{stage.description}</p>}
          <div className="flex items-center gap-1.5 mt-2">
            <MapPin className="w-3 h-3 text-zinc-600" />
            <span className="text-xs font-mono text-zinc-500">
              {stage.latitude.toFixed(5)}, {stage.longitude.toFixed(5)} · r={stage.radius}m
            </span>
          </div>
        </div>
        <Link href={`/musician/stages/${id}/visualize`}>
          <Button className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 flex-shrink-0">
            <Eye className="w-4 h-4 mr-2" /> Visualize
          </Button>
        </Link>
      </div>

      {/* Tracks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Tracks ({stage.stageTrackLinks.length})
          </h2>
        </div>
        {stage.stageTrackLinks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-600 text-sm">
            No tracks linked. Go to the Visualize editor to link a track.
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
          </div>
        )}
      </div>

      {/* Visualizations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Visualizations ({stage.visualizations.length})
          </h2>
          <Link href={`/musician/stages/${id}/visualize`}>
            <Button size="sm" className="h-7 text-xs bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 border border-violet-800/30">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </Link>
        </div>
        {stage.visualizations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-600 text-sm">
            No visualizations yet.{" "}
            <Link href={`/musician/stages/${id}/visualize`} className="text-violet-400 hover:text-violet-300">
              Add one →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {stage.visualizations.map((vis) => (
              <div key={vis.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{vis.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{vis.type}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  vis.isVisible
                    ? "bg-green-950 text-green-400 border-green-800/50"
                    : "bg-zinc-800 text-zinc-500 border-zinc-700"
                }`}>
                  {vis.isVisible ? "Visible" : "Hidden"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
