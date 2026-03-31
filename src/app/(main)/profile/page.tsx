import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Music, Settings, ChevronRight } from "lucide-react";
import { LogoutButton } from "@/components/shared/LogoutButton";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as { name?: string | null; email?: string | null; role?: string; id?: string } | undefined;
  const role = user?.role ?? "USER";

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-950 text-red-400 border-red-800/50",
    MUSICIAN: "bg-violet-950 text-violet-400 border-violet-800/50",
    USER: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 bg-gradient-to-b from-violet-950/20 to-transparent">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-violet-600/30">
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user.name ?? "Anonymous"}</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
          <span className={`text-[10px] px-3 py-1 rounded-full border font-medium tracking-wider uppercase ${roleColors[role] ?? roleColors.USER}`}>
            {role}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 space-y-3">
        {(role === "MUSICIAN" || role === "ADMIN") && (
          <Link href="/musician">
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center">
                  <Music className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Musician Portal</p>
                  <p className="text-xs text-zinc-500">Manage tracks & stages</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </Link>
        )}

        {role === "ADMIN" && (
          <Link href="/admin">
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-600/20 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Admin Panel</p>
                  <p className="text-xs text-zinc-500">Manage the platform</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </Link>
        )}

        <div className="pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
