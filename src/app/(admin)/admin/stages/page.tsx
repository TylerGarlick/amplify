import { prisma } from "@/lib/prisma";
import { MapPin, Eye, Radio } from "lucide-react";

export default async function AdminStagesPage() {
  const stages = await prisma.stage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      musician: { select: { displayName: true } },
      _count: { select: { visualizations: true, stageTrackLinks: true } },
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Stages</h1>
        <p className="text-sm text-zinc-500">{stages.length} GPS-anchored stages</p>
      </div>

      <div className="space-y-2">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{stage.name}</p>
              <p className="text-xs text-zinc-500">{stage.musician.displayName}</p>
              <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                {stage.latitude.toFixed(4)}, {stage.longitude.toFixed(4)} · r={stage.radius}m
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-600 flex-shrink-0">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{stage._count.visualizations}</span>
              <span className="flex items-center gap-1"><Radio className="w-3 h-3" />{stage._count.stageTrackLinks}</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
              stage.isActive
                ? "bg-green-950 text-green-400 border-green-800/50"
                : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}>
              {stage.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
        {stages.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No stages created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
