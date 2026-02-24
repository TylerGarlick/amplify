"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  musician: { id: string; displayName: string; status: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-950 text-red-400 border-red-800/50",
  MUSICIAN: "bg-violet-950 text-violet-400 border-violet-800/50",
  USER: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export function UsersAdminClient({ users: initial }: { users: UserRow[] }) {
  const [users, setUsers] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function updateRole(userId: string, role: string) {
    setLoading(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setLoading(null);
    if (!res.ok) { toast.error("Failed to update role."); return; }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    toast.success(`Role updated to ${role}.`);
  }

  async function approveMusician(userId: string) {
    setLoading(userId);
    const res = await fetch("/api/admin/approve-musician", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(null);
    if (!res.ok) { toast.error("Failed to approve."); return; }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, role: "MUSICIAN", musician: u.musician ? { ...u.musician, status: "APPROVED" } : null }
          : u
      )
    );
    toast.success("Musician approved!");
  }

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      {users.map((user, i) => (
        <div
          key={user.id}
          className={`flex items-center gap-3 px-4 py-3 ${i < users.length - 1 ? "border-b border-zinc-800/60" : ""}`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{user.name ?? "—"}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            {user.musician && (
              <p className="text-[10px] text-zinc-600 mt-0.5">
                Musician: {user.musician.displayName} ·{" "}
                <span className={user.musician.status === "PENDING" ? "text-yellow-500" : "text-green-500"}>
                  {user.musician.status}
                </span>
              </p>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_COLORS[user.role] ?? ROLE_COLORS.USER}`}>
            {user.role}
          </span>
          <span className="text-[10px] text-zinc-600 flex-shrink-0">
            {new Date(user.createdAt).toLocaleDateString()}
          </span>

          <div className="flex items-center gap-2 flex-shrink-0">
            {user.musician?.status === "PENDING" && (
              <Button
                size="sm"
                className="h-7 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-800/30"
                onClick={() => approveMusician(user.id)}
                disabled={loading === user.id}
              >
                {loading === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                {["USER", "MUSICIAN", "ADMIN"].map((role) => (
                  <DropdownMenuItem
                    key={role}
                    className="text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                    onClick={() => updateRole(user.id, role)}
                  >
                    Set as {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
