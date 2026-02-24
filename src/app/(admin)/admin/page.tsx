import { prisma } from "@/lib/prisma";
import { Users, Music, MapPin, Mic2, TrendingUp } from "lucide-react";

export default async function AdminDashboard() {
  const [userCount, musicianCount, trackCount, stageCount, pendingCount] = await Promise.all([
    prisma.user.count(),
    prisma.musician.count(),
    prisma.track.count(),
    prisma.stage.count(),
    prisma.musician.count({ where: { status: "PENDING" } }),
  ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const stats = [
    { label: "Total Users", value: userCount, Icon: Users, color: "text-violet-400", bg: "bg-violet-600/10 border-violet-800/30" },
    { label: "Musicians", value: musicianCount, Icon: Mic2, color: "text-cyan-400", bg: "bg-cyan-600/10 border-cyan-800/30" },
    { label: "Tracks", value: trackCount, Icon: Music, color: "text-pink-400", bg: "bg-pink-600/10 border-pink-800/30" },
    { label: "Stages", value: stageCount, Icon: MapPin, color: "text-green-400", bg: "bg-green-600/10 border-green-800/30" },
  ];

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-950 text-red-400 border-red-800/50",
    MUSICIAN: "bg-violet-950 text-violet-400 border-violet-800/50",
    USER: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-red-400" />
        <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        {pendingCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-400 border border-yellow-800/50 ml-2">
            {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-5 ${bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div>
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Recent Signups</h2>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          {recentUsers.map((user, i) => (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < recentUsers.length - 1 ? "border-b border-zinc-800/60" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.name ?? "—"}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${roleColors[user.role] ?? roleColors.USER}`}>
                {user.role}
              </span>
              <span className="text-[10px] text-zinc-600 flex-shrink-0">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
