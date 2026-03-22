"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Compass, User, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/ar", label: "AR", Icon: Radio },
  { href: "/tribes", label: "Tribes", Icon: Shield },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/60 bg-black/80 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-150",
                isActive
                  ? "text-violet-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]"
                )}
              />
              <span className="text-[10px] tracking-wider uppercase font-medium">
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-violet-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
