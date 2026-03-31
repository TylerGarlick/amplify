"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music2, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/musician/stages", label: "Stages", Icon: MapPin },
  { href: "/musician/tracks", label: "Tracks", Icon: Music2 },
  { href: "/musician/profile", label: "Profile", Icon: User },
];

export function MusicianBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/60 safe-area-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-lg transition-all duration-150",
                isActive
                  ? "text-violet-400"
                  : "text-zinc-500 hover:text-zinc-300 active:bg-zinc-800/40"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
