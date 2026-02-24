"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Music, MapPin, Sparkles, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/musician", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/musician/tracks", label: "Tracks", Icon: Music },
  { href: "/musician/stages", label: "Stages", Icon: MapPin },
  { href: "/musician/ai-studio", label: "AI Studio", Icon: Sparkles },
];

export function MusicianSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">amplify</span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1 tracking-wider uppercase">Musician Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                isActive
                  ? "bg-violet-600/15 text-violet-300 border border-violet-600/20"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="p-3 border-t border-zinc-800/60">
        <Link
          href="/ar"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to AR view
        </Link>
      </div>
    </aside>
  );
}
