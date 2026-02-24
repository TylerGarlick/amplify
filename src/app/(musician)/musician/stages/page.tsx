import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Eye, Radio } from "lucide-react";

export default async function StagesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const musician = await prisma.musician.findUnique({ where: { userId } });
  if (!musician) redirect("/musician");

  const stages = await prisma.stage.findMany({
    where: { musicianId: musician.id },
    include: {
      _count: { select: { visualizations: true, stageTrackLinks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Stages</h1>
          <p className="text-sm text-zinc-500">{stages.length} GPS-anchored stage{stages.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/musician/stages/new">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20">
            <Plus className="w-4 h-4 mr-2" /> New Stage
          </Button>
        </Link>
      </div>

      {stages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-16 text-center">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No stages yet.</p>
          <Link href="/musician/stages/new">
            <Button variant="ghost" className="mt-4 text-violet-400 hover:text-violet-300">
              Create your first stage →
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{stage.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      stage.isActive
                        ? "bg-green-950 text-green-400 border-green-800/50"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}>
                      {stage.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {stage.description && (
                    <p className="text-xs text-zinc-500 mb-2 line-clamp-1">{stage.description}</p>
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] font-mono text-zinc-600">
                      {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)}
                    </span>
                    <span className="text-[10px] text-zinc-700 ml-2">r={stage.radius}m</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{stage._count.visualizations}</span>
                    <span className="flex items-center gap-1"><Radio className="w-3 h-3" />{stage._count.stageTrackLinks}</span>
                  </div>
                  <Link href={`/musician/stages/${stage.id}/visualize`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white">
                      Edit Visuals
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
